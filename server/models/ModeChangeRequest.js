const mongoose = require('mongoose');

const ModeChangeRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedMode: {
    type: String,
    enum: ['open', 'closed'],
    required: true
  },
  currentMode: {
    type: String,
    enum: ['open', 'closed'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  merchantNotes: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ModeChangeRequest', ModeChangeRequestSchema);
