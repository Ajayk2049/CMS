const mongoose = require('mongoose');

const PhonePeTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true // in paise
  },
  transactionType: {
    type: String,
    enum: ['payment', 'refund'],
    required: true
  },
  originalTransactionId: {
    type: String, // filled for refunds
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  responseCode: {
    type: String,
    default: null
  },
  rawCallbackPayload: {
    type: mongoose.Schema.Types.Mixed,
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

PhonePeTransactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PhonePeTransaction', PhonePeTransactionSchema);
