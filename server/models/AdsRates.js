const mongoose = require('mongoose');

const AdsRatesSchema = new mongoose.Schema({
  rateId: {
    type: String,
    required: true,
    unique: true
  },
  deviceType: {
    type: String,
    enum: ['tablet', 'screen'],
    required: true
  },
  mediaType: {
    type: String,
    enum: ['video', 'image'],
    default: 'video'
  },
  maxVideoLengthSeconds: {
    type: Number,
    enum: [30, 60],
    default: 30
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  frequency: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true, // in paise
    min: 0
  },
  pricingType: {
    type: String,
    enum: ['per_device', 'whole_venue'],
    default: 'per_device'
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

AdsRatesSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AdsRates', AdsRatesSchema);
