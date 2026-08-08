const fs = require('fs');
const path = require('path');
const HostApplication = require('../models/HostApplication');
const AdBooking = require('../models/AdBooking');
const AdsRates = require('../models/AdsRates');
const Device = require('../models/Device');
const User = require('../models/User');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Menu = require('../models/Menu');
const MediaLog = require('../models/MediaLog');
const phonePeService = require('../services/phonePeService');
const crypto = require('crypto');
const validator = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');

const resolveMediaUrl = (mediaUrl, host) => {
  if (!mediaUrl) return '';
  const urls = mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
  const resolved = urls.map(url => {
    if (url.includes('/uploads/')) {
      const parts = url.split('/uploads/');
      return `http://${host}/uploads/${parts[1]}`;
    }
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `http://${host}${cleanUrl}`;
  });
  return resolved.join(',');
};

const passwordUtils = require('../utils/password');

function verifyPassword(password, storedPassword) {
  return passwordUtils.comparePassword(password, storedPassword).isValid;
}

const { generateUniqueCustomId } = require('../utils/idGenerator');

async function generateDeviceId(prefix) {
  const pfx = (prefix || '').toUpperCase().includes('SCREEN') ? 'SCR_' : 'TAB_';
  return await generateUniqueCustomId(Device, 'deviceId', pfx);
}

