const path = require('path');
const crypto = require('crypto');
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
const rateLimit = require('@fastify/rate-limit');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const config = require('./config/config');
const apiRoutes = require('./routes/api');
const phonePeService = require('./services/phonePeService');
const { v4: uuidv4 } = require('uuid');

// Mongoose Models
const User = require('./models/User');
const Device = require('./models/Device');
const Menu = require('./models/Menu');
const Order = require('./models/Order');
const AdBooking = require('./models/AdBooking');
const PhonePeTransaction = require('./models/PhonePeTransaction');
const AdsRates = require('./models/AdsRates');
const Report = require('./models/Report');
const HostApplication = require('./models/HostApplication');

// WebSocket client sockets map (merchantId -> ws socket)
const merchantSockets = new Map();
global.merchantSockets = merchantSockets;
global.deviceSockets = new Map();
global.adminSockets = new Map();

// ----------------------------------------------------
// Fastify Setup (REST & WebSocket)
// ----------------------------------------------------
const fastify = Fastify({
  logger: { level: 'error' },
  bodyLimit: 1048576 // 1MB default body limit
});

async function startFastify() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : true;

  await fastify.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Filename', 'x-filename', 'Accept', 'Origin'],
    credentials: true
  });

  await fastify.register(websocket);

  // Clean API route logger (skips OPTIONS and device sync polls)
  fastify.addHook('onRequest', (request, reply, done) => {
    const url = request.raw.url || '';
    if (
      request.method !== 'OPTIONS' &&
      !url.includes('/auth/device/ads') &&
      !url.includes('/ws')
    ) {
      console.log(`\x1b[36m[API]\x1b[0m ${request.method} ${url}`);
    }
    done();
  });

  // Global IP rate limiting (500 requests per minute per IP, increased to 2000 in dev/demo mode)
  const isDev = config.env === 'development' || config.demoMode;
  await fastify.register(rateLimit, {
    max: isDev ? 2000 : 500,
    timeWindow: '1 minute',
    exclusionRules: (req) => {
      // Exclude websockets and static uploads from rate limiting to prevent playback/sync cuts
      return req.url.startsWith('/ws') || req.url.startsWith('/uploads');
    },
    errorResponseBuilder: (request, context) => ({
      success: false,
      message: 'Too many requests, please try again later.'
    })
  });


  // WebSocket routes for Merchant & Device
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws/orders', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'merchant') {
          socket.send(JSON.stringify({ error: 'Access denied: Merchant role required' }));
          socket.close();
          return;
        }

        const merchantId = decoded.uid;
        merchantSockets.set(merchantId, socket);
        console.log(`[WS] Merchant connected: ${merchantId}`);

        socket.send(JSON.stringify({ event: 'connected', message: 'Connected to live order feed' }));

        socket.on('close', () => {
          merchantSockets.delete(merchantId);
          console.log(`[WS] Merchant disconnected: ${merchantId}`);
        });

      } catch (err) {
        console.error('[WS] Error in connection handler:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to send error or close socket:', wsErr);
          }
        }
      }
    });

    fastifyInstance.get('/ws/device', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const { deviceId } = decoded;
        if (!deviceId) {
          socket.send(JSON.stringify({ error: 'Invalid token: deviceId required' }));
          socket.close();
          return;
        }

        global.deviceSockets.set(deviceId, socket);
        console.log(`[WS] Device connected: ${deviceId}`);

        socket.send(JSON.stringify({ event: 'connected', message: 'Connected to device update feed' }));

        socket.on('close', () => {
          global.deviceSockets.delete(deviceId);
          console.log(`[WS] Device disconnected: ${deviceId}`);
        });

      } catch (err) {
        console.error('[WS] Device connection error:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to close device socket:', wsErr);
          }
        }
      }
    });
    fastifyInstance.get('/ws/admin', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'admin') {
          socket.send(JSON.stringify({ error: 'Access denied: Admin role required' }));
          socket.close();
          return;
        }

        const adminId = decoded.uid || 'admin_session_' + Math.random().toString(36).substring(2, 7);
        global.adminSockets.set(adminId, socket);
        console.log(`[WS] Admin connected: ${adminId}`);

        socket.send(JSON.stringify({ event: 'connected', message: 'Connected to Admin Live Feed' }));

        socket.on('close', () => {
          global.adminSockets.delete(adminId);
          console.log(`[WS] Admin disconnected: ${adminId}`);
        });

      } catch (err) {
        console.error('[WS] Admin connection error:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to close admin socket:', wsErr);
          }
        }
      }
    });
  });

  // Helper to broadcast event to all active admin websocket clients
  global.broadcastToAdmins = (event, data = {}) => {
    if (!global.adminSockets || global.adminSockets.size === 0) return;
    const payload = JSON.stringify({ event, data });
    console.log(`[WS] Broadcasting ${event} to ${global.adminSockets.size} admin(s)`);
    for (const [adminId, socket] of global.adminSockets.entries()) {
      try {
        socket.send(payload);
      } catch (err) {
        console.error(`[WS] Failed to send broadcast to admin ${adminId}:`, err.message);
        global.adminSockets.delete(adminId);
      }
    }
  };

  // Register raw buffer parser for videos and images
  fastify.addContentTypeParser(
    ['application/octet-stream', 'video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'],
    function (req, payload, done) {
      done(null, payload); // Pass the raw payload stream through to req.body
    }
  );

  // Serve uploaded files statically with CORS, Content-Length, and Range support
  fastify.route({
    method: ['GET', 'HEAD', 'OPTIONS'],
    url: '/uploads/*',
    handler: (req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

      if (req.method === 'OPTIONS') {
        return res.status(204).send();
      }

      const fs = require('fs');
      const path = require('path');
      const rawSubpath = req.params['*'] || '';
      
      // Alias 'creative/' or 'media/' to 'ads/' so ad-blocker extensions don't block preview requests containing '/ads/'
      let subpath = rawSubpath;
      if (rawSubpath.startsWith('creative/')) {
        subpath = rawSubpath.replace(/^creative\//, 'ads/');
      } else if (rawSubpath.startsWith('media/')) {
        subpath = rawSubpath.replace(/^media\//, 'ads/');
      }

      let filePath = path.join(__dirname, 'uploads', subpath);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'uploads', rawSubpath);
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).send({ error: 'File not found' });
      }

      const stat = fs.statSync(filePath);
      const ext = path.extname(subpath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      res.header('Content-Type', contentType);
      res.header('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.status(206);
        res.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.header('Content-Length', chunksize);
        return res.send(fileStream);
      }

      res.header('Content-Length', stat.size);
      if (req.method === 'HEAD') {
        return res.status(200).send();
      }

      return res.send(fs.createReadStream(filePath));
    }
  });

  // REST API Routes
  await fastify.register(apiRoutes, { prefix: '/api/v1' });

  // DB Connection & Seeding Admin
  await mongoose.connect(config.mongoUri);
  console.log('[Database] Connected to MongoDB');

  // Database migration for dual-device HostApplication schema
  try {
    const legacyApps = await HostApplication.find({
      $or: [
        { deviceType: { $exists: true } },
        { quantity: { $exists: true } }
      ]
    });
    if (legacyApps.length > 0) {
      console.log(`[Migration] Found ${legacyApps.length} legacy host application documents. Migrating...`);
      for (const app of legacyApps) {
        const type = app.get('deviceType');
        const qty = app.get('quantity') || 0;

        if (type === 'tablet') {
          app.requestTablet = true;
          app.tabletQuantity = qty;
          app.requestScreen = false;
          app.screenQuantity = 0;
        } else if (type === 'screen') {
          app.requestScreen = true;
          app.screenQuantity = qty;
          app.requestTablet = false;
          app.tabletQuantity = 0;
        }

        // Remove legacy fields
        app.set('deviceType', undefined);
        app.set('quantity', undefined);

        await app.save();
      }
      console.log('[Migration] HostApplication database migration completed successfully.');
    }
  } catch (migError) {
    console.error('[Migration] Failed to run HostApplication migration:', migError.message);
  }

  // Run media logs retention cleanup on boot
  const { cleanupOldMediaLogs } = require('./utils/mediaCleanup');
  cleanupOldMediaLogs().catch(err => console.error('[CLEANUP] Boot cleanup failed:', err.message));

  // Run boot-time cleanup of orphaned temporary upload files
  (() => {
    try {
      const fs = require('fs');
      const os = require('os');
      const tempDir = os.tmpdir();
      const files = fs.readdirSync(tempDir);
      let count = 0;
      for (const file of files) {
        if (file.startsWith('tmp-ad-upload-')) {
          fs.unlinkSync(path.join(tempDir, file));
          count++;
        }
      }
      if (count > 0) {
        console.log(`[CLEANUP] Removed ${count} orphaned temporary upload files.`);
      }
    } catch (err) {
      console.error('[CLEANUP] Failed to clear temp files:', err.message);
    }
  })();

  // Seed some default pricing plans if none exist
  const ratesCount = await AdsRates.countDocuments({});
  if (ratesCount === 0) {
    const defaultRates = [
      { rateId: 'R_T_7_H', deviceType: 'tablet', durationDays: 7, frequency: 'hourly', amount: 50000 }, // 500 INR
      { rateId: 'R_T_30_H', deviceType: 'tablet', durationDays: 30, frequency: 'hourly', amount: 180000 }, // 1800 INR
      { rateId: 'R_S_7_C', deviceType: 'screen', durationDays: 7, frequency: 'continuous', amount: 150000 }, // 1500 INR
      { rateId: 'R_S_30_C', deviceType: 'screen', durationDays: 30, frequency: 'continuous', amount: 500000 } // 5000 INR
    ];
    await AdsRates.insertMany(defaultRates);
    console.log('[Seeding] Default advertising rates seeded');
  }

  // Seed demo merchant, advertiser, and reports if none exist
  const reportCount = await Report.countDocuments({});
  if (reportCount === 0) {
    let demoMerchant = await User.findOne({ role: 'merchant' });
    if (!demoMerchant) {
      demoMerchant = new User({
        phone: '+918888888888',
        password: 'merchant',
        role: 'merchant',
        isDemo: true
      });
      await demoMerchant.save();
      console.log('[Seeding] Demo Merchant user created (+918888888888)');
    }

    let demoAdvertiser = await User.findOne({ role: 'advertiser' });
    if (!demoAdvertiser) {
      demoAdvertiser = new User({
        phone: '+917777777777',
        password: 'advertiser',
        role: 'advertiser',
        isDemo: true
      });
      await demoAdvertiser.save();
      console.log('[Seeding] Demo Advertiser user created (+917777777777)');
    }

    const defaultReports = [
      {
        reportId: 'REP_M_A123',
        reporterId: demoMerchant._id,
        reporterRole: 'merchant',
        title: 'Tablet touchscreen unresponsive',
        description: 'Device DEV_TAB_X987 at Table 4 is not responding to user touch events. Screen turns on and displays ads, but customers cannot open the ordering menu.',
        status: 'pending'
      },
      {
        reportId: 'REP_A_B456',
        reporterId: demoAdvertiser._id,
        reporterRole: 'advertiser',
        title: 'Payment processed but ad still pending',
        description: 'Paid 1500 INR via PhonePe for booking campaign ad spot, but status is showing pending after webhook callbacks. Transaction ID: TXN_DEMO_99823.',
        status: 'in-progress',
        actionTaken: 'Contacted PhonePe gateway sandbox to verify transaction status. Waiting for callback verification.'
      }
    ];
    await Report.insertMany(defaultReports);
    console.log('[Seeding] Default support reports seeded');
  }

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[REST/WS Server] Listening on port ${config.port}`);
}

// ----------------------------------------------------
// gRPC Setup (Device, Menu, Order)
// ----------------------------------------------------
const grpcServer = new grpc.Server();

// Load Proto Files
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const orderDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'order.proto'), loaderOptions);
const deviceDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'device.proto'), loaderOptions);
const menuDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'menu.proto'), loaderOptions);

const orderProto = grpc.loadPackageDefinition(orderDef).order;
const deviceProto = grpc.loadPackageDefinition(deviceDef).device;
const menuProto = grpc.loadPackageDefinition(menuDef).menu;

// Helper to verify gRPC metadata JWT token for devices
function verifyGrpcToken(call) {
  const metadata = call.metadata;
  if (!metadata) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'No metadata provided' };
  }
  const authHeaders = metadata.get('authorization');
  if (!authHeaders || authHeaders.length === 0) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Authorization token is missing' };
  }
  const authHeader = authHeaders[0];
  if (!authHeader.startsWith('Bearer ')) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid authorization header format' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded; // { deviceId, deviceType, hostApplicationId }
  } catch (err) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid or expired device token' };
  }
}

// Implement Device gRPC Service
const deviceServiceHandlers = {
  RegisterDevice: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;

      const device = await Device.findOne({ deviceId });
      if (!device) {
        return callback({ code: grpc.status.NOT_FOUND, message: `Device ${deviceId} not found` });
      }
      device.status = 'online';
      device.lastHeartbeat = new Date();
      await device.save();

      callback(null, {
        success: true,
        message: `Device ${deviceId} registered and marked online`,
        status: 'online'
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  SendHeartbeat: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;
      const { callWaiter, waiterOption, tableNumber } = call.request;

      const device = await Device.findOne({ deviceId });
      if (!device) {
        return callback({ code: grpc.status.NOT_FOUND, message: `Device ${deviceId} not found` });
      }

      device.status = 'online';
      device.lastHeartbeat = new Date();
      await device.save();

      // Handle waiter call request
      if (callWaiter) {
        let activeOrder = await Order.findOne({
          deviceId,
          tableStatus: { $in: ['active', 'close_table'] }
        }).sort({ createdAt: -1 });

        if (!activeOrder) {
          const app = await HostApplication.findById(device.hostApplicationId);
          if (app) {
            activeOrder = new Order({
              orderId: 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
              merchantId: app.userId,
              hostApplicationId: device.hostApplicationId,
              deviceId,
              tableNumber: tableNumber || 'T1',
              items: [],
              totalAmount: 0,
              paymentStatus: 'pending',
              orderStatus: 'placed',
              tableStatus: 'active',
              waiterCallStatus: 'pending',
              waiterCallCount: 1,
              waiterCallOption: waiterOption || 'Others'
            });
            await activeOrder.save();
          }
        } else {
          activeOrder.waiterCallCount = (activeOrder.waiterCallCount || 0) + 1;
          activeOrder.waiterCallStatus = 'pending';
          activeOrder.waiterCallOption = waiterOption || 'Others';
          await activeOrder.save();
        }

        // Broadcast to merchant dashboard
        if (activeOrder) {
          const wsClient = global.merchantSockets.get(activeOrder.merchantId.toString());
          if (wsClient) {
            wsClient.send(JSON.stringify({
              event: 'waiter_call',
              data: {
                deviceId,
                tableNumber: activeOrder.tableNumber,
                waiterCallCount: activeOrder.waiterCallCount,
                waiterCallOption: activeOrder.waiterCallOption,
                waiterCallStatus: activeOrder.waiterCallStatus,
                orderId: activeOrder.orderId
              }
            }));
          }
        }
      }

      // Check for active table session state
      let tableSessionJson = '';
      const activeOrder = await Order.findOne({
        deviceId,
        tableStatus: { $in: ['active', 'close_table'] }
      }).sort({ createdAt: -1 });
      if (activeOrder) {
        const app = await HostApplication.findById(activeOrder.hostApplicationId);
        const upiId = app?.upiId || '';
        const payeeName = app?.payeeName || '';
        const amountRs = (activeOrder.totalAmount / 100).toFixed(2);
        let upiUrl = '';
        if (upiId) {
          upiUrl = `upi://pay?pa=${upiId}`;
          if (payeeName) {
            upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
          }
          upiUrl += `&am=${amountRs}&cu=INR`;
        }
        const sessionPayload = {
          status: activeOrder.tableStatus,
          orderId: activeOrder.orderId,
          amount: activeOrder.totalAmount,
          upiUrl,
          orderStatus: activeOrder.orderStatus,
          tableNumber: activeOrder.tableNumber,
          waiterCallStatus: activeOrder.waiterCallStatus || 'none',
          waiterCallCount: activeOrder.waiterCallCount || 0,
          waiterCallOption: activeOrder.waiterCallOption || '',
          items: (activeOrder.items || []).map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price
          }))
        };

        if (activeOrder.tableStatus === 'close_table' && activeOrder.items && activeOrder.items.length > 0) {
          const Menu = require('./models/Menu');
          const menu = await Menu.findOne({ hostApplicationId: activeOrder.hostApplicationId });
          if (menu) {
            const itemsBreakdown = [];
            let subtotalPaise = 0;
            let gstPaise = 0;
            let otherChargesPaise = 0;

            const defaultGst = menu.defaultGst || 0;
            const defaultOtherCharges = menu.defaultOtherCharges || 0;
            const defaultOtherChargesType = menu.defaultOtherChargesType || 'percentage';

            for (const item of activeOrder.items) {
              const menuItem = menu.items.find(i => i.itemId === item.itemId);
              const gstPercent = (menuItem && menuItem.gst !== undefined && menuItem.gst !== null) 
                ? menuItem.gst 
                : defaultGst;
              const otherChargesVal = (menuItem && menuItem.otherCharges !== undefined && menuItem.otherCharges !== null) 
                ? menuItem.otherCharges 
                : defaultOtherCharges;
              const otherChargesType = (menuItem && menuItem.otherCharges !== undefined && menuItem.otherCharges !== null) 
                ? (menuItem.otherChargesType || 'percentage')
                : defaultOtherChargesType;

              const itemSubtotal = item.price * item.quantity;
              const itemGst = Math.round(itemSubtotal * (gstPercent / 100));
              
              let itemOther = 0;
              if (otherChargesType === 'rupees') {
                itemOther = Math.round(item.quantity * (otherChargesVal * 100));
              } else {
                itemOther = Math.round(itemSubtotal * (otherChargesVal / 100));
              }

              subtotalPaise += itemSubtotal;
              gstPaise += itemGst;
              otherChargesPaise += itemOther;

              itemsBreakdown.push({
                name: item.name,
                quantity: item.quantity,
                price: item.price
              });
            }

            sessionPayload.items = itemsBreakdown;
            sessionPayload.subtotal = subtotalPaise;
            sessionPayload.gst = gstPaise;
            sessionPayload.otherCharges = otherChargesPaise;
          }
        }

        tableSessionJson = JSON.stringify(sessionPayload);
      } else {
        // Check if order was completed (payment received)
        const completedOrder = await Order.findOne({
          deviceId,
          tableStatus: 'completed',
          updatedAt: { $gt: new Date(Date.now() - 30000) } // within last 30s
        }).sort({ updatedAt: -1 });
        if (completedOrder) {
          tableSessionJson = JSON.stringify({
            status: 'completed',
            orderId: completedOrder.orderId
          });
          // Mark as handled so it doesn't repeat
          completedOrder.tableStatus = 'completed_acked';
          await completedOrder.save();
        }
      }

      callback(null, {
        success: true,
        command: 'normal',
        tableSessionJson
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  TrackAdImpression: async (call, callback) => {
    const { bookingId, durationSeconds, interactiveClicks } = call.request;
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;
      console.log(`[gRPC telemetry] Device ${deviceId} tracked impression for Booking ${bookingId}: ${durationSeconds}s, Clicks: ${interactiveClicks}`);

      callback(null, {
        success: true,
        message: 'Telemetry logged successfully'
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

// Implement Menu gRPC Service
const menuServiceHandlers = {
  GetMenu: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { hostApplicationId } = claims;

      const app = await HostApplication.findById(hostApplicationId);
      const outletName = app ? app.outletName : 'Aster & Ice';

      const menu = await Menu.findOne({ hostApplicationId });
      const items = menu ? menu.items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        description: item.description || '',
        price: parseInt(item.price, 10),
        category: item.category,
        isAvailable: item.isAvailable,
        imageUrl: item.imageUrl || '',
        isVeg: item.isVeg !== undefined ? item.isVeg : true
      })) : [];

      callback(null, {
        success: true,
        message: outletName,
        items
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

// Implement Order gRPC Service
const orderServiceHandlers = {
  CreateOrder: async (call, callback) => {
    const { tableNumber, items, totalAmount } = call.request;
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId, hostApplicationId } = claims;

      const device = await Device.findOne({ deviceId }).populate('hostApplicationId');
      if (!device || !device.hostApplicationId) {
        return callback({ code: grpc.status.FAILED_PRECONDITION, message: 'Device is not linked to an application' });
      }
      const merchantId = device.hostApplicationId.userId;

      // Check if there is already an active order session on this table device
      let order = await Order.findOne({
        deviceId,
        tableStatus: 'active'
      });

      if (order) {
        // Merge items into existing active order
        items.forEach(newItem => {
          const existingItem = order.items.find(i => i.itemId === newItem.itemId);
          if (existingItem) {
            existingItem.quantity += newItem.quantity;
          } else {
            order.items.push({
              itemId: newItem.itemId,
              name: newItem.name,
              quantity: newItem.quantity,
              price: newItem.price
            });
          }
        });
        // Add new items amount to totalAmount
        order.totalAmount += Number(totalAmount);
        // Reset orderStatus to 'placed' so the kitchen knows new items are added to prepare
        order.orderStatus = 'placed';
        
        await order.save();
      } else {
        // Create a new order if no active session exists
        const orderId = `ORD_K_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

        order = new Order({
          orderId,
          merchantId,
          hostApplicationId,
          deviceId,
          tableNumber,
          items: items.map(item => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: Number(totalAmount),
          paymentStatus: 'pending',
          orderStatus: 'placed',
          tableStatus: 'active'
        });
        await order.save();
      }

      // Notify merchant dashboard via WebSocket
      const wsClient = merchantSockets.get(merchantId.toString());
      if (wsClient) {
        wsClient.send(JSON.stringify({
          event: 'new_order',
          data: order
        }));
      }

      callback(null, {
        success: true,
        message: 'Order placed',
        orderId: order.orderId,
        paymentUrl: ''
      });
    } catch (err) {
      console.error('gRPC CreateOrder Error:', err.message);
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  GetOrderStatus: async (call, callback) => {
    const { orderId } = call.request;
    try {
      verifyGrpcToken(call);

      const order = await Order.findOne({ orderId });
      if (!order) {
        return callback({ code: grpc.status.NOT_FOUND, message: `Order ${orderId} not found` });
      }

      callback(null, {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

function startGrpc() {
  grpcServer.addService(deviceProto.DeviceService.service, deviceServiceHandlers);
  grpcServer.addService(menuProto.MenuService.service, menuServiceHandlers);
  grpcServer.addService(orderProto.OrderService.service, orderServiceHandlers);

  grpcServer.bindAsync(
    `0.0.0.0:${config.grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC Server] Binding failed:', err.message);
        return;
      }
      grpcServer.start();
      console.log(`[gRPC Server] Listening on port ${port}`);
    }
  );
}

// Start background heartbeat monitor:
//  1. Transition stale online devices to offline (35s no ping)
//  2. Detach devices that have been offline for too long (2 min no ping)
//     so their deviceId is free for re-activation on another physical machine.
function startHeartbeatMonitor() {
  console.log('[Heartbeat Monitor] Started background device check interval (15s)...');
  setInterval(async () => {
    try {
      const offlineThreshold = new Date(Date.now() - 35000); // 35s — mark offline
      const detachThreshold   = new Date(Date.now() - 120000); // 2 min — auto-detach

      // 1) Mark stale online devices as offline
      const staleDevices = await Device.find({
        status: 'online',
        lastHeartbeat: { $lt: offlineThreshold }
      });

      for (const device of staleDevices) {
        device.status = 'offline';
        await device.save();
        console.log(`[Heartbeat Monitor] Device ${device.deviceId} is stale (last ping: ${device.lastHeartbeat.toLocaleTimeString()}). Marked OFFLINE.`);
      }

      // 2) Auto-detach devices that have been offline for the full grace period
      const detachedDevices = await Device.find({
        isActivated: true,
        status: 'offline',
        lastHeartbeat: { $lt: detachThreshold }
      });

      for (const device of detachedDevices) {
        const previousHardware = device.hardwareId;
        device.isActivated = false;
        device.hardwareId = null;
        device.kioskPasswordHash = null;
        device.status = 'offline';
        await device.save();
        console.log(`[Heartbeat Monitor] Device ${device.deviceId} auto-detached after extended offline (was bound to hardware ${previousHardware}). ID is now available for re-activation.`);
      }
    } catch (err) {
      console.error('[Heartbeat Monitor] Error running device check:', err.message);
    }
  }, 15000); // Check every 15 seconds
}

// Start both servers
async function main() {
  try {
    await startFastify();
    startGrpc();
    startHeartbeatMonitor();
  } catch (err) {
    console.error('Server Startup Failed:', err.message);
    process.exit(1);
  }
}

// localtunnel helper
const localtunnel = require("localtunnel");

let tunnelInstance = null;

async function startLocalTunnel() {
  try {
    if (tunnelInstance) {
      try {
        tunnelInstance.close();
      } catch (e) {}
    }
    const tunnel = await localtunnel({ port: config.port || 4200 });
    tunnelInstance = tunnel;
    const publicCallbackUrl = `${tunnel.url}/api/v1/payments/callback`;

    // Dynamically override the callback URL in config
    config.phonePe.callbackUrl = publicCallbackUrl;

    console.log(`\x1b[32m[localtunnel] Tunnel active at: ${tunnel.url}\x1b[0m`);
    console.log(`\x1b[32m[localtunnel] PhonePe Callback URL set to: ${publicCallbackUrl}\x1b[0m`);

    tunnel.on('close', () => {
      console.log('[localtunnel] Tunnel closed. Attempting reconnect in 10s...');
      config.phonePe.callbackUrl = process.env.PHONEPE_CALLBACK_URL;
      setTimeout(startLocalTunnel, 10000);
    });

    tunnel.on('error', (err) => {
      console.error('[localtunnel] Tunnel socket error:', err.message);
      try {
        tunnel.close();
      } catch (e) {}
    });
  } catch (err) {
    console.error('[localtunnel] Failed to start tunnel:', err.message);
    console.warn('[localtunnel] Falling back to .env callback URL:', config.phonePe.callbackUrl);
    setTimeout(startLocalTunnel, 10000);
  }
}

// Ensure tunnel is ready BEFORE server starts accepting requests
(async () => {
  await startLocalTunnel();
  main();
})();
