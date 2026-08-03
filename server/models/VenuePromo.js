const mongoose = require('mongoose');

const VenuePromoSchema = new mongoose.Schema({
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    index: true
  },
  slotType: {
    type: String,
    enum: ['video', 'image', 'screen', 'screen_video', 'screen_image'],
    required: true
  },
  slotIndex: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  displayDurationSeconds: {
    type: Number,
    default: 15
  },
  isStreaming: {
    type: Boolean,
    default: true
  },
  transcodeStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed',
    index: true
  },
  transcodedMediaUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

VenuePromoSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VenuePromo', VenuePromoSchema);
