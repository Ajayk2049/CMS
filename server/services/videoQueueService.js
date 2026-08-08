const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const MediaLog = require('../models/MediaLog');
const AdBooking = require('../models/AdBooking');
const VenuePromo = require('../models/VenuePromo');
const config = require('../config/config');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure Redis Client with reconnect strategy
const redisConnection = new IORedis({
  host: config.redisHost || 'localhost',
  port: parseInt(config.redisPort, 10) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 3000)
});

class VideoQueueService {
  constructor() {
    this.queueName = 'video-transcode-queue';
    this.queue = null;
    this.worker = null;
    this.fallbackQueue = [];
    this.isFallbackProcessing = false;
    this.isRedisAvailable = false;

    this.init();
  }

  init() {
    redisConnection.on('connect', () => {
      this.isRedisAvailable = true;
      console.log('\x1b[32m[BullMQ Redis]\x1b[0m Successfully connected to Redis server. Persistent queue active.');
    });

    redisConnection.on('error', (err) => {
      if (this.isRedisAvailable) {
        console.warn(`\x1b[33m[BullMQ Redis Warning]\x1b[0m Connection lost (${err.message}). Queue fallback active.`);
      }
      this.isRedisAvailable = false;
    });

    try {
      this.queue = new Queue(this.queueName, { connection: redisConnection });

      // Worker strictly locked to concurrency: 1 (ONLY 1 FFmpeg instance runs at a time)
      this.worker = new Worker(
        this.queueName,
        async (job) => {
          await this.processTranscodeJob(job.data);
        },
        {
          connection: redisConnection,
          concurrency: 1 // STRICT SINGLE-CONCURRENCY LOCK TO PROTECT VPS CPU & RAM
        }
      );

      this.worker.on('completed', (job) => {
        console.log(`\x1b[32m[BullMQ Worker]\x1b[0m Transcode job #${job.id} completed successfully.`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`\x1b[31m[BullMQ Worker Error]\x1b[0m Job #${job?.id || 'unknown'} failed:`, err.message);
      });
    } catch (err) {
      console.warn('[VideoQueueService] BullMQ init notice:', err.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Add a transcode job to the processing queue (backward compatible alias)
   */
  enqueueJob(jobData) {
    return this.addTranscodeJob(jobData);
  }

  /**
   * Add a transcode job to the processing queue
   */
  async addTranscodeJob(jobData) {
    const jobPayload = {
      ...jobData,
      enqueuedAt: Date.now()
    };

    if (this.queue && this.isRedisAvailable) {
      try {
        const job = await this.queue.add('transcode', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200
        });
        console.log(`\x1b[35m[BullMQ Queue]\x1b[0m Enqueued persistent transcode job #${job.id} for ${jobData.modelType || 'AdBooking'} (${jobData.recordId || jobData.bookingId}).`);
        return job;
      } catch (err) {
        console.warn(`[BullMQ Queue Warning] Failed adding job to Redis. Falling back to local queue: ${err.message}`);
      }
    }

    // Direct single-instance in-memory fallback if Redis is offline
    console.log(`\x1b[35m[VideoQueue]\x1b[0m Enqueued transcode job for ${jobData.modelType || 'AdBooking'} (${jobData.recordId || jobData.bookingId}). Queue length: ${this.fallbackQueue.length + 1}`);
    this.fallbackQueue.push(jobPayload);
    setImmediate(() => this.processNextFallback());
  }

  /**
   * Execute the actual single-instance FFmpeg video transcode process
   */
  async processTranscodeJob(job) {
    const modelType = job.modelType || 'AdBooking';
    const rawRecordId = job.recordId || job.bookingId;
    const recordIdStr = rawRecordId ? String(rawRecordId) : '';
    const tempPath = job.tempPath;
    const filePath = job.filePath || (job.targetDir && job.finalFilename ? path.join(job.targetDir, job.finalFilename) : null);
    const targetSubdir = job.targetSubdir || job.relativeSubdir || 'tablet';
    const uniqueFilename = job.uniqueFilename || job.finalFilename;
    const resolution = job.resolution;
    const mediaLogId = job.mediaLogId;

    console.log(`\x1b[35m[FFmpeg Worker]\x1b[0m Single worker starting transcode for ${modelType} (${recordIdStr})...`);

    // 1. Enforce 7.5s ingestion hold delay for streaming file handles to settle completely
    const elapsed = Date.now() - (job.enqueuedAt || Date.now());
    const waitTime = Math.max(0, 7500 - elapsed);
    if (waitTime > 0) {
      console.log(`\x1b[35m[FFmpeg Worker]\x1b[0m Holding temp file handle (${Math.round(waitTime / 1000)}s settling delay)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update database status to processing
    const isMongoId = Boolean(recordIdStr.match(/^[0-9a-fA-F]{24}$/));
    if (modelType === 'VenuePromo') {
      await VenuePromo.findByIdAndUpdate(rawRecordId, { transcodeStatus: 'processing' });
    } else if (modelType === 'AdBooking') {
      await AdBooking.findOneAndUpdate(
        isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
        { transcodeStatus: 'processing' }
      );
    }

    if (job.targetDir && !fs.existsSync(job.targetDir)) {
      fs.mkdirSync(job.targetDir, { recursive: true });
    }

    let transcodeSuccess = false;

    // 2. Run single-thread FFmpeg H.264 Baseline 3.1 transcode into an isolated temp file first
    if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0 && filePath) {
      const transcodeTempPath = `${filePath}.tmp_${Date.now()}`;
      try {
        await new Promise((resolve, reject) => {
          let ffmpegCommand = ffmpeg(tempPath).videoCodec('libx264');

          if (resolution) {
            ffmpegCommand = ffmpegCommand.size(resolution).fps(30);
          }

          ffmpegCommand
            .noAudio()                 // Strip audio stream for silent kiosk video playback
            .outputOptions([
              '-threads 1',            // STRICT 1-THREAD LIMIT to keep CPU usage low
              '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', // Guarantees even dimensions for Android decoders
              '-profile:v baseline',   // Android Baseline 3.1 compatibility
              '-level 3.1',
              '-pix_fmt yuv420p',
              '-crf 26',               // Optimal compression quality and minimal file size
              '-preset faster',
              '-movflags +faststart'   // Enables fast progressive playback
            ])
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .save(transcodeTempPath);
        });

        if (fs.existsSync(transcodeTempPath) && fs.statSync(transcodeTempPath).size > 0) {
          try {
            // Atomic file replacement to prevent truncating live HTTP playback stream
            fs.renameSync(transcodeTempPath, filePath);
          } catch (renameErr) {
            fs.copyFileSync(transcodeTempPath, filePath);
            try { fs.unlinkSync(transcodeTempPath); } catch (e) {}
          }
          transcodeSuccess = true;
        }
      } catch (ffErr) {
        console.warn(`\x1b[33m[FFmpeg Warning]\x1b[0m Transcode warning (${ffErr.message}). Using raw file fallback.`);
        if (fs.existsSync(transcodeTempPath)) {
          try { fs.unlinkSync(transcodeTempPath); } catch (e) {}
        }
      }

      // Fallback to direct raw file copy if FFmpeg fails or is missing
      if (!transcodeSuccess && fs.existsSync(tempPath) && !fs.existsSync(filePath)) {
        const fallbackPath = filePath || path.join(job.targetDir || '', `raw_${uniqueFilename}`);
        fs.copyFileSync(tempPath, fallbackPath);
        transcodeSuccess = true;
      }
    }

    // 3. Update database status and URLs upon completion
    const relativeUrl = `/uploads/${targetSubdir.startsWith('ads/') ? targetSubdir : `ads/videos/${targetSubdir}`}/${uniqueFilename}`.replace(/\/+/g, '/');

    if (modelType === 'VenuePromo') {
      const finalUrl = job.relativeSubdir ? `/uploads/${job.relativeSubdir}/${uniqueFilename}`.replace(/\/+/g, '/') : relativeUrl;
      await VenuePromo.findByIdAndUpdate(rawRecordId, {
        mediaUrl: finalUrl,
        transcodedMediaUrl: finalUrl,
        transcodeStatus: 'completed'
      });
    } else if (modelType === 'AdBooking') {
      await AdBooking.findOneAndUpdate(
        isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
        {
          mediaUrl: relativeUrl,
          transcodedMediaUrl: relativeUrl,
          transcodeStatus: 'completed'
        }
      );
    }

    if (mediaLogId) {
      await MediaLog.findByIdAndUpdate(mediaLogId, {
        status: 'completed',
        finalizedFilename: uniqueFilename,
        outputPath: filePath
      });
    }

    console.log(`\x1b[32m[FFmpeg Worker]\x1b[0m Transcode completed successfully for ${modelType} (${recordIdStr}) -> ${relativeUrl}`);

    // Broadcast WebSocket reload signal to connected kiosk devices
    if (global.deviceSockets && job.hostApplicationId) {
      const payload = JSON.stringify({ event: 'reload_promos', hostApplicationId: job.hostApplicationId.toString() });
      for (const [deviceId, socket] of global.deviceSockets.entries()) {
        try { socket.send(payload); } catch (e) {}
      }
    }

    // Safely delete temp staging file
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
  }

  /**
   * Fallback queue processor if Redis is offline (STRICT SINGLE CONCURRENCY LOCK)
   */
  async processNextFallback() {
    if (this.isFallbackProcessing || this.fallbackQueue.length === 0) return;
    this.isFallbackProcessing = true;
    const job = this.fallbackQueue.shift();
    try {
      await this.processTranscodeJob(job);
    } catch (err) {
      console.error('[Fallback Queue Error]:', err.message);
    } finally {
      this.isFallbackProcessing = false;
      setImmediate(() => this.processNextFallback());
    }
  }
}

const videoQueueService = new VideoQueueService();
module.exports = videoQueueService;
