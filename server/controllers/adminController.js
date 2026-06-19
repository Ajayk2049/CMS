const HostApplication = require('../models/HostApplication');
const AdBooking = require('../models/AdBooking');
const AdsRates = require('../models/AdsRates');
const Device = require('../models/Device');
const User = require('../models/User');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Report = require('../models/Report');
const { v4: uuidv4 } = require('uuid');

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
        .populate('userId', 'phone')
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
        const prefix = app.deviceType === 'tablet' ? 'TAB' : 'SCR';
        
        for (let i = 0; i < app.quantity; i++) {
          const deviceId = `DEV_${prefix}_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
          const device = new Device({
            deviceId,
            deviceType: app.deviceType,
            hostApplicationId: app._id,
            status: 'offline'
          });
          await device.save();
          devices.push(device);
        }

        return res.status(200).send({
          success: true,
          message: `Application approved. Created ${devices.length} device credentials.`,
          data: { application: app, devices }
        });
      } else {
        app.status = 'rejected';
        await app.save();

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

  /**
   * Get all ad bookings
   */
  async getAdBookings(req, res) {
    const { paymentStatus, approvalStatus } = req.query || {};
    const query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    try {
      const bookings = await AdBooking.find(query)
        .populate('advertiserId', 'phone')
        .populate('outletId', 'outletName city state')
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: bookings });
    } catch (error) {
      console.error('admin getAdBookings Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch bookings' });
    }
  }

  /**
   * Review ad campaign (Approve / Reject)
   */
  async reviewAdBooking(req, res) {
    const { bookingId, action, denialReason } = req.body || {};

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

      if (booking.paymentStatus !== 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot review bookings that are not paid' });
      }

      if (booking.approvalStatus !== 'pending') {
        return res.status(400).send({ success: false, message: `Booking has already been reviewed (${booking.approvalStatus})` });
      }

      if (action === 'approve') {
        booking.approvalStatus = 'approved';
        booking.denialReason = null;
      } else {
        booking.approvalStatus = 'rejected';
        booking.denialReason = denialReason.trim();
      }
      
      await booking.save();

      return res.status(200).send({
        success: true,
        message: `Campaign has been ${booking.approvalStatus}`,
        data: booking
      });
    } catch (error) {
      console.error('reviewAdBooking Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to review booking' });
    }
  }

  /**
   * Create or Update pricing plans
   */
  async manageAdsRates(req, res) {
    const { rateId, deviceType, durationDays, frequency, amount } = req.body || {};

    if (!rateId || !deviceType || !durationDays || !frequency || amount === undefined) {
      return res.status(400).send({ success: false, message: 'rateId, deviceType, durationDays, frequency, and amount are required' });
    }

    if (!['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({ success: false, message: 'Device type must be tablet or screen' });
    }

    try {
      const rate = await AdsRates.findOneAndUpdate(
        { rateId },
        { deviceType, durationDays: parseInt(durationDays, 10), frequency, amount: parseInt(amount, 10), updatedAt: Date.now() },
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
          select: 'outletName contactPerson phone city state quantity deviceType'
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
      const deviceId = `DEV_${prefix}_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      
      const device = new Device({
        deviceId,
        deviceType,
        hostApplicationId: app._id,
        status: 'offline'
      });

      await device.save();

      // We can also increment quantity of the application if manually deployed
      app.quantity += 1;
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
   * Get all reports
   */
  async getReports(req, res) {
    try {
      const reports = await Report.find({})
        .populate('reporterId', 'phone role')
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: reports });
    } catch (error) {
      console.error('getReports Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch reports' });
    }
  }

  /**
   * Update report status and action Taken
   */
  async updateReport(req, res) {
    const { reportId } = req.params || {};
    const { status, actionTaken } = req.body || {};

    if (!status || !['pending', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).send({ success: false, message: 'Valid status is required' });
    }

    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        return res.status(404).send({ success: false, message: 'Report not found' });
      }

      report.status = status;
      if (actionTaken !== undefined) {
        report.actionTaken = actionTaken;
      }
      await report.save();

      return res.status(200).send({
        success: true,
        message: 'Report updated successfully',
        data: report
      });
    } catch (error) {
      console.error('updateReport Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update report' });
    }
  }
}

module.exports = new AdminController();
