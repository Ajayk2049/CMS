const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const validator = require('../utils/validation');
const smsService = require('../services/smsService');
const User = require('../models/User');
const OTP = require('../models/OTP');
const SMSRequestLog = require('../models/SMSRequestLog');
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  sendOtpSchema,
  resetPasswordSchema,
  addRoleSchema
} = require('../utils/zodSchemas');

// Native secure password hashing functions
function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function generateToken(user, activeRole = null) {
  const roleToUse = activeRole || user.role;
  const rolesToUse = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  return jwt.sign(
    { uid: user._id, phone: user.phone, role: roleToUse, roles: rolesToUse, isDemo: user.isDemo },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

class AuthController {
  /**
   * Request an OTP for registration
   */
  async sendOtp(req, res) {
    const parseResult = sendOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { phone } = parseResult.data;
    const ip = req.ip || 'unknown';

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;
    const isDemoAccount = config.demoMode;

    try {
      // 1. Throttling: must wait at least 60 seconds
      const lastLog = await SMSRequestLog.findOne({
        $or: [{ phone: formattedPhone }, { ip: ip }]
      }).sort({ requestedAt: -1 });

      if (lastLog) {
        const timeSince = (Date.now() - lastLog.requestedAt.getTime()) / 1000;
        if (timeSince < 60) {
          const waitTime = Math.ceil(60 - timeSince);
          return res.status(429).send({
            success: false,
            message: `Please wait ${waitTime} seconds before requesting another OTP.`
          });
        }
      }

      // 2. Phone-based rate limiting: max 5 requests per hour
      const phoneCount = await SMSRequestLog.countDocuments({
        phone: formattedPhone,
        requestedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      if (phoneCount >= 5) {
        return res.status(429).send({
          success: false,
          message: 'Too many OTP requests for this mobile number. Please try again after an hour.'
        });
      }

      // 3. IP-based rate limiting: max 10 requests per hour
      const ipCount = await SMSRequestLog.countDocuments({
        ip: ip,
        requestedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      if (ipCount >= 10) {
        return res.status(429).send({
          success: false,
          message: 'Too many OTP requests from this IP. Please try again after an hour.'
        });
      }

      // Log this request
      const logEntry = new SMSRequestLog({ phone: formattedPhone, ip: ip });
      await logEntry.save();
    } catch (err) {
      console.error('OTP rate limiting check failed:', err.message);
      // Fallback: don't block server if DB checks fail, but log it
    }

    // Generate 6 digit OTP
    const otp = isDemoAccount ? config.demoOtp : Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
      // Save/update OTP entry in DB
      await OTP.findOneAndUpdate(
        { phone: formattedPhone },
        { otp: hashedOtp, expiresAt, attempts: 0 },
        { upsert: true, new: true }
      );

      // Dispatch SMS via provider
      await smsService.sendOTP(formattedPhone, otp);

      const responseData = {
        success: true,
        message: 'OTP sent successfully',
        data: {
          user: { phone: formattedPhone },
          expiresIn: 600
        }
      };

      return res.status(200).send(responseData);
    } catch (error) {
      console.error('sendOtp Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to send OTP' });
    }
  }

  /**
   * Complete Registration with OTP & Password
   */
  async register(req, res) {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { phone, email, name, otp, password, role } = parseResult.data;

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;
    const isDemoAccount = config.demoMode;

    try {
      // Verify OTP
      let otpRecord = await OTP.findOne({ phone: formattedPhone });
      if (!otpRecord && config.demoMode) {
        // In demo mode, if there is no OTP record in DB, initialize it to allow config.demoOtp
        const hashedDemoOtp = crypto.createHash('sha256').update(config.demoOtp).digest('hex');
        otpRecord = new OTP({
          phone: formattedPhone,
          otp: hashedDemoOtp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0
        });
        await otpRecord.save();
      }

      if (!otpRecord) {
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ phone: formattedPhone });
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      // Timing safe comparison of SHA-256 hashes
      const hashedClientOtp = crypto.createHash('sha256').update(otp).digest('hex');
      const bufRecordOtp = Buffer.from(otpRecord.otp);
      const bufClientOtp = Buffer.from(hashedClientOtp);
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

      // Create new user (password is automatically hashed via Mongoose pre-save hook)
      const newUser = new User({
        phone: formattedPhone,
        email: email ? email.trim().toLowerCase() : undefined,
        name: name.trim(),
        password: password,
        role: role,
        roles: [role],
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
            name: newUser.name,
            role: newUser.role,
            roles: newUser.roles
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
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { phone, otp } = parseResult.data;

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;

    try {
      let otpRecord = await OTP.findOne({ phone: formattedPhone });
      if (!otpRecord && config.demoMode) {
        // In demo mode, if there is no OTP record in DB, initialize it to allow config.demoOtp
        const hashedDemoOtp = crypto.createHash('sha256').update(config.demoOtp).digest('hex');
        otpRecord = new OTP({
          phone: formattedPhone,
          otp: hashedDemoOtp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0
        });
        await otpRecord.save();
      }

      if (!otpRecord) {
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ phone: formattedPhone });
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      // Timing safe comparison of SHA-256 hashes
      const hashedClientOtp = crypto.createHash('sha256').update(otp).digest('hex');
      const bufRecordOtp = Buffer.from(otpRecord.otp);
      const bufClientOtp = Buffer.from(hashedClientOtp);
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
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { phone, identifier, password, selectedRole } = parseResult.data;
    const inputId = identifier || phone;

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

      // Resolve roles for backwards compatibility
      let userRoles = user.roles || [];
      if (userRoles.length === 0) {
        userRoles = [user.role];
      }

      // If user has multiple roles and has not selected one yet
      if (userRoles.length > 1 && !selectedRole) {
        return res.status(200).send({
          success: true,
          message: 'Role selection required',
          data: {
            requiresRoleSelection: true,
            roles: userRoles,
            uid: user._id,
            phone: user.phone
          }
        });
      }

      // If a role was selected, verify they actually possess it
      let activeRole = user.role;
      if (selectedRole) {
        if (!userRoles.includes(selectedRole)) {
          return res.status(400).send({ success: false, message: 'Requested role is not assigned to this user' });
        }
        activeRole = selectedRole;
        // Persist the active role in database
        user.role = selectedRole;
        await user.save();
      } else {
        // Default to the first role if none selected (should be the case for single-role users)
        activeRole = userRoles[0];
      }

      const token = generateToken(user, activeRole);
      return res.status(200).send({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            uid: user._id,
            phone: user.phone,
            name: user.name,
            role: activeRole,
            roles: userRoles
          },
          token
        }
      });
    } catch (error) {
      console.error('login Error:', error.message);
      return res.status(500).send({ success: false, message: 'Authentication failed due to server error' });
    }
  }

  /**
   * Add a new role to an authenticated user
   */
  async addRole(req, res) {
    const parseResult = addRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { role, password } = parseResult.data;

    try {
      const user = await User.findById(req.user.uid);
      if (!user) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }

      // S3: Verify current password before adding role
      const isPasswordValid = verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).send({ success: false, message: 'Invalid password' });
      }

      let userRoles = user.roles || [];
      if (userRoles.length === 0) {
        userRoles = [user.role];
      }

      if (userRoles.includes(role)) {
        return res.status(400).send({ success: false, message: 'Role already added to this account' });
      }

      userRoles.push(role);
      user.roles = userRoles;
      user.role = role; // set active role to the newly added role
      await user.save();

      const token = generateToken(user, role);

      return res.status(200).send({
        success: true,
        message: `Role ${role} added successfully`,
        data: {
          user: {
            uid: user._id,
            phone: user.phone,
            role: user.role,
            roles: user.roles
          },
          token
        }
      });
    } catch (error) {
      console.error('addRole Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to add role due to server error' });
    }
  }

  /**
   * Switch the currently active role for an authenticated user
   */
  async switchRole(req, res) {
    const { role } = req.body || {};
    if (!['merchant', 'advertiser', 'admin'].includes(role)) {
      return res.status(400).send({ success: false, message: 'Invalid role' });
    }

    try {
      const user = await User.findById(req.user.uid);
      if (!user) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }

      let userRoles = user.roles || [];
      if (userRoles.length === 0) {
        userRoles = [user.role];
      }

      if (!userRoles.includes(role)) {
        return res.status(403).send({ success: false, message: 'Access denied: Role not assigned to this account' });
      }

      user.role = role;
      await user.save();

      const token = generateToken(user, role);

      return res.status(200).send({
        success: true,
        message: `Switched active role to ${role}`,
        data: {
          user: {
            uid: user._id,
            phone: user.phone,
            role: user.role,
            roles: user.roles
          },
          token
        }
      });
    } catch (error) {
      console.error('switchRole Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to switch role due to server error' });
    }
  }

  /**
   * Reset User Password via OTP
   */
  async resetPassword(req, res) {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).send({ success: false, message: parseResult.error.errors[0]?.message || 'Invalid request' });
    }
    const { phone, otp, password } = parseResult.data;

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }

    const formattedPhone = validation.formatted;

    try {
      // Find the user first
      const user = await User.findOne({ phone: formattedPhone });
      if (!user) {
        return res.status(404).send({ success: false, message: 'No registered account found with this phone number' });
      }

      // Verify OTP
      let otpRecord = await OTP.findOne({ phone: formattedPhone });
      if (!otpRecord && config.demoMode) {
        // In demo mode, if there is no OTP record in DB, initialize it to allow config.demoOtp
        const hashedDemoOtp = crypto.createHash('sha256').update(config.demoOtp).digest('hex');
        otpRecord = new OTP({
          phone: formattedPhone,
          otp: hashedDemoOtp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0
        });
        await otpRecord.save();
      }

      if (!otpRecord) {
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ phone: formattedPhone });
        return res.status(400).send({ success: false, message: 'Invalid or expired OTP' });
      }

      // Timing safe comparison of SHA-256 hashes
      const hashedClientOtp = crypto.createHash('sha256').update(otp).digest('hex');
      const bufRecordOtp = Buffer.from(otpRecord.otp);
      const bufClientOtp = Buffer.from(hashedClientOtp);
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

      // Update password (automatically hashed via Mongoose pre-save hook)
      user.password = password;
      await user.save();

      return res.status(200).send({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });
    } catch (error) {
      console.error('resetPassword Error:', error.message);
      return res.status(500).send({ success: false, message: 'Password reset failed due to server error' });
    }
  }
}

module.exports = new AuthController();
