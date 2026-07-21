const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true, // in paise
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  gst: {
    type: Number,
    default: null
  },
  otherCharges: {
    type: Number,
    default: null
  },
  otherChargesType: {
    type: String,
    enum: ['percentage', 'rupees'],
    default: 'percentage'
  }
});

const MenuSchema = new mongoose.Schema({
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
    unique: true,
    index: true
  },
  items: [MenuItemSchema],
  categories: {
    type: [String],
    default: ['Starters', 'Main Course', 'Dessert', 'Beverages']
  },
  defaultGst: {
    type: Number,
    default: 0
  },
  defaultOtherCharges: {
    type: Number,
    default: 0
  },
  defaultOtherChargesType: {
    type: String,
    enum: ['percentage', 'rupees'],
    default: 'percentage'
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

MenuSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Menu', MenuSchema);
