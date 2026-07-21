const authController = require('../controllers/authController');
const deviceAuthController = require('../controllers/deviceAuthController');
const hostController = require('../controllers/hostController');
const adController = require('../controllers/adController');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../utils/authMiddleware');

function registerRoutes(fastify, options, done) {
  // Webhook and Ping verification support
  fastify.get('/', async (request, reply) => ({ status: 'ok', message: 'CMS Backend Service is online' }));
  fastify.post('/', async (request, reply) => ({ status: 'ok', message: 'CMS Backend Service is online' }));

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

  // Strict rate limit config for sensitive public authentication endpoints (100 req/min in prod)
  const isDevEnv = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';
  const authRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 500 : 100,
        timeWindow: '1 minute'
      }
    }
  };

  // Public Auth Routes
  fastify.post('/auth/send-otp', authRateLimitConfig, authController.sendOtp);
  fastify.post('/auth/verify-otp', authRateLimitConfig, authController.verifyOtp);
  fastify.post('/auth/register', authRateLimitConfig, authController.register);
  fastify.post('/auth/login', authRateLimitConfig, authController.login);
  fastify.post('/auth/reset-password', authRateLimitConfig, authController.resetPassword);
  fastify.post('/auth/device/activate', deviceAuthController.activateDevice);
  fastify.get('/auth/device/ads', { preHandler: authenticate }, deviceAuthController.getDeviceAds);
  fastify.post('/auth/add-role', { preHandler: authenticate }, authController.addRole);
  fastify.post('/auth/switch-role', { preHandler: authenticate }, authController.switchRole);

  // PhonePe Webhook callback (public)
  fastify.post('/payments/callback', adController.paymentCallback);
  fastify.get('/payments/callback', async (request, reply) => ({ status: 'ok', message: 'Callback endpoint is online' }));

  // Merchant Host Routes
  fastify.register((merchantRoutes, opts, next) => {
    merchantRoutes.addHook('preHandler', authenticate);
    merchantRoutes.addHook('preHandler', authorize(['merchant']));

    merchantRoutes.post('/host/apply', hostController.applyForHost);
    merchantRoutes.get('/host/applications', hostController.getMyApplications);
    merchantRoutes.get('/host/menu', hostController.getMenu);
    merchantRoutes.post('/host/menu', hostController.updateMenu);
    merchantRoutes.post('/host/menu/upload-image', { bodyLimit: 5242880 }, hostController.uploadImage);
    merchantRoutes.get('/host/devices', hostController.getMyDevices);
    merchantRoutes.put('/host/payment-config', hostController.savePaymentConfig);
    merchantRoutes.get('/host/payment-config', hostController.getPaymentConfig);
    merchantRoutes.post('/host/payment-config/upload-qr', { bodyLimit: 5242880 }, hostController.uploadQrCode);
    merchantRoutes.get('/host/orders', hostController.getMyOrders);
    merchantRoutes.post('/host/orders/update-status', hostController.updateOrderStatus);
    merchantRoutes.post('/host/orders/confirm', hostController.confirmOrder);
    merchantRoutes.post('/host/orders/close-table', hostController.closeTable);
    merchantRoutes.post('/host/orders/payment-received', hostController.markPaymentReceived);
    merchantRoutes.post('/host/orders/service-waiter', hostController.serviceWaiter);
    merchantRoutes.post('/host/request-more-devices', hostController.requestMoreDevices);
    merchantRoutes.post('/host/verify-password', hostController.verifyPassword);
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
    adminRoutes.put('/admin/bookings/revoke/:bookingId', adminController.revokeBooking);
    adminRoutes.post('/admin/bookings/:bookingId/refund', adminController.refundBooking);
    adminRoutes.post('/admin/rates', adminController.manageAdsRates);
    adminRoutes.delete('/admin/rates/:rateId', adminController.deleteAdsRate);
    adminRoutes.get('/admin/stats', adminController.getStats);
    adminRoutes.get('/admin/devices', adminController.getDevices);
    adminRoutes.post('/admin/devices', adminController.createDevice);
    adminRoutes.get('/admin/users', adminController.getUsers);
    adminRoutes.put('/admin/users/:userId', adminController.updateUser);
    adminRoutes.post('/admin/users/:userId/reset-password', adminController.adminResetPassword);
    adminRoutes.delete('/admin/users/:userId', adminController.deleteUser);
    adminRoutes.get('/admin/reports', adminController.getReports);
    adminRoutes.patch('/admin/reports/:reportId', adminController.updateReport);
    adminRoutes.get('/admin/device-requests', adminController.getDeviceRequests);
    adminRoutes.post('/admin/device-requests/review', adminController.reviewDeviceRequest);
    next();
  });

  done();
}

module.exports = registerRoutes;
