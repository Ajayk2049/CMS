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
    enum: ['video', 'image', 'screen'],
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
