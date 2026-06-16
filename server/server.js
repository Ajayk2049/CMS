const path = require('path');
const crypto = require('crypto');
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
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

// Helper to hash passwords for seeding
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// ----------------------------------------------------
// Fastify Setup (REST & WebSocket)
// ----------------------------------------------------
const fastify = Fastify({ logger: true });

async function startFastify() {
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  await fastify.register(websocket);

  // WebSocket route for Merchant Live Orders
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws/orders', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      if (!token) {
        connection.socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        connection.socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'merchant') {
          connection.socket.send(JSON.stringify({ error: 'Access denied: Merchant role required' }));
          connection.socket.close();
          return;
        }

        const merchantId = decoded.uid;
        merchantSockets.set(merchantId, connection.socket);
        console.log(`[WS] Merchant connected: ${merchantId}`);

        connection.socket.send(JSON.stringify({ event: 'connected', message: 'Connected to live order feed' }));

        connection.socket.on('close', () => {
          merchantSockets.delete(merchantId);
          console.log(`[WS] Merchant disconnected: ${merchantId}`);
        });

      } catch (err) {
        console.error('[WS] Error in connection handler:', err);
        if (connection && connection.socket) {
          try {
            connection.socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            connection.socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to send error or close socket:', wsErr);
          }
        }
      }
    });
  });

  // REST API Routes
  await fastify.register(apiRoutes, { prefix: '/api/v1' });

  // DB Connection & Seeding Admin
  await mongoose.connect(config.mongoUri);
  console.log('[Database] Connected to MongoDB');

  // Seed default admin if none exists
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const adminUser = new User({
      phone: '9999999999',
      password: hashPassword('admin'),
      role: 'admin',
      isDemo: true
    });
    await adminUser.save();
    console.log('[Seeding] Default Admin user created (Phone: 9999999999, Password: admin)');
  }

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
        password: hashPassword('merchant'),
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
        password: hashPassword('advertiser'),
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

// Implement Device gRPC Service
const deviceServiceHandlers = {
  RegisterDevice: async (call, callback) => {
    const { deviceId, deviceType, hostApplicationId } = call.request;
    try {
      let device = await Device.findOne({ deviceId });
      if (!device) {
        // Create if it doesn't exist (if host application matches and is approved)
        device = new Device({
          deviceId,
          deviceType,
          hostApplicationId,
          status: 'online',
          lastHeartbeat: new Date()
        });
        await device.save();
      } else {
        device.status = 'online';
        device.lastHeartbeat = new Date();
        await device.save();
      }

      callback(null, {
        success: true,
        message: `Device ${deviceId} registered and marked online`,
        status: 'online'
      });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  SendHeartbeat: async (call, callback) => {
    const { deviceId } = call.request;
    try {
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
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  TrackAdImpression: async (call, callback) => {
    const { deviceId, bookingId, durationSeconds, interactiveClicks } = call.request;
    try {
      console.log(`[gRPC telemetry] Device ${deviceId} tracked impression for Booking ${bookingId}: ${durationSeconds}s, Clicks: ${interactiveClicks}`);
      
      // Keep track of impression activity in AdBooking if desired
      // We can also print/log metrics locally.
      callback(null, {
        success: true,
        message: 'Telemetry logged successfully'
      });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  }
};

// Implement Menu gRPC Service
const menuServiceHandlers = {
  GetMenu: async (call, callback) => {
    const { merchantId, deviceId } = call.request;
    try {
      let idToQuery = merchantId;

      if (!idToQuery && deviceId) {
        // Look up merchant ID from device registration mapping
        const device = await Device.findOne({ deviceId }).populate('hostApplicationId');
        if (device && device.hostApplicationId) {
          idToQuery = device.hostApplicationId.userId;
        }
      }

      if (!idToQuery) {
        return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not resolve merchant identity' });
      }

      const menu = await Menu.findOne({ merchantId: idToQuery });
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
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  }
};

// Implement Order gRPC Service
const orderServiceHandlers = {
  CreateOrder: async (call, callback) => {
    const { deviceId, merchantId, tableNumber, items, totalAmount } = call.request;
    try {
      const orderId = `ORD_K_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      const transactionId = `TXN_ORD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

      // Save order
      const order = new Order({
        orderId,
        merchantId,
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
      const redirectUrl = `http://localhost:3001/merchant/orders?orderId=${orderId}`;
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
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  GetOrderStatus: async (call, callback) => {
    const { orderId } = call.request;
    try {
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
      callback({ code: grpc.status.INTERNAL, message: err.message });
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
