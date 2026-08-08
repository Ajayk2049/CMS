const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Device = require('../models/Device');
const AdBooking = require('../models/AdBooking');
const { deviceActivationSchema } = require('../utils/zodSchemas');

const resolveMediaUrl = (mediaUrl, host) => {
  if (!mediaUrl) return '';
  if (mediaUrl.includes('/uploads/')) {
    const parts = mediaUrl.split('/uploads/');
    return `http://${host}/uploads/${parts[1]}`;
  }
  if (mediaUrl.startsWith('http')) return mediaUrl;
  const cleanUrl = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
  return `http://${host}${cleanUrl}`;
};

const passwordUtils = require('../utils/password');

function hashPassword(password) {
  return passwordUtils.hashPassword(password);
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
      const cleanDeviceId = deviceId.trim();
      const device = await Device.findOne({ 
        deviceId: { $regex: new RegExp(`^${cleanDeviceId}$`, 'i') } 
      });
      if (!device) {
        return res.status(404).send({ success: false, message: `Device registration for ID "${cleanDeviceId}" not found in database.` });
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

      const HostApplication = require('../models/HostApplication');
      const VenuePromo = require('../models/VenuePromo');

      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp || hostApp.isPaused || hostApp.isRevoked) {
        return res.status(200).send({ success: true, data: [] });
      }

      // Fetch active in-house venue promos matching deviceType
      const promoQuery = { hostApplicationId, isStreaming: true };
      if (deviceType === 'screen') {
        promoQuery.slotType = { $in: ['screen', 'screen_video', 'screen_image'] };
      } else {
        promoQuery.slotType = { $in: ['video', 'image'] };
      }

      promoQuery.transcodeStatus = { $ne: 'processing' };

      const venuePromos = await VenuePromo.find(promoQuery).sort({ slotType: 1, slotIndex: 1 });
      const promoAds = venuePromos.map(p => {
        const resolvedUrl = resolveMediaUrl(p.mediaUrl, req.headers.host);
        return {
          bookingId: p.promoId || `VENUE_AD_${p._id.toString().slice(-5).toUpperCase()}`,
          mediaUrl: resolvedUrl,
          mediaUrls: [resolvedUrl],
          frequencyMinutes: 0,
          durationSeconds: p.mediaType === 'video' ? 30 : 15,
          title: p.title || 'Venue Special',
          mediaType: p.mediaType === 'video' ? 'video' : 'static',
          isVenuePromo: true
        };
      });

      let thirdPartyAds = [];
      const AdBooking = require('../models/AdBooking');
      const bookings = await AdBooking.find({
        outletId: hostApplicationId,
        deviceType: deviceType,
        paymentStatus: 'completed',
        approvalStatus: 'approved'
      });

        const now = new Date();
        const activeBookings = bookings.filter(b => {
          const expiryDate = new Date(b.createdAt);
          expiryDate.setDate(expiryDate.getDate() + b.adDurationDays);
          return expiryDate >= now;
        });

        thirdPartyAds = activeBookings.map(b => {
          let frequencyMinutes = 0;
          const freq = (b.frequency || '').toLowerCase().trim();
          if (freq.includes('continuous') || freq === '0') {
            frequencyMinutes = 0;
          } else if (freq.includes('hourly') || freq === '1_per_hour' || freq === 'once_hourly') {
            frequencyMinutes = 60;
          } else {
            const match = freq.match(/(\d+)\s*(?:min|minute|hr|hour)/);
            if (match) {
              const val = parseInt(match[1], 10);
              if (freq.includes('hr') || freq.includes('hour')) {
                frequencyMinutes = val * 60;
              } else {
                frequencyMinutes = val;
              }
            }
          }

          const rawUrls = (b.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
          const resolvedUrls = rawUrls.map(u => resolveMediaUrl(u, req.headers.host));
          const firstUrl = resolvedUrls[0] || '';
          const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');
          const isImageAd = b.mediaType === 'image' || !isVideo;
          const imageDuration = resolvedUrls.length >= 2 ? 16 : 8;

          return {
            bookingId: b.bookingId,
            mediaUrl: firstUrl,
            mediaUrls: resolvedUrls,
            frequencyMinutes: frequencyMinutes,
            durationSeconds: isImageAd ? imageDuration : (b.mediaDuration || 30),
            title: `Campaign ${b.bookingId}`,
            mediaType: isVideo ? 'video' : 'static'
          };
        });

      // Combine: 3rd-party ads + venue promos in a unified playlist
      const combinedPlaylist = [...thirdPartyAds, ...promoAds];

      // Generate lightweight ETag hash for fast 304 Not Modified validation during backup polling
      const crypto = require('crypto');
      const payloadString = JSON.stringify(combinedPlaylist);
      const etag = `W/"${crypto.createHash('md5').update(payloadString).digest('hex')}"`;

      res.header('ETag', etag);
      res.header('Cache-Control', 'private, no-cache, must-revalidate');

      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === etag) {
        return res.status(304).send();
      }

      return res.status(200).send({
        success: true,
        etag: etag,
        data: combinedPlaylist
      });
    } catch (error) {
      console.error('getDeviceAds Error:', error.message);
      return res.status(500).send({ success: false, message: 'Server error fetching device ads' });
    }
  }
}

module.exports = new DeviceAuthController();
