const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const validator = require('../utils/validation');
const smsService = require('../services/smsService');
const User = require('../models/User');
const OTP = require('../models/OTP');

// Native secure password hashing functions
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function generateToken(user) {
  return jwt.sign(
    { uid: user._id, phone: user.phone, role: user.role, isDemo: user.isDemo },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

class AuthController {
  /**
   * Request an OTP for registration
   */
  async sendOtp(req, res) {
    const { phone } = req.body || {};

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;
    const isDemoAccount = config.demoMode;

    // Generate 6 digit OTP and session UUID
    const otp = isDemoAccount ? config.demoOtp : Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
      // Save/update OTP entry in DB
      await OTP.findOneAndUpdate(
        { phone: formattedPhone },
        { otp, sessionId, expiresAt, attempts: 0 },
        { upsert: true, new: true }
      );

      // Dispatch SMS via provider
      await smsService.sendOTP(formattedPhone, otp);

      // Mask phone in response
      const maskedPhone = formattedPhone.replace(/(\d{6})(\d{4})/, '******$2');

      const responseData = {
        success: true,
        message: 'OTP sent successfully',
        data: {
          user: { phone: formattedPhone },
          expiresIn: 600
        }
      };

      // Expose sessionId in local/demo environment only
      if (config.demoMode) {
        responseData.data.sessionId = sessionId;
      }

      return res.status(200).send(responseData);
    } catch (error) {
      console.error('sendOtp Error:', error.message);
      return res.status(500).send({ success: false, message: error.message || 'Error occurred while sending OTP' });
    }
  }

  /**
   * Complete Registration with OTP & Password
   */
  async register(req, res) {
    const { phone, email, otp, password, role } = req.body || {};

    if (!phone || !otp || !password || !role) {
      return res.status(400).send({ success: false, message: 'Phone, OTP, password, and role are required' });
    }

    if (!['merchant', 'advertiser'].includes(role)) {
      return res.status(400).send({ success: false, message: 'Invalid role. Must be merchant or advertiser' });
    }

    // Enforce password strength: 8-12 characters, mix of alphabets and numbers
    if (password.length < 8 || password.length > 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).send({ success: false, message: 'Password must be 8-12 characters and contain both letters and numbers' });
    }

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;
    const isDemoAccount = config.demoMode;

    try {
      // Verify OTP
      if (isDemoAccount) {
        if (otp !== config.demoOtp) {
          return res.status(400).send({ success: false, message: 'Invalid OTP' });
        }
      } else {
        const otpRecord = await OTP.findOne({ phone: formattedPhone });
        if (!otpRecord) {
          return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
        }

        if (otpRecord.expiresAt < new Date()) {
          await OTP.deleteOne({ phone: formattedPhone });
          return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
        }

        // Timing safe comparison
        const bufRecordOtp = Buffer.from(otpRecord.otp);
        const bufClientOtp = Buffer.from(otp);
        const otpMatch = bufRecordOtp.length === bufClientOtp.length && 
                           crypto.timingSafeEqual(bufRecordOtp, bufClientOtp);

        if (!otpMatch) {
          otpRecord.attempts += 1;
          if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ phone: formattedPhone });
            return res.status(400).send({ success: false, message: 'Invalid OTP. Max attempts reached, please request a new OTP' });
          }
          await otpRecord.save();
          return res.status(400).send({ success: false, message: 'Invalid OTP' });
        }

        // Cleanup verified OTP
        await OTP.deleteOne({ phone: formattedPhone });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (existingUser) {
        return res.status(400).send({ success: false, message: 'User with this mobile number already registered' });
      }

      if (email) {
        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail) {
          return res.status(400).send({ success: false, message: 'User with this email already registered' });
        }
      }

      // Create new user
      const hashedPassword = hashPassword(password);
      const newUser = new User({
        phone: formattedPhone,
        email: email ? email.trim().toLowerCase() : undefined,
        password: hashedPassword,
        role: role,
        isDemo: isDemoAccount
      });

      await newUser.save();
      const token = generateToken(newUser);

      return res.status(200).send({
        success: true,
        message: 'Registration completed successfully',
        data: {
          user: {
            uid: newUser._id,
            phone: newUser.phone,
            role: newUser.role
          },
          token
        }
      });
    } catch (error) {
      console.error('register Error:', error.message);
      return res.status(500).send({ success: false, message: 'Registration failed due to server error' });
    }
  }

  /**
   * Verify OTP without deleting it (for real-time frontend validation)
   */
  async verifyOtp(req, res) {
    const { phone, otp } = req.body || {};

    if (!phone || !otp) {
      return res.status(400).send({ success: false, message: 'Phone and OTP are required' });
    }

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;
    const isDemoAccount = config.demoMode;

    try {
      if (isDemoAccount) {
        if (otp === config.demoOtp) {
          return res.status(200).send({ success: true, message: 'OTP verified successfully' });
        } else {
          return res.status(400).send({ success: false, message: 'Invalid OTP' });
        }
      }

      const otpRecord = await OTP.findOne({ phone: formattedPhone });
      if (!otpRecord) {
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ phone: formattedPhone });
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      // Timing safe comparison
      const bufRecordOtp = Buffer.from(otpRecord.otp);
      const bufClientOtp = Buffer.from(otp);
      const otpMatch = bufRecordOtp.length === bufClientOtp.length && 
                         crypto.timingSafeEqual(bufRecordOtp, bufClientOtp);

      if (!otpMatch) {
        return res.status(400).send({ success: false, message: 'Invalid OTP' });
      }

      return res.status(200).send({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
      console.error('verifyOtp Error:', error.message);
      return res.status(500).send({ success: false, message: 'Verification failed due to server error' });
    }
  }

  /**
   * Authenticate using phone and password
   */
  async login(req, res) {
    const { phone, identifier, password } = req.body || {};
    const inputId = identifier || phone;

    if (!inputId || !password) {
      return res.status(400).send({ success: false, message: 'Email/phone and password are required' });
    }

    let query = {};
    if (inputId.includes('@')) {
      query = { email: inputId.trim().toLowerCase() };
    } else {
      const validation = validator.validatePhone(inputId);
      if (!validation.isValid) {
        return res.status(400).send({ success: false, message: validation.error });
      }
      query = { phone: validation.formatted };
    }

    try {
      const user = await User.findOne(query);
      if (!user) {
        return res.status(400).send({ success: false, message: 'Invalid email/phone or password' });
      }

      const isPasswordValid = verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).send({ success: false, message: 'Invalid email/phone or password' });
      }

      const token = generateToken(user);
      return res.status(200).send({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            uid: user._id,
            phone: user.phone,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('login Error:', error.message);
      return res.status(500).send({ success: false, message: 'Authentication failed due to server error' });
    }
  }
}

module.exports = new AuthController();
