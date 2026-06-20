const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['merchant', 'advertiser', 'admin'],
    required: true
  },
  roles: {
    type: [String],
    enum: ['merchant', 'advertiser', 'admin'],
    default: ['merchant']
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
