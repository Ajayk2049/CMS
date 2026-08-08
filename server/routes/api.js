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
  fastify.post('/auth/switch-role', { preHandler: authenticate }, authController.switchRole);

  // PhonePe Webhook callback (public)
  fastify.post('/payments/callback', adController.paymentCallback);
  fastify.get('/payments/callback', async (request, reply) => ({ status: 'ok', message: 'Callback endpoint is online' }));

  // Merchant Host Routes
  fastify.register((merchantRoutes, opts, next) => {
    merchantRoutes.addHook('preHandler', authenticate);
    merchantRoutes.addHook('preHandler', authorize(['merchant']));

    merchantRoutes.post('/host/apply', hostController.applyForHost.bind(hostController));
    merchantRoutes.get('/host/applications', hostController.getMyApplications.bind(hostController));
    merchantRoutes.put('/host/applications/:applicationId', hostController.updateApplication.bind(hostController));
    merchantRoutes.get('/host/menu', hostController.getMenu.bind(hostController));
    merchantRoutes.post('/host/menu', hostController.updateMenu.bind(hostController));
    merchantRoutes.post('/host/menu/upload-image', { bodyLimit: 5242880 }, hostController.uploadImage.bind(hostController));
    merchantRoutes.get('/host/devices', hostController.getMyDevices.bind(hostController));
    merchantRoutes.put('/host/payment-config', hostController.savePaymentConfig.bind(hostController));
    merchantRoutes.get('/host/payment-config', hostController.getPaymentConfig.bind(hostController));
    merchantRoutes.post('/host/payment-config/upload-qr', { bodyLimit: 5242880 }, hostController.uploadQrCode.bind(hostController));
    merchantRoutes.get('/host/orders', hostController.getMyOrders.bind(hostController));
    merchantRoutes.post('/host/orders/update-status', hostController.updateOrderStatus.bind(hostController));
    merchantRoutes.post('/host/orders/confirm', hostController.confirmOrder.bind(hostController));
    merchantRoutes.post('/host/orders/close-table', hostController.closeTable.bind(hostController));
    merchantRoutes.post('/host/orders/payment-received', hostController.markPaymentReceived.bind(hostController));
    merchantRoutes.post('/host/orders/takeout', hostController.createTakeoutOrder.bind(hostController));
    merchantRoutes.post('/host/orders/service-waiter', hostController.serviceWaiter.bind(hostController));
    merchantRoutes.post('/host/request-more-devices', hostController.requestMoreDevices.bind(hostController));
    merchantRoutes.post('/host/verify-password', hostController.verifyPassword.bind(hostController));
    merchantRoutes.get('/host/promos', hostController.getHostPromos.bind(hostController));
    merchantRoutes.post('/host/promos/upload-media', { bodyLimit: 104857600 }, hostController.uploadHostPromoMedia.bind(hostController));
    merchantRoutes.post('/host/promos/stream', hostController.streamHostPromos.bind(hostController));
    merchantRoutes.post('/host/promos/delete-slot', hostController.deleteHostPromoSlot.bind(hostController));
    merchantRoutes.get('/host/analytics', hostController.getVenueAnalytics.bind(hostController));
    merchantRoutes.get('/host/bill-config/:applicationId', hostController.getBillConfig.bind(hostController));
    merchantRoutes.put('/host/bill-config/:applicationId', hostController.updateBillConfig.bind(hostController));
    merchantRoutes.post('/host/bill-config/upload-image', { bodyLimit: 10485760 }, hostController.uploadBillImage.bind(hostController));
    merchantRoutes.post('/host/applications/request-mode-change', hostController.requestModeChange.bind(hostController));
    merchantRoutes.get('/host/applications/mode-change-status', hostController.getModeChangeStatus.bind(hostController));
    next();
  });

  // Advertiser Ad Routes
  fastify.register((advertiserRoutes, opts, next) => {
    advertiserRoutes.addHook('preHandler', authenticate);
    advertiserRoutes.addHook('preHandler', authorize(['advertiser']));

    advertiserRoutes.get('/ads/locations/states', adController.getStates.bind(adController));
    advertiserRoutes.get('/ads/locations/cities', adController.getCities.bind(adController));
    advertiserRoutes.get('/ads/locations/outlets', adController.getOutlets.bind(adController));
    advertiserRoutes.get('/ads/book', adController.bookAd.bind(adController)); // initiates payment url
    advertiserRoutes.post('/ads/book', adController.bookAd.bind(adController)); // supports post fallback
    advertiserRoutes.get('/ads/bookings', adController.getMyBookings.bind(adController));
    advertiserRoutes.post('/ads/verify-payment/:bookingId', adController.verifyPayment.bind(adController));
    advertiserRoutes.post('/ads/upload', { bodyLimit: 104857600 }, adController.uploadVideo.bind(adController));
    advertiserRoutes.post('/ads/upload-image', { bodyLimit: 10485760 }, adController.uploadImage.bind(adController));
    next();
  });

  // Common Ad Routes (accessible by authenticated users)
  fastify.register((commonRoutes, opts, next) => {
    commonRoutes.addHook('preHandler', authenticate);
    commonRoutes.get('/ads/rates', adController.getRates.bind(adController));
    commonRoutes.get('/ads/analytics/:bookingId', adController.getCampaignAnalytics.bind(adController));
    next();
  });

  // Admin Routes
  fastify.register((adminRoutes, opts, next) => {
    adminRoutes.addHook('preHandler', authenticate);
    adminRoutes.addHook('preHandler', authorize(['admin']));

    adminRoutes.get('/admin/hosts', adminController.getHostApplications.bind(adminController));
    adminRoutes.post('/admin/hosts/review', adminController.reviewHostApplication.bind(adminController));
    adminRoutes.put('/admin/hosts/:hostApplicationId/status', adminController.updateHostStatusAndQuotas.bind(adminController));
    adminRoutes.post('/admin/hosts/:hostApplicationId/reset-quota', adminController.resetHostQuotaNow.bind(adminController));
    adminRoutes.put('/admin/hosts/:hostApplicationId/watermark', adminController.updateVenueWatermark.bind(adminController));
    adminRoutes.get('/admin/bookings', adminController.getAdBookings.bind(adminController));
    adminRoutes.post('/admin/bookings/review', adminController.reviewAdBooking.bind(adminController));
    adminRoutes.put('/admin/bookings/:bookingId/category', adminController.updateBookingCategory.bind(adminController));
    adminRoutes.put('/admin/bookings/revoke/:bookingId', adminController.revokeBooking.bind(adminController));
    adminRoutes.post('/admin/bookings/:bookingId/refund', adminController.refundBooking.bind(adminController));
    adminRoutes.get('/admin/rates', adminController.getAdsRates.bind(adminController));
    adminRoutes.post('/admin/rates', adminController.manageAdsRates.bind(adminController));
    adminRoutes.put('/admin/rates/:rateId', adminController.manageAdsRates.bind(adminController));
    adminRoutes.delete('/admin/rates/:rateId', adminController.deleteAdsRate.bind(adminController));
    adminRoutes.get('/admin/stats', adminController.getStats.bind(adminController));
    adminRoutes.get('/admin/devices', adminController.getDevices.bind(adminController));
    adminRoutes.post('/admin/devices', adminController.createDevice.bind(adminController));
    adminRoutes.get('/admin/users', adminController.getUsers.bind(adminController));
    adminRoutes.put('/admin/users/:userId', adminController.updateUser.bind(adminController));
    adminRoutes.post('/admin/users/:userId/reset-password', adminController.adminResetPassword.bind(adminController));
    adminRoutes.delete('/admin/users/:userId', adminController.deleteUser.bind(adminController));

    adminRoutes.get('/admin/device-requests', adminController.getDeviceRequests.bind(adminController));
    adminRoutes.post('/admin/device-requests/review', adminController.reviewDeviceRequest.bind(adminController));
    adminRoutes.get('/admin/mode-change-requests', adminController.getModeChangeRequests.bind(adminController));
    adminRoutes.put('/admin/mode-change-requests/:requestId/review', adminController.reviewModeChangeRequest.bind(adminController));
    next();
  });

  done();
}

module.exports = registerRoutes;
