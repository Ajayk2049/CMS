const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const MediaLog = require('../models/MediaLog');
const AdBooking = require('../models/AdBooking');
const config = require('../config/config');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

class VideoQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Add a transcoding job to the sequential processing queue.
   */
  enqueueJob(jobData) {
    this.queue.push(jobData);
    console.log(`[VideoQueueService] Enqueued video transcoding job for booking ${jobData.bookingId}. Queue length: ${this.queue.length}`);
    this.processNext();
  }

  /**
   * Process the next job in the queue sequentially.
   */
  async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const currentJob = this.queue.shift();
    const { tempPath, filePath, targetSubdir, uniqueFilename, resolution, mediaLogId, bookingId } = currentJob;

    console.log(`[VideoQueueService] Starting sequential processing for booking: ${bookingId}...`);

    try {
      // Execute FFmpeg transcoding with CPU throttling options (-threads 1)
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .videoCodec('libx264')
          .size(resolution)
          .fps(30)
          .outputOptions([
            '-threads 1',            // Throttles execution to 1 thread to keep CPU usage <40%
            '-profile:v baseline',   // Android Baseline 3.1 compatibility
            '-level 3.1',
            '-pix_fmt yuv420p',
            '-crf 26',               // Optimal compression quality and minimal file size
            '-preset faster',
            '-movflags +faststart'   // Crucial for fast streaming
          ])
          .audioCodec('aac')
          .audioChannels(2)
          .on('end', resolve)
          .on('error', reject)
          .save(filePath);
      });

      // Safely delete temporary staging file upon completion
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (unlinkErr) {
          console.error('[VideoQueueService] Failed unlinking temp staging file:', unlinkErr.message);
        }
      }

      // Update MediaLog
      if (mediaLogId) {
        await MediaLog.findByIdAndUpdate(mediaLogId, {
          status: 'completed',
          finalizedFilename: uniqueFilename,
          outputPath: filePath
        });
      }

      // Update AdBooking with finalized media URL
      const fileUrl = `/uploads/ads/videos/${targetSubdir}/${uniqueFilename}`;
      if (bookingId) {
        await AdBooking.findByIdAndUpdate(bookingId, {
          mediaUrl: fileUrl
        });
      }

      console.log(`[VideoQueueService] Successfully processed video for booking: ${bookingId}. Output: ${fileUrl}`);

    } catch (err) {
      console.error(`[VideoQueueService] Failed processing video for booking: ${bookingId}:`, err.message);

      // Clean up files on error
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }

      // Update logs & booking on failure
      if (mediaLogId) {
        await MediaLog.findByIdAndUpdate(mediaLogId, { status: 'failed', error: err.message });
      }
    } finally {
      this.isProcessing = false;
      // Continue to next job in queue
      setImmediate(() => this.processNext());
    }
  }
}

module.exports = new VideoQueueService();
