const mongoose = require('mongoose');

const HostApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  outletName: {
    type: String,
    required: true,
    trim: true
  },
  outletDescription: {
    type: String,
    required: true
  },
  doorNo: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  zipCode: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  requestTablet: {
    type: Boolean,
    default: false
  },
  tabletQuantity: {
    type: Number,
    default: 0
  },
  requestScreen: {
    type: Boolean,
    default: false
  },
  screenQuantity: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  upiId: {
    type: String,
    default: null,
    trim: true
  },
  payeeName: {
    type: String,
    default: null,
    trim: true
  },
  adMode: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  allowOpenAds: {
    type: Boolean,
    default: true,
    index: true
  },
  // Modular Quota Overrides (null means system default)
  // Tablet: 2 videos / 4 daily, 5 images / 10 daily
  // Screen: 2 videos / 4 daily, 5 images / 10 daily
  customMaxVideoSlots: {
    type: Number,
    default: null
  },
  customMaxImageSlots: {
    type: Number,
    default: null
  },
  customMaxScreenVideoSlots: {
    type: Number,
    default: null
  },
  customMaxScreenImageSlots: {
    type: Number,
    default: null
  },
  customMaxScreenSlots: {
    type: Number,
    default: null
  },
  customDailyVideoQuota: {
    type: Number,
    default: null
  },
  customDailyImageQuota: {
    type: Number,
    default: null
  },
  customDailyScreenVideoQuota: {
    type: Number,
    default: null
  },
  customDailyScreenImageQuota: {
    type: Number,
    default: null
  },
  customDailyScreenQuota: {
    type: Number,
    default: null
  },
  // Daily Change Trackers & 2:00 AM IST Reset Date
  dailyVideoChangesRemaining: {
    type: Number,
    default: 4
  },
  dailyImageChangesRemaining: {
    type: Number,
    default: 10
  },
  dailyScreenVideoChangesRemaining: {
    type: Number,
    default: 4
  },
  dailyScreenImageChangesRemaining: {
    type: Number,
    default: 10
  },
  dailyScreenChangesRemaining: {
    type: Number,
    default: 4
  },
  lastQuotaResetDate: {
    type: Date,
    default: Date.now
  },
  // Admin Account Status Flags
  isPaused: {
    type: Boolean,
    default: false
  },
  isRevoked: {
    type: Boolean,
    default: false
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

HostApplicationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('HostApplication', HostApplicationSchema);
