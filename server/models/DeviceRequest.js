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
  deviceType: {
    type: String,
    enum: ['screen', 'tabletop'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
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
