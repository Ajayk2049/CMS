const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true // in paise
  }
});

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true // in paise
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'cooking', 'served', 'cancelled'],
    default: 'placed',
    index: true
  },
  tableStatus: {
    type: String,
    enum: ['active', 'close_table', 'completed', 'completed_acked'],
    default: 'active'
  },
  waiterCallStatus: {
    type: String,
    enum: ['none', 'pending', 'serviced'],
    default: 'none',
    index: true
  },
  waiterCallCount: {
    type: Number,
    default: 0
  },
  waiterCallOption: {
    type: String,
    default: ''
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  transactionId: {
    type: String,
    default: null,
    index: true
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

OrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
