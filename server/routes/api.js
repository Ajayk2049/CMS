const authController = require('../controllers/authController');
const hostController = require('../controllers/hostController');
const adController = require('../controllers/adController');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../utils/authMiddleware');

function registerRoutes(fastify, options, done) {
  // Public Auth Routes
  fastify.post('/auth/send-otp', authController.sendOtp);
  fastify.post('/auth/verify-otp', authController.verifyOtp);
  fastify.post('/auth/register', authController.register);
  fastify.post('/auth/login', authController.login);

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
    advertiserRoutes.post('/ads/upload', adController.uploadVideo);
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
    adminRoutes.post('/admin/rates', adminController.manageAdsRates);
    adminRoutes.get('/admin/stats', adminController.getStats);
    adminRoutes.get('/admin/devices', adminController.getDevices);
    adminRoutes.post('/admin/devices', adminController.createDevice);
    adminRoutes.get('/admin/users', adminController.getUsers);
    adminRoutes.get('/admin/reports', adminController.getReports);
    adminRoutes.patch('/admin/reports/:reportId', adminController.updateReport);
    next();
  });

  done();
}

module.exports = registerRoutes;
