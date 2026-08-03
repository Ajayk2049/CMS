const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class SingleVideoQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.holdDelayMs = 7500; // 7.5 seconds ingestion settling delay
  }

  /**
   * Enqueue a video transcode job
   * @param {Object} job
   * @param {String} job.modelType - 'VenuePromo' | 'AdBooking'
   * @param {String} job.recordId - MongoDB ObjectId or bookingId
   * @param {String} job.tempPath - Full path to temp uploaded file
   * @param {String} job.targetDir - Destination directory
   * @param {String} job.relativeSubdir - Relative subdirectory for mediaUrl
   * @param {String} job.finalFilename - Transcoded output filename
   * @param {String} job.hostApplicationId - Optional host app ID for socket broadcast
   */
  enqueue(job) {
    console.log(`\x1b[35m[VideoQueue]\x1b[0m Job enqueued for ${job.modelType} (${job.recordId}). Queue length: ${this.queue.length + 1}`);
    this.queue.push({
      ...job,
      enqueuedAt: Date.now()
    });

    setImmediate(() => this._processNext());
  }

  async _processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      // 1. Enforce 5-10 second ingestion hold delay for file handles to settle
      const elapsed = Date.now() - job.enqueuedAt;
      const waitTime = Math.max(0, this.holdDelayMs - elapsed);
      if (waitTime > 0) {
        console.log(`\x1b[35m[VideoQueue]\x1b[0m Holding temp file for settling (${Math.round(waitTime / 1000)}s delay)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log(`\x1b[35m[VideoQueue]\x1b[0m Single FFmpeg worker starting job for ${job.modelType} (${job.recordId})...`);

      const VenuePromo = require('../models/VenuePromo');
      const AdBooking = require('../models/AdBooking');

      // Update status to processing
      if (job.modelType === 'VenuePromo') {
        await VenuePromo.findByIdAndUpdate(job.recordId, { transcodeStatus: 'processing' });
      } else if (job.modelType === 'AdBooking') {
        await AdBooking.findOneAndUpdate({ bookingId: job.recordId }, { transcodeStatus: 'processing' });
      }

      if (!fs.existsSync(job.targetDir)) {
        fs.mkdirSync(job.targetDir, { recursive: true });
      }

      const finalPath = path.join(job.targetDir, job.finalFilename);
      let transcodeSuccess = false;

      // Ensure input temp file exists
      if (fs.existsSync(job.tempPath) && fs.statSync(job.tempPath).size > 0) {
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(job.tempPath)
              .videoCodec('libx264')
              .outputOptions(['-threads 1', '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', '-profile:v baseline', '-level 3.1', '-pix_fmt yuv420p', '-movflags +faststart'])
              .audioCodec('aac')
              .audioChannels(2)
              .on('end', () => resolve(true))
              .on('error', (err) => reject(err))
              .save(finalPath);
          });
          transcodeSuccess = fs.existsSync(finalPath) && fs.statSync(finalPath).size > 0;
        } catch (ffErr) {
          console.warn(`\x1b[33m[VideoQueue]\x1b[0m FFmpeg warning (${ffErr.message}). Using raw file fallback.`);
        }

        // Fallback to direct raw file copy if FFmpeg fails or is missing
        if (!transcodeSuccess) {
          const fallbackFilename = `raw_${job.finalFilename}`;
          const fallbackPath = path.join(job.targetDir, fallbackFilename);
          fs.copyFileSync(job.tempPath, fallbackPath);
          job.finalFilename = fallbackFilename;
          transcodeSuccess = true;
        }
      }

      // Update database status to completed
      const relativeUrl = `/uploads/${job.relativeSubdir}/${job.finalFilename}`;

      if (job.modelType === 'VenuePromo') {
        await VenuePromo.findByIdAndUpdate(job.recordId, {
          mediaUrl: relativeUrl,
          transcodedMediaUrl: relativeUrl,
          transcodeStatus: 'completed'
        });
      } else if (job.modelType === 'AdBooking') {
        await AdBooking.findOneAndUpdate({ bookingId: job.recordId }, {
          mediaUrl: relativeUrl,
          transcodedMediaUrl: relativeUrl,
          transcodeStatus: 'completed'
        });
      }

      console.log(`\x1b[32m[VideoQueue]\x1b[0m Transcode completed successfully for ${job.modelType} (${job.recordId}) -> ${relativeUrl}`);

      // Broadcast WebSocket reload signal to connected kiosk devices
      if (global.deviceSockets && job.hostApplicationId) {
        const payload = JSON.stringify({ event: 'reload_promos', hostApplicationId: job.hostApplicationId.toString() });
        for (const [deviceId, socket] of global.deviceSockets.entries()) {
          try { socket.send(payload); } catch (e) {}
        }
      }
    } catch (err) {
      console.error(`\x1b[31m[VideoQueue Error]\x1b[0m Processing failed for ${job.modelType} (${job.recordId}):`, err.message);
    } finally {
      // Clean up temp file safely
      if (job.tempPath && fs.existsSync(job.tempPath)) {
        try { fs.unlinkSync(job.tempPath); } catch (e) {}
      }

      this.isProcessing = false;
      // Process next job in FIFO queue
      setImmediate(() => this._processNext());
    }
  }
}

// Global Singleton Queue Instance
const videoQueue = new SingleVideoQueue();
module.exports = videoQueue;
