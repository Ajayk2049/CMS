const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Device = require('../models/Device');
const AdBooking = require('../models/AdBooking');
const { deviceActivationSchema } = require('../utils/zodSchemas');

const resolveMediaUrl = (mediaUrl, host) => {
  if (!mediaUrl) return '';
  if (mediaUrl.startsWith('http')) {
    if (mediaUrl.includes('localhost:') || mediaUrl.includes('127.0.0.1:')) {
      const parts = mediaUrl.split('/uploads/');
      return `http://${host}/uploads/${parts[1]}`;
    }
    return mediaUrl;
  }
  return `http://${host}${mediaUrl}`;
};

// Helper to hash passwords using pbkdf2 (same as authController.js)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

class DeviceAuthController {
  /**
   * One-time activation of tablet / screen devices
   */
  async activateDevice(req, res) {
    const parseResult = deviceActivationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.errors.map(err => err.message).join(', ');
      return res.status(400).send({ 
        success: false, 
        message: `Validation failed: ${formattedErrors}` 
      });
    }

    const { deviceId, hardwareId, deviceType, kioskPassword } = parseResult.data;

    try {
      const device = await Device.findOne({ deviceId });
      if (!device) {
        return res.status(404).send({ success: false, message: 'Device registration not found' });
      }

      if (device.deviceType !== deviceType) {
        return res.status(400).send({ 
          success: false, 
          message: `Device type mismatch. Record specifies ${device.deviceType}` 
        });
      }

      // If already activated, restrict re-activation unless it is the same hardware
      if (device.isActivated) {
        if (device.hardwareId !== hardwareId) {
          return res.status(400).send({ 
            success: false, 
            message: 'Device is already activated on another physical machine. Contact admin to reset.' 
          });
        }
      }

      // Process password for tablet kiosk exit
      if (deviceType === 'tablet') {
        device.kioskPasswordHash = hashPassword(kioskPassword);
      }

      device.hardwareId = hardwareId;
      device.isActivated = true;
      device.status = 'online';
      device.lastHeartbeat = new Date();
      await device.save();

      // Generate secure signed token
      const deviceToken = jwt.sign(
        { 
          deviceId: device.deviceId, 
          deviceType: device.deviceType, 
          hostApplicationId: device.hostApplicationId 
        },
        config.jwtSecret
      );

      return res.status(200).send({
        success: true,
        message: 'Device activated successfully',
        data: {
          deviceId: device.deviceId,
          deviceType: device.deviceType,
          hostApplicationId: device.hostApplicationId,
          token: deviceToken
        }
      });
    } catch (error) {
      console.error('activateDevice Error:', error.message);
      return res.status(500).send({ success: false, message: 'Activation failed due to server error' });
    }
  }

  /**
   * Fetch active approved and paid ad campaigns for a device
   */
  async getDeviceAds(req, res) {
    try {
      const { hostApplicationId, deviceType, deviceId } = req.user;

      if (!hostApplicationId || !deviceType) {
        return res.status(400).send({ success: false, message: 'Invalid device credentials in token' });
      }

      const bookings = await AdBooking.find({
        outletId: hostApplicationId,
        deviceType: deviceType,
        paymentStatus: 'completed',
        approvalStatus: 'approved'
      });

      // Filter out campaigns whose ad duration has expired
      const now = new Date();
      const activeBookings = bookings.filter(b => {
        const expiryDate = new Date(b.createdAt);
        expiryDate.setDate(expiryDate.getDate() + b.adDurationDays);
        return expiryDate >= now;
      });

      const ads = activeBookings.map(b => {
        const absoluteUrl = resolveMediaUrl(b.mediaUrl, req.headers.host);
        return {
          bookingId: b.bookingId,
          mediaUrl: absoluteUrl,
          durationSeconds: 15,
          title: `Campaign ${b.bookingId}`,
          mediaType: (absoluteUrl.endsWith('.mp4') || absoluteUrl.endsWith('.webm')) ? 'video' : 'static'
        };
      });

      return res.status(200).send({
        success: true,
        data: ads
      });
    } catch (error) {
      console.error('getDeviceAds Error:', error.message);
      return res.status(500).send({ success: false, message: 'Server error fetching device ads' });
    }
  }
}

module.exports = new DeviceAuthController();
