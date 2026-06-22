const HostApplication = require('../models/HostApplication');
const AdBooking = require('../models/AdBooking');
const AdsRates = require('../models/AdsRates');
const Device = require('../models/Device');
const User = require('../models/User');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Report = require('../models/Report');
const Menu = require('../models/Menu');
const phonePeService = require('../services/phonePeService');
const crypto = require('crypto');
const validator = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
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
        .populate('advertiserId', 'phone name')
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
        .populate('reporterId', 'phone name role')
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
      await Report.deleteMany({ reporterId: userId });

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
    const { bookingId } = req.params;

    try {
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      if (booking.paymentStatus !== 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot refund unpaid bookings' });
      }

      // Generate unique refund transaction ID
      const refundTransactionId = `REFUND_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

      // Fetch original completed transaction
      const originalTxn = await PhonePeTransaction.findOne({ 
        transactionId: booking.transactionId,
        status: 'completed'
      });

      const providerReferenceId = booking.paymentId || (originalTxn?.rawCallbackPayload?.data?.transactionId || originalTxn?.rawCallbackPayload?.transactionId);
      if (!providerReferenceId) {
        return res.status(400).send({ success: false, message: 'Original completed transaction reference not found. Cannot issue refund.' });
      }

      // Call PhonePe Service to initiate refund
      console.log(`[Refund] Initiating PhonePe V2 refund for booking ${bookingId}: original txn ${providerReferenceId}, amount ${booking.amount}`);
      const refundResult = await phonePeService.initiateRefund({
        refundTransactionId,
        originalTransactionId: providerReferenceId,
        amount: booking.amount,
        orderId: booking.orderId
      });

      // Save refund transaction record
      const refundTxn = new PhonePeTransaction({
        transactionId: refundTransactionId,
        orderId: booking.orderId,
        userId: booking.advertiserId,
        amount: booking.amount,
        transactionType: 'refund',
        originalTransactionId: booking.transactionId,
        status: refundResult.status === 'SUCCESS' || refundResult.status === 'COMPLETED' ? 'completed' : 'pending',
        responseCode: refundResult.code
      });
      await refundTxn.save();

      // Update booking status
      booking.paymentStatus = 'refunded';
      await booking.save();

      return res.status(200).send({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundTransactionId,
          paymentStatus: booking.paymentStatus
        }
      });
    } catch (error) {
      console.error('refundBooking Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to process refund: ' + error.message });
    }
  }
}

module.exports = new AdminController();
