const mongoose = require('mongoose');

const MediaLogSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true
  },
  finalizedFilename: {
    type: String,
    default: null
  },
  outputPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('MediaLog', MediaLogSchema);
