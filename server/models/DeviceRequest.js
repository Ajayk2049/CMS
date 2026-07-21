const mongoose = require('mongoose');

const DeviceRequestSchema = new mongoose.Schema({
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestTablet: {
    type: Boolean,
    default: false
  },
  tabletQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  requestScreen: {
    type: Boolean,
    default: false
  },
  screenQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeviceRequest', DeviceRequestSchema);
