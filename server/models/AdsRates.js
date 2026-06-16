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
