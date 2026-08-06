const mongoose = require('mongoose');
const crypto = require('crypto');

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
  advertiserId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const bcrypt = require('bcryptjs');

// Pre-save hook to hash password before saving to MongoDB
UserSchema.pre('save', function(next) {
  const user = this;
  if (!user.isModified('password')) return next();

  // If password is already a bcrypt hash ($2a$ or $2b$), skip re-hashing
  if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
    return next();
  }

  try {
    user.password = bcrypt.hashSync(user.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', UserSchema);