class AdminController {
  /**
   * Get all host applications (filtered by status optionally)
   */
  async getHostApplications(req, res) {
    const { status } = req.query || {};
    const query = {};
    if (status) {
      query.status = status;
    }

    try {
      const apps = await HostApplication.find(query)
        .populate('userId', 'phone name')
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: apps });
    } catch (error) {
      console.error('admin getHostApplications Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch host applications' });
    }
  }

  /**
   * Review host application (Approve / Reject)
   */
  async reviewHostApplication(req, res) {
    const { applicationId, action } = req.body || {};

    if (!applicationId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).send({ success: false, message: 'applicationId and action (approve/reject) are required' });
    }

    try {
      const app = await HostApplication.findById(applicationId);
      if (!app) {
        return res.status(404).send({ success: false, message: 'Application not found' });
      }

      if (app.status !== 'pending') {
        return res.status(400).send({ success: false, message: `Application is already ${app.status}` });
      }

      if (action === 'approve') {
        app.status = 'approved';
        await app.save();

        // Automatically provision Device records for connection mapping
        const devices = [];
        
        if (app.requestTablet && app.tabletQuantity > 0) {
          for (let i = 0; i < app.tabletQuantity; i++) {
            const deviceId = await generateDeviceId('TAB');
            const device = new Device({
              deviceId,
              deviceType: 'tablet',
              hostApplicationId: app._id,
              status: 'offline'
            });
            await device.save();
            devices.push(device);
          }
        }

        if (app.requestScreen && app.screenQuantity > 0) {
          for (let i = 0; i < app.screenQuantity; i++) {
            const deviceId = await generateDeviceId('SCR');
            const device = new Device({
              deviceId,
              deviceType: 'screen',
              hostApplicationId: app._id,
              status: 'offline'
            });
            await device.save();
            devices.push(device);
          }
        }

        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('host_app_reviewed', { applicationId: app._id, status: app.status });
        }

        return res.status(200).send({
          success: true,
          message: `Application approved. Created ${devices.length} device credentials.`,
          data: { application: app, devices }
        });
      } else {
        app.status = 'rejected';
        await app.save();

        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('host_app_reviewed', { applicationId: app._id, status: app.status });
        }

        return res.status(200).send({
          success: true,
          message: 'Application rejected',
          data: app
        });
      }
    } catch (error) {
      console.error('reviewHostApplication Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to review host application' });
    }
  }

  async updateHostStatusAndQuotas(req, res) {
    const { hostApplicationId } = req.params || {};
    const {
      isPaused,
      isRevoked,
      customMaxVideoSlots,
      customMaxImageSlots,
      customMaxScreenVideoSlots,
      customMaxScreenImageSlots,
      customMaxScreenSlots,
      customDailyVideoQuota,
      customDailyImageQuota,
      customDailyScreenVideoQuota,
      customDailyScreenImageQuota,
      customDailyScreenQuota
    } = req.body || {};

    try {
      const HostApplication = require('../models/HostApplication');
      const app = await HostApplication.findById(hostApplicationId);
      if (!app) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      if (isPaused !== undefined) app.isPaused = !!isPaused;
      if (isRevoked !== undefined) app.isRevoked = !!isRevoked;
      if (customMaxVideoSlots !== undefined) app.customMaxVideoSlots = customMaxVideoSlots !== '' && customMaxVideoSlots !== null ? parseInt(customMaxVideoSlots, 10) : null;
      if (customMaxImageSlots !== undefined) app.customMaxImageSlots = customMaxImageSlots !== '' && customMaxImageSlots !== null ? parseInt(customMaxImageSlots, 10) : null;
      if (customMaxScreenVideoSlots !== undefined) app.customMaxScreenVideoSlots = customMaxScreenVideoSlots !== '' && customMaxScreenVideoSlots !== null ? parseInt(customMaxScreenVideoSlots, 10) : null;
      if (customMaxScreenImageSlots !== undefined) app.customMaxScreenImageSlots = customMaxScreenImageSlots !== '' && customMaxScreenImageSlots !== null ? parseInt(customMaxScreenImageSlots, 10) : null;
      if (customMaxScreenSlots !== undefined) app.customMaxScreenSlots = customMaxScreenSlots !== '' && customMaxScreenSlots !== null ? parseInt(customMaxScreenSlots, 10) : null;

      if (customDailyVideoQuota !== undefined) app.customDailyVideoQuota = customDailyVideoQuota !== '' && customDailyVideoQuota !== null ? parseInt(customDailyVideoQuota, 10) : null;
      if (customDailyImageQuota !== undefined) app.customDailyImageQuota = customDailyImageQuota !== '' && customDailyImageQuota !== null ? parseInt(customDailyImageQuota, 10) : null;
      if (customDailyScreenVideoQuota !== undefined) app.customDailyScreenVideoQuota = customDailyScreenVideoQuota !== '' && customDailyScreenVideoQuota !== null ? parseInt(customDailyScreenVideoQuota, 10) : null;
      if (customDailyScreenImageQuota !== undefined) app.customDailyScreenImageQuota = customDailyScreenImageQuota !== '' && customDailyScreenImageQuota !== null ? parseInt(customDailyScreenImageQuota, 10) : null;
      if (customDailyScreenQuota !== undefined) app.customDailyScreenQuota = customDailyScreenQuota !== '' && customDailyScreenQuota !== null ? parseInt(customDailyScreenQuota, 10) : null;

      // Immediately top up daily remaining changes so updated quotas take effect right away
      const isClosed = app.allowOpenAds === false || app.adMode === 'closed';
      app.dailyVideoChangesRemaining = app.customDailyVideoQuota !== null && app.customDailyVideoQuota !== undefined ? app.customDailyVideoQuota : (isClosed ? 6 : 4);
      app.dailyImageChangesRemaining = app.customDailyImageQuota !== null && app.customDailyImageQuota !== undefined ? app.customDailyImageQuota : (isClosed ? 15 : 10);
      app.dailyScreenVideoChangesRemaining = app.customDailyScreenVideoQuota !== null && app.customDailyScreenVideoQuota !== undefined ? app.customDailyScreenVideoQuota : (isClosed ? 6 : 4);
      app.dailyScreenImageChangesRemaining = app.customDailyScreenImageQuota !== null && app.customDailyScreenImageQuota !== undefined ? app.customDailyScreenImageQuota : (isClosed ? 15 : 10);
      app.dailyScreenChangesRemaining = app.customDailyScreenQuota !== null && app.customDailyScreenQuota !== undefined ? app.customDailyScreenQuota : (isClosed ? 6 : 4);
      app.lastQuotaResetDate = new Date();

      await app.save();

      return res.status(200).send({
        success: true,
        message: 'Host application status & quotas updated successfully',
        data: app
      });
    } catch (error) {
      console.error('updateHostStatusAndQuotas Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update host status & quotas' });
    }
  }

  /**
   * Reset daily host quotas immediately (Instant 1-Click Reset)
   */
  async resetHostQuotaNow(req, res) {
    const { hostApplicationId } = req.params || {};
    try {
      const HostApplication = require('../models/HostApplication');
      const app = await HostApplication.findById(hostApplicationId);
      if (!app) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      const isClosed = app.allowOpenAds === false || app.adMode === 'closed';
      app.dailyVideoChangesRemaining = app.customDailyVideoQuota !== null && app.customDailyVideoQuota !== undefined ? app.customDailyVideoQuota : (isClosed ? 6 : 4);
      app.dailyImageChangesRemaining = app.customDailyImageQuota !== null && app.customDailyImageQuota !== undefined ? app.customDailyImageQuota : (isClosed ? 15 : 10);
      app.dailyScreenVideoChangesRemaining = app.customDailyScreenVideoQuota !== null && app.customDailyScreenVideoQuota !== undefined ? app.customDailyScreenVideoQuota : (isClosed ? 6 : 4);
      app.dailyScreenImageChangesRemaining = app.customDailyScreenImageQuota !== null && app.customDailyScreenImageQuota !== undefined ? app.customDailyScreenImageQuota : (isClosed ? 15 : 10);
      app.dailyScreenChangesRemaining = app.customDailyScreenQuota !== null && app.customDailyScreenQuota !== undefined ? app.customDailyScreenQuota : (isClosed ? 6 : 4);
      app.lastQuotaResetDate = new Date();

      await app.save();

      return res.status(200).send({
        success: true,
        message: `Daily quotas for ${app.outletName} reset to full capacity successfully!`,
        data: app
      });
    } catch (error) {
      console.error('resetHostQuotaNow Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to reset daily host quotas' });
    }
  }

  /**
   * Get all ad bookings for platform admin review & management
   * Strictly filters for paid campaigns where media creative has been uploaded and transcoded/optimized
   */
  async getAdBookings(req, res) {
    const { paymentStatus, approvalStatus } = req.query || {};
    const query = {
      // 1. Strict Payment Check: Only completed paid campaigns
      paymentStatus: paymentStatus || 'completed',
      // 2. Strict Media Check: Media must be uploaded
      mediaUrl: { $exists: true, $ne: '' },
      // 3. Strict Transcode Check: Background media optimization queue must be finished
      transcodeStatus: { $in: ['completed', null] }
    };
    if (approvalStatus) query.approvalStatus = approvalStatus;

    try {
      const bookings = await AdBooking.find(query)
        .populate('advertiserId', 'phone name')
        .populate('outletId', 'outletName city state')
        .sort({ createdAt: -1 });

      const mappedBookings = bookings.map(b => {
        const obj = b.toObject();
        obj.mediaUrl = resolveMediaUrl(obj.mediaUrl, req.headers.host);
        return obj;
      });

      return res.status(200).send({ success: true, data: mappedBookings });
    } catch (error) {
      console.error('admin getAdBookings Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch bookings' });
    }
  }

  /**
   * Review ad campaign (Approve / Reject)
   */
  async reviewAdBooking(req, res) {
    const { bookingId, action, denialReason, adCategory } = req.body || {};

    if (!bookingId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).send({ success: false, message: 'bookingId and action (approve/reject) are required' });
    }

    if (action === 'reject' && (!denialReason || !denialReason.trim())) {
      return res.status(400).send({ success: false, message: 'Reason for denial is required when rejecting a campaign' });
    }

    try {
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      // Security Check: Block approval/rejection if payment is incomplete or media is not uploaded/transcoded
      if (booking.paymentStatus !== 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot review campaign: Payment has not been completed' });
      }
      if (!booking.mediaUrl || !booking.mediaUrl.trim()) {
        return res.status(400).send({ success: false, message: 'Cannot review campaign: Media creative has not been uploaded yet' });
      }
      if (booking.transcodeStatus && booking.transcodeStatus !== 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot review campaign: Media optimization/transcoding is still processing in background' });
      }

      if (booking.paymentStatus !== 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot review bookings that are not paid' });
      }

      if (booking.approvalStatus !== 'pending') {
        return res.status(400).send({ success: false, message: `Booking has already been reviewed (${booking.approvalStatus})` });
      }

      // Admin category re-classification if provided
      const validCategories = ['Electronics', 'RealEstate', 'Automotive', 'Beverages', 'Fashion', 'Finance', 'Entertainment', 'Other'];
      if (adCategory && validCategories.includes(adCategory)) {
        booking.adCategory = adCategory;
      }

      if (action === 'approve') {
        booking.approvalStatus = 'approved';
        booking.denialReason = null;
      } else {
        booking.approvalStatus = 'rejected';
        booking.denialReason = denialReason.trim();

        // Immediately delete all media files (videos, images, staging) from disk upon rejection
        if (booking.mediaUrl) {
          const mediaUrls = booking.mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
          for (const rawUrl of mediaUrls) {
            const urlParts = rawUrl.split('/uploads/');
            if (urlParts.length > 1) {
              const relativePath = urlParts[1];
              const localFilePath = path.join(__dirname, '..', 'uploads', relativePath);
              if (fs.existsSync(localFilePath)) {
                try {
                  fs.unlinkSync(localFilePath);
                  console.log(`[REJECTION CLEANUP] Unlinked rejected media file: ${localFilePath}`);
                } catch (unlinkErr) {
                  console.error(`[REJECTION CLEANUP] Failed to unlink ${localFilePath}:`, unlinkErr.message);
                }
              }
            }
          }

          // Log file unlinking in MediaLog
          const mediaLog = new MediaLog({
            originalFilename: booking.mediaUrl,
            finalizedFilename: 'rejected_unlinked',
            outputPath: 'deleted',
            status: 'failed',
            errorMessage: `Campaign rejected by admin. Reason: ${denialReason.trim()}`
          });
          await mediaLog.save();

          // Clear mediaUrl on database record
          booking.mediaUrl = '';
        }
      }
      
      await booking.save();

      if (global.broadcastToAdmins) {
        global.broadcastToAdmins('campaign_reviewed', { bookingId: booking.bookingId, status: booking.approvalStatus });
      }

      const obj = booking.toObject();
      obj.mediaUrl = resolveMediaUrl(obj.mediaUrl, req.headers.host);

      return res.status(200).send({
        success: true,
        message: `Campaign has been ${booking.approvalStatus}`,
        data: obj
      });
    } catch (error) {
      console.error('reviewAdBooking Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to review booking' });
    }
  }

  /**
   * Create or Update pricing plans
  /**
   * Get all rate cards for platform admin
   */
  async getAdsRates(req, res) {
    try {
      const AdsRates = require('../models/AdsRates');
      const rates = await AdsRates.find({}).sort({ deviceType: 1, mediaType: 1, durationDays: 1 });
      return res.status(200).send({ success: true, data: rates });
    } catch (error) {
      console.error('getAdsRates Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch rate plans' });
    }
  }

  /**
   * Create or Update a pricing rate plan
   */
  async manageAdsRates(req, res) {
    const { rateId: paramRateId } = req.params || {};
    let { rateId, deviceType, mediaType, maxVideoLengthSeconds, durationDays, frequency, amount, pricingType } = req.body || {};

    const targetRateId = paramRateId || rateId;

    if (!deviceType || !durationDays || !frequency || amount === undefined || amount === '' || isNaN(amount)) {
      return res.status(400).send({ success: false, message: 'deviceType, durationDays, frequency, and valid amount are required' });
    }

    if (!['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({ success: false, message: 'Device type must be tablet or screen' });
    }

    const resolvedMediaType = (mediaType || 'video').toLowerCase();
    const resolvedMaxVideoLength = parseInt(maxVideoLengthSeconds, 10) === 60 ? 60 : 30;
    const resolvedPricingType = ['per_device', 'whole_venue'].includes(pricingType) ? pricingType : 'per_device';

    try {
      const AdsRates = require('../models/AdsRates');
      const { generateCustomId } = require('../utils/idGenerator');
      let finalRateId = targetRateId;
      if (!finalRateId) {
        finalRateId = generateCustomId('RATE');
      }

      const rate = await AdsRates.findOneAndUpdate(
        { rateId: finalRateId },
        { 
          rateId: finalRateId,
          deviceType, 
          mediaType: resolvedMediaType,
          maxVideoLengthSeconds: resolvedMaxVideoLength,
          durationDays: parseInt(durationDays, 10), 
          frequency, 
          amount: parseInt(amount, 10), 
          pricingType: resolvedPricingType,
          updatedAt: Date.now() 
        },
        { upsert: true, new: true }
      );

      return res.status(200).send({
        success: true,
        message: 'Pricing rate plan updated successfully',
        data: rate
      });
    } catch (error) {
      console.error('manageAdsRates Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update pricing plan' });
    }
  }

  /**
   * Delete a pricing plan
   */
  async deleteAdsRate(req, res) {
    const { rateId } = req.params;

    if (!rateId) {
      return res.status(400).send({ success: false, message: 'rateId is required' });
    }

    try {
      const rate = await AdsRates.findOneAndDelete({ rateId });

      if (!rate) {
        return res.status(404).send({ success: false, message: 'Pricing plan not found' });
      }

      return res.status(200).send({
        success: true,
        message: 'Pricing plan deleted successfully'
      });
    } catch (error) {
      console.error('deleteAdsRate Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to delete pricing plan' });
    }
  }

  /**
   * Get stats for admin KPI summary widgets
   */
  async getStats(req, res) {
    try {
      const merchantsCount = await User.countDocuments({
        $or: [
          { roles: 'merchant' },
          { roles: { $exists: false }, role: 'merchant' }
        ]
      });
      const advertisersCount = await User.countDocuments({
        $or: [
          { roles: 'advertiser' },
          { roles: { $exists: false }, role: 'advertiser' }
        ]
      });
      const totalHostsCount = await HostApplication.countDocuments({ status: 'approved' });
      const totalDevicesCount = await Device.countDocuments({});
      const activeDevicesCount = await Device.countDocuments({ status: 'online' });
      
      const paidBookings = await PhonePeTransaction.find({ status: 'completed' });
      const totalRevenue = paidBookings.reduce((sum, txn) => sum + txn.amount, 0); // in paise

      return res.status(200).send({
        success: true,
        data: {
          users: {
            merchants: merchantsCount,
            advertisers: advertisersCount
          },
          hosts: {
            total: totalHostsCount
          },
          devices: {
            total: totalDevicesCount,
            active: activeDevicesCount
          },
          revenue: {
            totalPaise: totalRevenue,
            totalINR: totalRevenue / 100
          }
        }
      });
    } catch (error) {
      console.error('getStats Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch admin stats' });
    }
  }

  /**
   * Get all devices
   */
  async getDevices(req, res) {
    try {
      const devices = await Device.find({})
        .populate({
          path: 'hostApplicationId',
          select: 'outletName contactPerson phone city state requestTablet tabletQuantity requestScreen screenQuantity'
        })
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: devices });
    } catch (error) {
      console.error('getDevices Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch devices' });
    }
  }

  /**
   * Manually deploy/provision a new device
   */
  async createDevice(req, res) {
    const { deviceType, hostApplicationId } = req.body || {};

    if (!deviceType || !hostApplicationId) {
      return res.status(400).send({ success: false, message: 'deviceType and hostApplicationId are required' });
    }

    if (!['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({ success: false, message: 'Device type must be tablet or screen' });
    }

    try {
      const app = await HostApplication.findById(hostApplicationId);
      if (!app) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      const prefix = deviceType === 'tablet' ? 'TAB' : 'SCR';
      const deviceId = await generateDeviceId(prefix);
      
      const device = new Device({
        deviceId,
        deviceType,
        hostApplicationId: app._id,
        status: 'offline'
      });

      await device.save();

      // We can also increment quantity of the application if manually deployed
      if (deviceType === 'tablet') {
        app.requestTablet = true;
        app.tabletQuantity = (app.tabletQuantity || 0) + 1;
      } else {
        app.requestScreen = true;
        app.screenQuantity = (app.screenQuantity || 0) + 1;
      }
      await app.save();

      return res.status(201).send({
        success: true,
        message: `Device ${deviceId} deployed successfully`,
        data: device
      });
    } catch (error) {
      console.error('createDevice Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to deploy device' });
    }
  }

  /**
   * Get all merchant/advertiser users
   */
  async getUsers(req, res) {
    try {
      const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
      
      // Get supplementary count information
      const enrichedUsers = await Promise.all(users.map(async (u) => {
        let stats = {};
        let userRoles = u.roles || [];
        if (userRoles.length === 0) {
          userRoles = [u.role];
        }

        if (userRoles.includes('merchant')) {
          const apps = await HostApplication.find({ userId: u._id });
          const appIds = apps.map(a => a._id);
          const devicesCount = await Device.countDocuments({ hostApplicationId: { $in: appIds } });
          stats.merchant = {
            applicationsCount: apps.length,
            devicesCount: devicesCount
          };
        }
        if (userRoles.includes('advertiser')) {
          const bookingsCount = await AdBooking.countDocuments({ advertiserId: u._id });
          stats.advertiser = {
            bookingsCount: bookingsCount
          };
        }
        return {
          ...u.toObject(),
          roles: userRoles,
          stats
        };
      }));

      return res.status(200).send({ success: true, data: enrichedUsers });
    } catch (error) {
      console.error('getUsers Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch users' });
    }
  }



  /**
   * Update user details (Name, Phone, Email, Roles)
   */
  async updateUser(req, res) {
    const { userId } = req.params;
    const { name, phone, email, roles } = req.body || {};

    if (!name || !phone || !roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).send({ success: false, message: 'Name, phone, and roles are required' });
    }

    const validRoles = ['merchant', 'advertiser'];
    for (const r of roles) {
      if (!validRoles.includes(r)) {
        return res.status(400).send({ success: false, message: `Invalid role: ${r}` });
      }
    }

    const validation = validator.validatePhone(phone);
    if (!validation.isValid) {
      return res.status(400).send({ success: false, message: validation.error });
    }
    const formattedPhone = validation.formatted;

    try {
      const userToEdit = await User.findById(userId);
      if (!userToEdit) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }

      if (userToEdit.role === 'admin') {
        return res.status(400).send({ success: false, message: 'Cannot edit administrator accounts' });
      }

      const phoneConflict = await User.findOne({ phone: formattedPhone, _id: { $ne: userId } });
      if (phoneConflict) {
        return res.status(400).send({ success: false, message: 'Another user is already registered with this phone number' });
      }

      if (email) {
        const emailConflict = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: userId } });
        if (emailConflict) {
          return res.status(400).send({ success: false, message: 'Another user is already registered with this email address' });
        }
      }

      userToEdit.name = name.trim();
      userToEdit.phone = formattedPhone;
      userToEdit.email = email ? email.trim().toLowerCase() : undefined;
      userToEdit.roles = roles;

      if (!roles.includes(userToEdit.role)) {
        userToEdit.role = roles[0];
      }

      await userToEdit.save();

      return res.status(200).send({
        success: true,
        message: 'User updated successfully',
        data: {
          _id: userToEdit._id,
          name: userToEdit.name,
          phone: userToEdit.phone,
          email: userToEdit.email,
          role: userToEdit.role,
          roles: userToEdit.roles
        }
      });
    } catch (error) {
      console.error('updateUser Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update user' });
    }
  }

  /**
   * Delete user and all associated data, requiring admin password verification
   */
  async deleteUser(req, res) {
    const { userId } = req.params;
    const { adminPassword } = req.body || {};

    if (!adminPassword) {
      return res.status(400).send({ success: false, message: 'Administrator password is required' });
    }

    try {
      const admin = await User.findById(req.user.uid);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).send({ success: false, message: 'Unauthorized access' });
      }

      const isPasswordValid = verifyPassword(adminPassword, admin.password);
      if (!isPasswordValid) {
        return res.status(400).send({ success: false, message: 'Invalid password. Action rejected.' });
      }

      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }

      if (userToDelete.role === 'admin') {
        return res.status(400).send({ success: false, message: 'Cannot delete administrator accounts' });
      }

      await User.deleteOne({ _id: userId });

      // Cascade deletes for referential integrity
      const hostApps = await HostApplication.find({ userId });
      const hostAppIds = hostApps.map(app => app._id);

      await HostApplication.deleteMany({ userId });
      await Menu.deleteMany({ hostApplicationId: { $in: hostAppIds } });
      await Device.deleteMany({ hostApplicationId: { $in: hostAppIds } });
      await AdBooking.deleteMany({ advertiserId: userId });

      return res.status(200).send({
        success: true,
        message: 'User and all related assets deleted successfully'
      });
    } catch (error) {
      console.error('deleteUser Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to delete user' });
    }
  }

  /**
   * Reset user password to a new value (admin-initiated)
   */
  async adminResetPassword(req, res) {
    const { userId } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 8 || newPassword.length > 12 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).send({ success: false, message: 'New password must be 8-12 characters and contain both letters and numbers' });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }

      if (user.role === 'admin') {
        return res.status(400).send({ success: false, message: 'Cannot reset administrator password via this endpoint' });
      }

      // Password will be automatically hashed by Mongoose pre-save hook
      user.password = newPassword;
      await user.save();

      return res.status(200).send({
        success: true,
        message: 'User password reset successfully'
      });
    } catch (error) {
      console.error('adminResetPassword Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to reset user password' });
    }
  }

  /**
   * Refund a completed ad booking (admin-initiated)
   */
  async refundBooking(req, res) {
    return res.status(400).send({
      success: false,
      message: 'Automated online refunds are disabled. Please process refunds manually offline via customer support.'
    });
  }

  /**
   * Revoke an approved ad booking (admin-initiated)
   */
  async revokeBooking(req, res) {
    const { bookingId } = req.params;
    const { adminPassword, reason } = req.body || {};

    if (!adminPassword) {
      return res.status(400).send({ success: false, message: 'Administrator password is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).send({ success: false, message: 'Reason for revocation is required' });
    }

    const fs = require('fs');
    const path = require('path');
    const MediaLog = require('../models/MediaLog');

    try {
      const admin = await User.findById(req.user.uid);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).send({ success: false, message: 'Unauthorized access' });
      }

      const isPasswordValid = verifyPassword(adminPassword, admin.password);
      if (!isPasswordValid) {
        return res.status(400).send({ success: false, message: 'Invalid password. Action rejected.' });
      }

      // Case-insensitive query to support any case variations
      const booking = await AdBooking.findOne({
        bookingId: { $regex: new RegExp(`^${bookingId}$`, 'i') }
      });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      // Robust check for 'approved' status (case-insensitive and trimmed)
      if (!booking.approvalStatus || booking.approvalStatus.toLowerCase().trim() !== 'approved') {
        return res.status(400).send({ success: false, message: 'Only approved bookings can be revoked' });
      }

      // Delete all media files (videos, images, multi-images) locally from disk upon revocation
      let localFilePath = null;
      if (booking.mediaUrl) {
        const mediaUrls = booking.mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
        for (const rawUrl of mediaUrls) {
          const urlParts = rawUrl.split('/uploads/');
          if (urlParts.length > 1) {
            const relativePath = urlParts[1];
            const targetPath = path.join(__dirname, '..', 'uploads', relativePath);
            if (fs.existsSync(targetPath)) {
              try {
                fs.unlinkSync(targetPath);
                console.log(`[REVOCATION CLEANUP] Unlinked revoked media file: ${targetPath}`);
                localFilePath = targetPath;
              } catch (err) {
                console.error('Failed to delete revoked media file locally:', err.message);
              }
            }
          }
        }
      }

      // Log the delete/revoke action in medialogs
      const mediaLog = new MediaLog({
        originalFilename: booking.mediaUrl || 'unknown',
        finalizedFilename: booking.mediaUrl ? path.basename(booking.mediaUrl) : 'unknown',
        outputPath: localFilePath || 'deleted',
        status: 'failed',
        errorMessage: `Revoked by admin: ${admin.email || admin.name}. Reason: ${reason.trim()}`
      });
      await mediaLog.save();

      booking.approvalStatus = 'revoked';
      await booking.save();

      return res.status(200).send({
        success: true,
        message: 'Campaign has been revoked, local media file deleted, and logged successfully',
        data: booking
      });
    } catch (error) {
      console.error('revokeBooking Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to revoke booking: ' + error.message });
    }
  }

  /**
   * Get all device requests
   */
  async getDeviceRequests(req, res) {
    const { status } = req.query || {};
    const query = {};
    if (status) {
      query.status = status;
    }

    try {
      const DeviceRequest = require('../models/DeviceRequest');
      const reqs = await DeviceRequest.find(query)
        .populate('userId', 'phone name email')
        .populate('hostApplicationId', 'outletName city state')
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: reqs });
    } catch (error) {
      console.error('admin getDeviceRequests Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch device requests' });
    }
  }

  /**
   * Review device request (Approve / Reject)
   */
  async reviewDeviceRequest(req, res) {
    const { requestId, action } = req.body || {};

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).send({ success: false, message: 'requestId and action (approve/reject) are required' });
    }

    try {
      const DeviceRequest = require('../models/DeviceRequest');
      const deviceReq = await DeviceRequest.findById(requestId);
      if (!deviceReq) {
        return res.status(404).send({ success: false, message: 'Device request not found' });
      }

      if (deviceReq.status !== 'pending') {
        return res.status(400).send({ success: false, message: `Request is already ${deviceReq.status}` });
      }

      if (action === 'approve') {
        deviceReq.status = 'approved';
        await deviceReq.save();

        const devices = [];

        const app = await HostApplication.findById(deviceReq.hostApplicationId);
        if (app) {
          if (deviceReq.requestTablet && deviceReq.tabletQuantity > 0) {
            app.requestTablet = true;
            app.tabletQuantity = (app.tabletQuantity || 0) + deviceReq.tabletQuantity;
            
            for (let i = 0; i < deviceReq.tabletQuantity; i++) {
              const deviceId = await generateDeviceId('TAB');
              const device = new Device({
                deviceId,
                deviceType: 'tablet',
                hostApplicationId: app._id,
                status: 'offline'
              });
              await device.save();
              devices.push(device);
            }
          }

          if (deviceReq.requestScreen && deviceReq.screenQuantity > 0) {
            app.requestScreen = true;
            app.screenQuantity = (app.screenQuantity || 0) + deviceReq.screenQuantity;
            
            for (let i = 0; i < deviceReq.screenQuantity; i++) {
              const deviceId = await generateDeviceId('SCR');
              const device = new Device({
                deviceId,
                deviceType: 'screen',
                hostApplicationId: app._id,
                status: 'offline'
              });
              await device.save();
              devices.push(device);
            }
          }

          await app.save();
        }

        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('device_request_reviewed', { requestId: deviceReq._id, status: deviceReq.status });
        }

        return res.status(200).send({
          success: true,
          message: `Request approved. Created ${devices.length} device credentials.`,
          data: { deviceRequest: deviceReq, devices }
        });
      } else {
        deviceReq.status = 'rejected';
        await deviceReq.save();

        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('device_request_reviewed', { requestId: deviceReq._id, status: deviceReq.status });
        }

        return res.status(200).send({
          success: true,
          message: 'Request rejected.',
          data: deviceReq
        });
      }
    } catch (error) {
      console.error('reviewDeviceRequest Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to review device request: ' + error.message });
    }
  }

  /**
   * Platform Admin updates watermark settings for a venue application
   */
  async updateVenueWatermark(req, res) {
    const { hostApplicationId } = req.params;
    const { showPoweredBy, customWatermark } = req.body || {};

    try {
      const app = await HostApplication.findById(hostApplicationId);
      if (!app) {
        return res.status(404).send({ success: false, message: 'Venue application not found' });
      }

      if (!app.billConfig) {
        app.billConfig = {};
      }

      if (showPoweredBy !== undefined) {
        app.billConfig.showPoweredBy = Boolean(showPoweredBy);
      }

      if (customWatermark !== undefined) {
        app.billConfig.customWatermark = String(customWatermark);
      }

      app.markModified('billConfig');
      await app.save();

      return res.status(200).send({
        success: true,
        message: 'Venue watermark updated successfully',
        data: app
      });
    } catch (error) {
      console.error('updateVenueWatermark Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update venue watermark: ' + error.message });
    }
  }

  /**
   * Fetch mode change requests for admin review
   */
  async getModeChangeRequests(req, res) {
    try {
      const ModeChangeRequest = require('../models/ModeChangeRequest');
      const requests = await ModeChangeRequest.find()
        .populate('hostApplicationId', 'outletName outletDescription city state phone email adMode allowOpenAds requestTablet tabletQuantity requestScreen screenQuantity')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 });

      return res.status(200).send({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('getModeChangeRequests Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch mode change requests' });
    }
  }

  /**
   * Review (Approve / Reject) a mode change request
   */
  async reviewModeChangeRequest(req, res) {
    const { requestId } = req.params;
    const { action, adminNotes } = req.body || {};

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).send({ success: false, message: 'Action must be "approved" or "rejected"' });
    }

    try {
      const ModeChangeRequest = require('../models/ModeChangeRequest');
      const HostApplication = require('../models/HostApplication');
      const Device = require('../models/Device');

      const modeReq = await ModeChangeRequest.findOne({ requestId });
      if (!modeReq) {
        return res.status(404).send({ success: false, message: 'Mode change request not found' });
      }

      if (modeReq.status !== 'pending') {
        return res.status(400).send({ success: false, message: `Request has already been ${modeReq.status}` });
      }

      modeReq.status = action;
      modeReq.adminNotes = adminNotes || '';
      modeReq.reviewedAt = new Date();
      await modeReq.save();

      if (action === 'approved') {
        const app = await HostApplication.findById(modeReq.hostApplicationId);
        if (app) {
          const newMode = modeReq.requestedMode;
          app.adMode = newMode;
          app.allowOpenAds = (newMode === 'open');

          const isClosed = newMode === 'closed';
          app.dailyVideoChangesRemaining = isClosed ? 6 : 4;
          app.dailyImageChangesRemaining = isClosed ? 15 : 10;
          app.dailyScreenVideoChangesRemaining = isClosed ? 6 : 4;
          app.dailyScreenImageChangesRemaining = isClosed ? 15 : 10;
          app.dailyScreenChangesRemaining = isClosed ? 6 : 4;

          await app.save();

          // Notify connected tablet & screen devices via WebSocket
          if (global.deviceSockets) {
            const devices = await Device.find({ hostApplicationId: app._id });
            for (const device of devices) {
              const socket = global.deviceSockets.get(device.deviceId);
              if (socket) {
                socket.send(JSON.stringify({ event: 'reload_menu' }));
              }
            }
          }
        }
      }

      return res.status(200).send({
        success: true,
        message: `Mode change request ${action} successfully`,
        data: modeReq
      });
    } catch (error) {
      console.error('reviewModeChangeRequest Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to review mode change request: ' + error.message });
    }
  }

  /**
   * Update category of an ad booking (Platform Admin reclassification)
   */
  async updateBookingCategory(req, res) {
    const { bookingId } = req.params;
    const { adCategory } = req.body || {};

    const validCategories = ['Electronics', 'RealEstate', 'Automotive', 'Beverages', 'Fashion', 'Finance', 'Entertainment', 'Other'];
    if (!adCategory || !validCategories.includes(adCategory)) {
      return res.status(400).send({ success: false, message: `Valid adCategory is required. Allowed: ${validCategories.join(', ')}` });
    }

    try {
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      booking.adCategory = adCategory;
      await booking.save();

      return res.status(200).send({
        success: true,
        message: `Ad campaign ${bookingId} category updated to ${adCategory} successfully!`,
        data: booking
      });
    } catch (error) {
      console.error('updateBookingCategory Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update ad category: ' + error.message });
    }
  }
}

module.exports = new AdminController();
