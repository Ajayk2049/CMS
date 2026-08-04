const mongoose = require('mongoose');

const HostApplicationSchema = new mongoose.Schema({
  venueId: {
    type: String,
    unique: true,
    sparse: true
  },
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
  // Open Ads Mode: Video 2 slots / 4 daily, Image 3 slots / 10 daily
  // Closed Mode: Video 3 slots / 6 daily, Image 8 slots / 15 daily
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
  // Modular Thermal Bill Configuration
  billConfig: {
    logoUrl: { type: String, default: '' },
    restaurantName: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    cityZip: { type: String, default: '' },
    gstin: { type: String, default: '' },
    fssaiNo: { type: String, default: '' },
    phone: { type: String, default: '' },
    billPrefix: { type: String, default: 'INV' },
    showKOTNumbers: { type: Boolean, default: true },
    showCovers: { type: Boolean, default: true },
    showCustomerDetail: { type: Boolean, default: true },
    cgstPercent: { type: Number, default: 2.5 },
    sgstPercent: { type: Number, default: 2.5 },
    enableAutoRoundOff: { type: Boolean, default: true },
    thankYouMessage: { type: String, default: 'Thank You & Visit Again !' },
    crmContactName: { type: String, default: '' },
    crmContactPhone: { type: String, default: '' },
    deliveryPhone: { type: String, default: '' },
    showPoweredBy: { type: Boolean, default: true },
    customWatermark: { type: String, default: 'POWERED BY - DIGIADS' },
    billWidthFormat: { type: String, enum: ['80mm', '58mm'], default: '80mm' },
    qrImageUrl: { type: String, default: '' },
    qrCaption: { type: String, default: 'Scan QR to pay / provide feedback' }
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
