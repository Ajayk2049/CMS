const videoQueueService = require('../services/videoQueueService');

class SingleVideoQueueWrapper {
  /**
   * Enqueue a video transcode job into the BullMQ + Redis background processing queue
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
    videoQueueService.addTranscodeJob(job);
  }
}

const videoQueueWrapper = new SingleVideoQueueWrapper();
module.exports = videoQueueWrapper;
