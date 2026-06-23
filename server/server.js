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

// WebSocket client sockets map (merchantId -> ws socket)
const merchantSockets = new Map();

// ----------------------------------------------------
// Fastify Setup (REST & WebSocket)
// ----------------------------------------------------
const fastify = Fastify({ 
  logger: true,
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

  // Global IP rate limiting (150 requests per minute per IP)
  await fastify.register(rateLimit, {
    max: 150,
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

  // WebSocket route for Merchant Live Orders
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
  });

  // Register raw buffer parser for videos and images
  fastify.addContentTypeParser(
    ['application/octet-stream', 'video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'],
    function (req, payload, done) {
      const chunks = [];
      payload.on('data', chunk => chunks.push(chunk));
      payload.on('end', () => done(null, Buffer.concat(chunks)));
      payload.on('error', err => done(err));
    }
  );

  // Serve uploaded files statically
  fastify.get('/uploads/*', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const subpath = req.params['*'];
    const filePath = path.join(__dirname, 'uploads', subpath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send({ error: 'File not found' });
    }
    const ext = path.extname(subpath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    
    res.header('Content-Type', contentType);
    return res.send(fs.createReadStream(filePath));
  });

  // REST API Routes
  await fastify.register(apiRoutes, { prefix: '/api/v1' });

  // DB Connection & Seeding Admin
  await mongoose.connect(config.mongoUri);
  console.log('[Database] Connected to MongoDB');


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
      
      const device = await Device.findOne({ deviceId });
      if (!device) {
        return callback({ code: grpc.status.NOT_FOUND, message: `Device ${deviceId} not found` });
      }

      device.status = 'online';
      device.lastHeartbeat = new Date();
      await device.save();

      // Return status check command
      callback(null, {
        success: true,
        command: 'normal'
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

      const menu = await Menu.findOne({ hostApplicationId });
      const items = menu ? menu.items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        description: item.description || '',
        price: parseInt(item.price, 10),
        category: item.category,
        isAvailable: item.isAvailable,
        imageUrl: item.imageUrl || ''
      })) : [];

      callback(null, {
        success: true,
        message: menu ? 'Menu retrieved' : 'No menu found, empty list returned',
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

      const orderId = `ORD_K_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      const transactionId = `TXN_ORD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

      // Save order
      const order = new Order({
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
        totalAmount,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        transactionId
      });
      await order.save();

      // Log transaction ledger entry
      const txn = new PhonePeTransaction({
        transactionId,
        orderId,
        userId: merchantId,
        amount: totalAmount,
        transactionType: 'payment',
        status: 'pending'
      });
      await txn.save();

      // Trigger Webhook/WebSocket notification to merchant dashboard
      const wsClient = merchantSockets.get(merchantId.toString());
      if (wsClient) {
        wsClient.send(JSON.stringify({
          event: 'new_order',
          data: order
         }));
      }

      // Initiate payment link via PhonePe
      const redirectUrl = `${config.merchantRedirectUrl}?orderId=${orderId}`;
      const paymentResult = await phonePeService.initiatePayment({
        transactionId,
        userId: merchantId,
        amount: totalAmount,
        redirectUrl,
        phone: null
      });

      callback(null, {
        success: true,
        message: 'Order created, payment initialized',
        orderId,
        paymentUrl: paymentResult.paymentUrl
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

// Start both servers
async function main() {
  try {
    await startFastify();
    startGrpc();
  } catch (err) {
    console.error('Server Startup Failed:', err.message);
    process.exit(1);
  }
}

main();
