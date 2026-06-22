const authController = require('../controllers/authController');
const deviceAuthController = require('../controllers/deviceAuthController');
const hostController = require('../controllers/hostController');
const adController = require('../controllers/adController');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../utils/authMiddleware');

function registerRoutes(fastify, options, done) {
  // Health check route
  fastify.get('/health', async (request, reply) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: dbStates[dbState] || 'unknown'
    };
  });

  // Public Auth Routes
  fastify.post('/auth/send-otp', authController.sendOtp);
  fastify.post('/auth/verify-otp', authController.verifyOtp);
  fastify.post('/auth/register', authController.register);
  fastify.post('/auth/login', authController.login);
  fastify.post('/auth/reset-password', authController.resetPassword);
  fastify.post('/auth/device/activate', deviceAuthController.activateDevice);
  fastify.post('/auth/add-role', { preHandler: authenticate }, authController.addRole);
  fastify.post('/auth/switch-role', { preHandler: authenticate }, authController.switchRole);

  // PhonePe Webhook callback (public)
  fastify.post('/payments/callback', adController.paymentCallback);

  // Merchant Host Routes
  fastify.register((merchantRoutes, opts, next) => {
    merchantRoutes.addHook('preHandler', authenticate);
    merchantRoutes.addHook('preHandler', authorize(['merchant']));

    merchantRoutes.post('/host/apply', hostController.applyForHost);
    merchantRoutes.get('/host/applications', hostController.getMyApplications);
    merchantRoutes.get('/host/menu', hostController.getMenu);
    merchantRoutes.post('/host/menu', hostController.updateMenu);
    merchantRoutes.get('/host/devices', hostController.getMyDevices);
    next();
  });

  // Advertiser Ad Routes
  fastify.register((advertiserRoutes, opts, next) => {
    advertiserRoutes.addHook('preHandler', authenticate);
    advertiserRoutes.addHook('preHandler', authorize(['advertiser']));

    advertiserRoutes.get('/ads/locations/states', adController.getStates);
    advertiserRoutes.get('/ads/locations/cities', adController.getCities);
    advertiserRoutes.get('/ads/locations/outlets', adController.getOutlets);
    advertiserRoutes.get('/ads/book', adController.bookAd); // initiates payment url
    advertiserRoutes.post('/ads/book', adController.bookAd); // supports post fallback
    advertiserRoutes.get('/ads/bookings', adController.getMyBookings);
    advertiserRoutes.post('/ads/verify-payment/:bookingId', adController.verifyPayment);
    advertiserRoutes.post('/ads/upload', { bodyLimit: 104857600 }, adController.uploadVideo);
    next();
  });

  // Common Ad Rates Route (accessible by authenticated users)
  fastify.register((commonRoutes, opts, next) => {
    commonRoutes.addHook('preHandler', authenticate);
    commonRoutes.get('/ads/rates', adController.getRates);
    next();
  });

  // Admin Routes
  fastify.register((adminRoutes, opts, next) => {
    adminRoutes.addHook('preHandler', authenticate);
    adminRoutes.addHook('preHandler', authorize(['admin']));

    adminRoutes.get('/admin/hosts', adminController.getHostApplications);
    adminRoutes.post('/admin/hosts/review', adminController.reviewHostApplication);
    adminRoutes.get('/admin/bookings', adminController.getAdBookings);
    adminRoutes.post('/admin/bookings/review', adminController.reviewAdBooking);
    adminRoutes.post('/admin/bookings/:bookingId/refund', adminController.refundBooking);
    adminRoutes.post('/admin/rates', adminController.manageAdsRates);
    adminRoutes.get('/admin/stats', adminController.getStats);
    adminRoutes.get('/admin/devices', adminController.getDevices);
    adminRoutes.post('/admin/devices', adminController.createDevice);
    adminRoutes.get('/admin/users', adminController.getUsers);
    adminRoutes.put('/admin/users/:userId', adminController.updateUser);
    adminRoutes.post('/admin/users/:userId/reset-password', adminController.adminResetPassword);
    adminRoutes.delete('/admin/users/:userId', adminController.deleteUser);
    adminRoutes.get('/admin/reports', adminController.getReports);
    adminRoutes.patch('/admin/reports/:reportId', adminController.updateReport);
    next();
  });

  done();
}

module.exports = registerRoutes;
