const mongoose = require('mongoose');

const AdBookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true
  },
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  outletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true
  },
  deviceType: {
    type: String,
    enum: ['tablet', 'screen'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  adDurationDays: {
    type: Number,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true // in paise
  },
  mediaUrl: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    default: null,
    index: true
  },
  paymentId: {
    type: String,
    default: null,
    index: true
  },
  denialReason: {
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

AdBookingSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AdBooking', AdBookingSchema);
