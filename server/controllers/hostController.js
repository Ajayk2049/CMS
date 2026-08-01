const HostApplication = require('../models/HostApplication');
const Menu = require('../models/Menu');
const Device = require('../models/Device');
const Order = require('../models/Order');

// Utility to push session update to device via WebSocket
async function notifyDeviceSessionUpdate(order) {
  if (!order || !order.deviceId) return;
  const socket = global.deviceSockets ? global.deviceSockets.get(order.deviceId) : null;
  if (!socket) return;

  try {
    const HostApplication = require('../models/HostApplication');
    const app = await HostApplication.findById(order.hostApplicationId);
    const upiId = app?.upiId || '';
    const payeeName = app?.payeeName || '';
    const amountRs = (order.totalAmount / 100).toFixed(2);
    let upiUrl = '';
    if (upiId) {
      upiUrl = `upi://pay?pa=${upiId}`;
      if (payeeName) {
        upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
      }
      upiUrl += `&am=${amountRs}&cu=INR`;
    }

    const payload = {
      event: 'table_session',
      status: order.tableStatus,
      orderId: order.orderId,
      amount: order.totalAmount,
      upiUrl,
      orderStatus: order.orderStatus,
      tableNumber: order.tableNumber,
      waiterCallStatus: order.waiterCallStatus || 'none',
      waiterCallCount: order.waiterCallCount || 0,
      waiterCallOption: order.waiterCallOption || ''
    };

    if (order.tableStatus === 'close_table' && order.items && order.items.length > 0) {
      const Menu = require('../models/Menu');
      const menu = await Menu.findOne({ hostApplicationId: order.hostApplicationId });
      if (menu) {
        const itemsBreakdown = [];
        let subtotalPaise = 0;
        let gstPaise = 0;
        let otherChargesPaise = 0;

        const defaultGst = menu.defaultGst || 0;
        const defaultOtherCharges = menu.defaultOtherCharges || 0;
        const defaultOtherChargesType = menu.defaultOtherChargesType || 'percentage';

        for (const item of order.items) {
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

        payload.items = itemsBreakdown;
        payload.subtotal = subtotalPaise;
        payload.gst = gstPaise;
        payload.otherCharges = otherChargesPaise;
      }
    }

    socket.send(JSON.stringify(payload));
    console.log(`[WS] Push session update to Device ${order.deviceId}: status=${order.tableStatus}, orderStatus=${order.orderStatus}, waiterCallStatus=${order.waiterCallStatus}`);

    // Push real-time update to Merchant Dashboard WebSocket stream
    if (order.merchantId) {
      const mId = order.merchantId.toString();
      const merchantSocket = global.merchantSockets ? global.merchantSockets.get(mId) : null;
      if (merchantSocket) {
        try {
          merchantSocket.send(JSON.stringify({
            event: 'order_update',
            data: order
          }));
          console.log(`[WS] Push order update to Merchant ${mId}: orderId=${order.orderId}, orderStatus=${order.orderStatus}`);
        } catch (err) {
          console.error('[WS] Failed to send update to merchant:', err.message);
        }
      }
    }

    if (order.tableStatus === 'completed') {
      setTimeout(async () => {
        try {
          order.tableStatus = 'completed_acked';
          await order.save();
          console.log(`[WS] Auto-acked completed table session for table ${order.tableNumber}`);
        } catch (e) {
          console.error('[WS] Failed to auto-ack completed order:', e.message);
        }
      }, 1000);
    }
  } catch (err) {
    console.error('[WS] Failed to send update to device:', err.message);
  }
}

class HostController {
  /**
   * Submit application to host a device (Tablet / Screen)
   */
  async applyForHost(req, res) {
    const {
      outletName,
      outletDescription,
      doorNo,
      street,
      city,
      state,
      zipCode,
      contactPerson,
      phone,
      email,
      requestTablet,
      tabletQuantity,
      requestScreen,
      screenQuantity
    } = req.body || {};

    // Basic validation
    if (
      !outletName ||
      !outletDescription ||
      !doorNo ||
      !street ||
      !city ||
      !state ||
      !zipCode ||
      !contactPerson ||
      !phone ||
      !email
    ) {
      return res.status(400).send({ success: false, message: 'All venue fields are required' });
    }

    const isRequestingTablet = !!requestTablet;
    const isRequestingScreen = !!requestScreen;

    if (!isRequestingTablet && !isRequestingScreen) {
      return res.status(400).send({ success: false, message: 'You must select at least one device type (Tablet or Screen)' });
    }

    let parsedTabletQty = 0;
    if (isRequestingTablet) {
      parsedTabletQty = parseInt(tabletQuantity, 10);
      if (isNaN(parsedTabletQty) || parsedTabletQty < 1) {
        return res.status(400).send({ success: false, message: 'Tablet quantity must be at least 1' });
      }
    }

    let parsedScreenQty = 0;
    if (isRequestingScreen) {
      parsedScreenQty = parseInt(screenQuantity, 10);
      if (isNaN(parsedScreenQty) || parsedScreenQty < 1) {
        return res.status(400).send({ success: false, message: 'Screen quantity must be at least 1' });
      }
    }

    try {
      const existingApp = await HostApplication.findOne({ userId: req.user.uid });
      if (existingApp) {
        return res.status(400).send({ success: false, message: 'You have already submitted a host application. Only one venue is allowed per account.' });
      }

      const application = new HostApplication({
        userId: req.user.uid,
        outletName,
        outletDescription,
        doorNo,
        street,
        city,
        state,
        zipCode,
        contactPerson,
        phone,
        email,
        requestTablet: isRequestingTablet,
        tabletQuantity: parsedTabletQty,
        requestScreen: isRequestingScreen,
        screenQuantity: parsedScreenQty,
        adMode: req.body.adMode || 'open',
        allowOpenAds: req.body.allowOpenAds !== undefined ? !!req.body.allowOpenAds : true,
        dailyVideoChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        dailyImageChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 15 : 10,
        dailyScreenVideoChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        dailyScreenImageChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 15 : 10,
        dailyScreenChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        status: 'pending'
      });

      await application.save();

      if (global.broadcastToAdmins) {
        global.broadcastToAdmins('new_host_app', { outletName });
      }

      return res.status(201).send({
        success: true,
        message: 'Host application submitted successfully. It is now pending admin approval',
        data: application
      });
    } catch (error) {
      console.error('applyForHost Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to submit application' });
    }
  }

  /**
   * Get applications submitted by logged-in merchant
   */
  async getMyApplications(req, res) {
    try {
      const applications = await HostApplication.find({ userId: req.user.uid }).sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: applications });
    } catch (error) {
      console.error('getMyApplications Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch host applications' });
    }
  }

  /**
   * Update details of an existing host application
   */
  async updateApplication(req, res) {
    const { applicationId } = req.params;
    const {
      outletName,
      outletDescription,
      doorNo,
      street,
      city,
      state,
      zipCode,
      contactPerson,
      phone,
      email
    } = req.body || {};

    if (
      !outletName ||
      !outletDescription ||
      !doorNo ||
      !street ||
      !city ||
      !state ||
      !zipCode ||
      !contactPerson ||
      !phone ||
      !email
    ) {
      return res.status(400).send({ success: false, message: 'All venue fields are required' });
    }

    try {
      const application = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!application) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      application.outletName = outletName;
      application.outletDescription = outletDescription;
      application.doorNo = doorNo;
      application.street = street;
      application.city = city;
      application.state = state;
      application.zipCode = zipCode;
      application.contactPerson = contactPerson;
      application.phone = phone;
      application.email = email;
      if (req.body.adMode !== undefined) application.adMode = req.body.adMode;
      if (req.body.allowOpenAds !== undefined) application.allowOpenAds = !!req.body.allowOpenAds;

      await application.save();

      // Notify connected tablet devices via WebSocket to update venue & menu details live
      if (global.deviceSockets) {
        const devices = await Device.find({ hostApplicationId: applicationId });
        for (const device of devices) {
          const socket = global.deviceSockets.get(device.deviceId);
          if (socket) {
            socket.send(JSON.stringify({ event: 'reload_menu' }));
            console.log(`[WS] Sent reload_menu signal to Device ${device.deviceId} for updated application details`);
          }
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Host application details updated successfully',
        data: application
      });
    } catch (error) {
      console.error('updateApplication Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update application details' });
    }
  }

  /**
   * Get restaurant menu (Merchant only)
   */
  async getMenu(req, res) {
    const { hostApplicationId } = req.query || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId query parameter is required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied: Host application does not belong to you' });
      }

      let menu = await Menu.findOne({ hostApplicationId });
      if (!menu) {
        // Return empty menu format if not initialized yet
        return res.status(200).send({
          success: true,
          data: {
            items: [],
            categories: ['Starters', 'Main Course', 'Dessert', 'Beverages'],
            hostApplicationId
          }
        });
      }
      return res.status(200).send({
        success: true,
        data: {
          _id: menu._id,
          hostApplicationId: menu.hostApplicationId,
          merchantId: menu.merchantId,
          items: menu.items,
          categories: menu.categories && menu.categories.length > 0 ? menu.categories : ['Starters', 'Main Course', 'Dessert', 'Beverages'],
          defaultGst: menu.defaultGst || 0,
          defaultOtherCharges: menu.defaultOtherCharges || 0,
          defaultOtherChargesType: menu.defaultOtherChargesType || 'percentage',
          createdAt: menu.createdAt,
          updatedAt: menu.updatedAt
        }
      });
    } catch (error) {
      console.error('getMenu Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch menu' });
    }
  }

  /**
   * Create or Update restaurant menu
   */
  async updateMenu(req, res) {
    const { 
      hostApplicationId, 
      items, 
      categories, 
      defaultGst, 
      defaultOtherCharges, 
      defaultOtherChargesType 
    } = req.body || {};

    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }

    if (!Array.isArray(items)) {
      return res.status(400).send({ success: false, message: 'Items must be an array' });
    }

    // Validate menu items
    for (const item of items) {
      if (!item.itemId || !item.name || item.price === undefined || !item.category) {
        return res.status(400).send({
          success: false,
          message: 'Each menu item must contain itemId, name, price (in paise), and category'
        });
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        return res.status(400).send({ success: false, message: 'Price must be a positive number in paise' });
      }
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied: Host application does not belong to you' });
      }

      const menu = await Menu.findOneAndUpdate(
        { hostApplicationId },
        { 
          merchantId: req.user.uid, 
          items, 
          categories, 
          defaultGst: defaultGst !== undefined ? Number(defaultGst) : undefined,
          defaultOtherCharges: defaultOtherCharges !== undefined ? Number(defaultOtherCharges) : undefined,
          defaultOtherChargesType: defaultOtherChargesType || undefined,
          updatedAt: Date.now() 
        },
        { upsert: true, new: true }
      );

      // Notify devices via WebSocket to reload menu
      if (global.deviceSockets) {
        const Device = require('../models/Device');
        const devices = await Device.find({ hostApplicationId });
        for (const device of devices) {
          const socket = global.deviceSockets.get(device.deviceId);
          if (socket) {
            socket.send(JSON.stringify({ event: 'reload_menu' }));
            console.log(`[WS] Sent reload_menu signal to Device ${device.deviceId}`);
          }
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Menu updated successfully',
        data: menu
      });
    } catch (error) {
      console.error('updateMenu Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update menu' });
    }
  }

  /**
   * Upload menu item image, optimize via sharp and save to disk
   */
  async uploadImage(req, res) {
    const fs = require('fs');
    const path = require('path');
    const sharp = require('sharp');
    const { v4: uuidv4 } = require('uuid');
    const config = require('../config/config');
    const { pipeline } = require('stream/promises');

    const filenameHeader = req.headers['x-filename'] || 'image.png';
    const ext = path.extname(filenameHeader).toLowerCase() || '.png';

    // Enforce image extensions
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.' });
    }

    const uniqueFilename = `menu_${uuidv4().replace(/-/g, '').slice(0, 16)}.webp`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'menu');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFilename);

    try {
      // Optimize and resize image using sharp
      const sharpStream = sharp()
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 });

      await pipeline(
        req.body,
        sharpStream,
        fs.createWriteStream(filePath)
      );

      const fileUrl = `/uploads/menu/${uniqueFilename}`;

      return res.status(200).send({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          filename: uniqueFilename,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error('uploadImage Error:', error.message);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('Failed to unlink corrupt file:', unlinkErr.message);
        }
      }
      return res.status(500).send({ success: false, message: 'Failed to upload and process image: ' + error.message });
    }
  }

  /**
   * Upload and decode QR Code from image stream in memory
   */
  async uploadQrCode(req, res) {
    try {
      const chunks = [];
      for await (const chunk of req.body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (!buffer || buffer.length === 0) {
        return res.status(400).send({ success: false, message: 'Empty image upload.' });
      }

      const sharp = require('sharp');
      const jsQR = require('jsqr');

      // Convert image to raw RGBA buffer for jsQR
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);

      if (!code || !code.data) {
        return res.status(400).send({
          success: false,
          message: 'Could not decode QR code. Please ensure the image is clear and contains a visible QR code.'
        });
      }

      const decodedText = code.data;
      if (!decodedText.startsWith('upi://pay')) {
        return res.status(400).send({
          success: false,
          message: 'This QR code does not contain a standard UPI payment URL.'
        });
      }

      // Parse UPI URL params
      const queryString = decodedText.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const pa = params.get('pa');
      const pn = params.get('pn');

      if (!pa) {
        return res.status(400).send({
          success: false,
          message: 'Invalid UPI QR: Missing merchant address (pa).'
        });
      }

      return res.status(200).send({
        success: true,
        message: 'QR Code successfully decrypted',
        data: {
          upiId: decodeURIComponent(pa),
          payeeName: pn ? decodeURIComponent(pn) : ''
        }
      });
    } catch (error) {
      console.error('uploadQrCode Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to process QR code image: ' + error.message });
    }
  }

  /**
   * Get devices provisioned for the logged-in merchant's approved applications
   */
  async getMyDevices(req, res) {
    try {
      const apps = await HostApplication.find({ userId: req.user.uid, status: 'approved' });
      const appIds = apps.map(app => app._id);

      const devices = await Device.find({ hostApplicationId: { $in: appIds } });
      return res.status(200).send({ success: true, data: devices });
    } catch (error) {
      console.error('getMyDevices Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch devices' });
    }
  }

  /**
   * Save UPI payment config for a venue
   */
  async savePaymentConfig(req, res) {
    const { hostApplicationId, upiId, payeeName } = req.body || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }
    if (!upiId || !upiId.includes('@')) {
      return res.status(400).send({ success: false, message: 'A valid UPI ID is required (e.g. merchant@okhdfcbank)' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied' });
      }

      app.upiId = upiId.trim();
      app.payeeName = payeeName ? payeeName.trim() : null;
      await app.save();

      return res.status(200).send({
        success: true,
        message: 'UPI payment configuration saved',
        data: { hostApplicationId, upiId: app.upiId, payeeName: app.payeeName }
      });
    } catch (error) {
      console.error('savePaymentConfig Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to save payment config' });
    }
  }

  /**
   * Get UPI payment config for a venue
   */
  async getPaymentConfig(req, res) {
    const { hostApplicationId } = req.query || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied' });
      }

      return res.status(200).send({
        success: true,
        data: {
          hasUpiId: !!app.upiId,
          upiId: app.upiId || '',
          payeeName: app.payeeName || ''
        }
      });
    } catch (error) {
      console.error('getPaymentConfig Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch payment config' });
    }
  }

  /**
   * Get all orders for merchant's venues (for payment tab)
   */
  async getMyOrders(req, res) {
    try {
      const apps = await HostApplication.find({ userId: req.user.uid, status: 'approved' });
      const appIds = apps.map(app => app._id);

      const orders = await Order.find({ hostApplicationId: { $in: appIds } })
        .sort({ createdAt: -1 })
        .limit(200);

      return res.status(200).send({ success: true, data: orders });
    } catch (error) {
      console.error('getMyOrders Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch orders' });
    }
  }

  /**
   * Admin updates order status
   */
  async updateOrderStatus(req, res) {
    const { orderId, orderStatus } = req.body || {};
    if (!orderId || !orderStatus) {
      return res.status(400).send({ success: false, message: 'orderId and orderStatus are required' });
    }

    const validStatuses = ['placed', 'confirmed', 'cooking', 'served', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).send({ success: false, message: 'Invalid orderStatus' });
    }

    try {
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const app = await HostApplication.findOne({ _id: order.hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      order.orderStatus = orderStatus;
      if (orderStatus === 'confirmed') {
        order.confirmedAt = new Date();
      }
      // If updating orderStatus, ensure table status stays active
      if (order.tableStatus === 'close_table' || order.tableStatus === 'completed') {
        order.tableStatus = 'active';
      }
      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: `Order status updated to ${orderStatus}`, data: order });
    } catch (error) {
      console.error('updateOrderStatus Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update order status' });
    }
  }

  /**
   * Admin confirms an order
   */
  async confirmOrder(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const app = await HostApplication.findOne({ _id: order.hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      order.orderStatus = 'confirmed';
      order.confirmedAt = new Date();
      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: 'Order confirmed', data: order });
    } catch (error) {
      console.error('confirmOrder Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to confirm order' });
    }
  }

  /**
   * Admin initiates close table — tablet will show QR code, ads will stop
   */
  async closeTable(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const app = await HostApplication.findOne({ _id: order.hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      const isEmpty = (!order.items || order.items.length === 0) && (order.totalAmount || 0) === 0;
      if (isEmpty) {
        order.tableStatus = 'completed';
        order.paymentStatus = 'completed';
        order.paidAt = new Date();
      } else {
        if (!app.upiId) {
          return res.status(400).send({ success: false, message: 'No UPI ID configured. Set up payment config first.' });
        }

        // Recalculate final totalAmount containing taxes before table closure
        const Menu = require('../models/Menu');
        const menu = await Menu.findOne({ hostApplicationId: order.hostApplicationId });
        if (menu) {
          let totalSubtotal = 0;
          let totalGst = 0;
          let totalOtherCharges = 0;

          const defaultGst = menu.defaultGst || 0;
          const defaultOtherCharges = menu.defaultOtherCharges || 0;
          const defaultOtherChargesType = menu.defaultOtherChargesType || 'percentage';

          for (const item of order.items) {
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

            totalSubtotal += itemSubtotal;
            totalGst += itemGst;
            totalOtherCharges += itemOther;
          }

          order.totalAmount = totalSubtotal + totalGst + totalOtherCharges;
        }

        order.tableStatus = 'close_table';
      }
      await order.save();
      notifyDeviceSessionUpdate(order);

      const message = isEmpty ? 'Session completed' : 'Table closed — showing payment QR to customer';
      return res.status(200).send({ success: true, message, data: order });
    } catch (error) {
      console.error('closeTable Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to close table' });
    }
  }

  /**
   * Admin marks payment as received — resets tablet to ad mode
   */
  async markPaymentReceived(req, res) {
    const { orderId, paymentType } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const app = await HostApplication.findOne({ _id: order.hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      order.tableStatus = 'completed';
      order.paymentStatus = 'completed';
      if (paymentType && ['CASH', 'UPI'].includes(String(paymentType).toUpperCase())) {
        order.paymentType = String(paymentType).toUpperCase();
      }
      order.paidAt = new Date();
      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: 'Payment received — session completed', data: order });
    } catch (error) {
      console.error('markPaymentReceived Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to mark payment received' });
    }
  }

  /**
   * Admin creates a Takeout / Pickup Order
   */
  async createTakeoutOrder(req, res) {
    const { hostApplicationId, items } = req.body || {};
    if (!hostApplicationId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({ success: false, message: 'hostApplicationId and items array are required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      const { v4: uuidv4 } = require('uuid');
      const orderId = `ORD_${uuidv4().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

      const totalPaise = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

      const order = new Order({
        orderId,
        merchantId: req.user.uid,
        hostApplicationId,
        deviceId: 'COUNTER_POS',
        tableNumber: 'TAKEOUT',
        items: items.map(item => ({
          itemId: String(item.itemId || item._id || uuidv4().slice(0, 8)),
          name: item.name,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0)
        })),
        totalAmount: totalPaise,
        orderType: 'TAKEOUT',
        paymentType: 'PENDING',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        tableStatus: 'active'
      });

      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(201).send({
        success: true,
        message: 'Pickup order created successfully',
        data: order
      });
    } catch (error) {
      console.error('createTakeoutOrder Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to create pickup order: ' + error.message });
    }
  }

  /**
   * Service waiter call - transitions waiterCallStatus to serviced
   */
  async serviceWaiter(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send({ success: false, message: 'Session/Order not found' });

      const app = await HostApplication.findOne({ _id: order.hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      order.waiterCallStatus = 'serviced';
      await order.save();
      notifyDeviceSessionUpdate(order);

      // Broadcast update to merchant WebSocket
      const wsClient = global.merchantSockets.get(app.userId.toString());
      if (wsClient) {
        wsClient.send(JSON.stringify({
          event: 'waiter_serviced',
          data: {
            orderId: order.orderId,
            waiterCallStatus: order.waiterCallStatus
          }
        }));
      }

      return res.status(200).send({ success: true, message: 'Waiter call marked as serviced', data: order });
    } catch (error) {
      console.error('serviceWaiter Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to service waiter request' });
    }
  }

  /**
   * Request more devices (screens and/or tabletops) for a venue
   */
  async requestMoreDevices(req, res) {
    const { hostApplicationId, requestTablet, tabletQuantity, requestScreen, screenQuantity } = req.body || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }

    const isRequestingTablet = !!requestTablet;
    const isRequestingScreen = !!requestScreen;

    if (!isRequestingTablet && !isRequestingScreen) {
      return res.status(400).send({ success: false, message: 'You must select at least one device type (Tablet or Screen)' });
    }

    let parsedTabletQty = 0;
    if (isRequestingTablet) {
      parsedTabletQty = parseInt(tabletQuantity, 10);
      if (isNaN(parsedTabletQty) || parsedTabletQty < 1) {
        return res.status(400).send({ success: false, message: 'Tablet quantity must be at least 1' });
      }
    }

    let parsedScreenQty = 0;
    if (isRequestingScreen) {
      parsedScreenQty = parseInt(screenQuantity, 10);
      if (isNaN(parsedScreenQty) || parsedScreenQty < 1) {
        return res.status(400).send({ success: false, message: 'Screen quantity must be at least 1' });
      }
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      const DeviceRequest = require('../models/DeviceRequest');
      const deviceReq = new DeviceRequest({
        hostApplicationId,
        userId: req.user.uid,
        requestTablet: isRequestingTablet,
        tabletQuantity: parsedTabletQty,
        requestScreen: isRequestingScreen,
        screenQuantity: parsedScreenQty
      });
      await deviceReq.save();

      if (global.broadcastToAdmins) {
        global.broadcastToAdmins('new_device_request', { outletName: app.outletName });
      }

      return res.status(200).send({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
      console.error('requestMoreDevices Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to submit device request' });
    }
  }

  /**
   * Verify merchant account password for security-sensitive actions (e.g. UPI payment config)
   */
  async verifyPassword(req, res) {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).send({ success: false, message: 'Password is required' });
    }

    try {
      const crypto = require('crypto');
      const User = require('../models/User');
      const user = await User.findById(req.user.uid);
      if (!user || !user.password) {
        return res.status(404).send({ success: false, message: 'User account not found' });
      }

      const [salt, originalHash] = user.password.split(':');
      if (!salt || !originalHash) {
        return res.status(400).send({ success: false, message: 'Invalid password format' });
      }

      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const isValid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));

      if (!isValid) {
        return res.status(401).send({ success: false, message: 'Incorrect account password' });
      }

      return res.status(200).send({ success: true, message: 'Password verified successfully' });
    } catch (error) {
      console.error('verifyPassword Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to verify password' });
    }
  }

  /**
   * Helper: Check and update 2:00 AM IST daily quota reset
   */
  async check2AMQuotaReset(hostApp) {
    if (!hostApp) return;
    const now = new Date();
    // Calculate IST time (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    // Calculate 2 AM IST today
    const istToday2AM = new Date(istNow);
    istToday2AM.setUTCHours(2, 0, 0, 0);

    let last2AMCutoff = istToday2AM;
    if (istNow < istToday2AM) {
      last2AMCutoff = new Date(istToday2AM.getTime() - 24 * 60 * 60 * 1000);
    }

    const lastReset = hostApp.lastQuotaResetDate ? new Date(hostApp.lastQuotaResetDate) : new Date(0);
    if (lastReset < last2AMCutoff) {
      const isClosed = hostApp.allowOpenAds === false || hostApp.adMode === 'closed';

      const defaultVideoChanges = hostApp.customDailyVideoQuota !== null && hostApp.customDailyVideoQuota !== undefined
        ? hostApp.customDailyVideoQuota
        : (isClosed ? 6 : 4);
      const defaultImageChanges = hostApp.customDailyImageQuota !== null && hostApp.customDailyImageQuota !== undefined
        ? hostApp.customDailyImageQuota
        : (isClosed ? 15 : 10);
      const defaultScreenVideoChanges = hostApp.customDailyScreenVideoQuota !== null && hostApp.customDailyScreenVideoQuota !== undefined
        ? hostApp.customDailyScreenVideoQuota
        : (isClosed ? 6 : 4);
      const defaultScreenImageChanges = hostApp.customDailyScreenImageQuota !== null && hostApp.customDailyScreenImageQuota !== undefined
        ? hostApp.customDailyScreenImageQuota
        : (isClosed ? 15 : 10);
      const defaultScreenChanges = hostApp.customDailyScreenQuota !== null && hostApp.customDailyScreenQuota !== undefined
        ? hostApp.customDailyScreenQuota
        : (isClosed ? 6 : 4);

      hostApp.dailyVideoChangesRemaining = defaultVideoChanges;
      hostApp.dailyImageChangesRemaining = defaultImageChanges;
      hostApp.dailyScreenVideoChangesRemaining = defaultScreenVideoChanges;
      hostApp.dailyScreenImageChangesRemaining = defaultScreenImageChanges;
      hostApp.dailyScreenChangesRemaining = defaultScreenChanges;
      hostApp.lastQuotaResetDate = now;
      await hostApp.save();
    }
  }

  /**
   * Fetch active venue promos and quota stats for merchant outlet
   */
  async getHostPromos(req, res) {
    const VenuePromo = require('../models/VenuePromo');
    const HostApplication = require('../models/HostApplication');
    const { hostApplicationId } = req.query || {};

    try {
      let hostApp = null;
      if (hostApplicationId) {
        hostApp = await HostApplication.findById(hostApplicationId);
      } else {
        hostApp = await HostApplication.findOne({ userId: req.user.uid, status: 'approved' });
      }

      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      await this.check2AMQuotaReset(hostApp);

      const promos = await VenuePromo.find({ hostApplicationId: hostApp._id }).sort({ slotType: 1, slotIndex: 1 });

      const isClosed = hostApp.allowOpenAds === false || hostApp.adMode === 'closed';

      // Tablet quotas (Open: 2 video slots / 4 daily, 3 image slots / 10 daily | Closed: 3 video slots / 6 daily, 8 image slots / 15 daily)
      const maxVideoSlots = hostApp.customMaxVideoSlots !== null && hostApp.customMaxVideoSlots !== undefined ? hostApp.customMaxVideoSlots : (isClosed ? 3 : 2);
      const maxImageSlots = hostApp.customMaxImageSlots !== null && hostApp.customMaxImageSlots !== undefined ? hostApp.customMaxImageSlots : (isClosed ? 8 : 3);

      const dailyVideoQuota = hostApp.customDailyVideoQuota !== null && hostApp.customDailyVideoQuota !== undefined ? hostApp.customDailyVideoQuota : (isClosed ? 6 : 4);
      const dailyImageQuota = hostApp.customDailyImageQuota !== null && hostApp.customDailyImageQuota !== undefined ? hostApp.customDailyImageQuota : (isClosed ? 15 : 10);

      // Screen quotas (Open: 2 video slots / 4 daily, 3 image slots / 10 daily | Closed: 3 video slots / 6 daily, 8 image slots / 15 daily)
      const maxScreenVideoSlots = hostApp.customMaxScreenVideoSlots !== null && hostApp.customMaxScreenVideoSlots !== undefined ? hostApp.customMaxScreenVideoSlots : (isClosed ? 3 : 2);
      const maxScreenImageSlots = hostApp.customMaxScreenImageSlots !== null && hostApp.customMaxScreenImageSlots !== undefined ? hostApp.customMaxScreenImageSlots : (isClosed ? 8 : 3);
      const maxScreenSlots = hostApp.customMaxScreenSlots !== null && hostApp.customMaxScreenSlots !== undefined ? hostApp.customMaxScreenSlots : (isClosed ? 8 : 3);

      const dailyScreenVideoQuota = hostApp.customDailyScreenVideoQuota !== null && hostApp.customDailyScreenVideoQuota !== undefined ? hostApp.customDailyScreenVideoQuota : (isClosed ? 6 : 4);
      const dailyScreenImageQuota = hostApp.customDailyScreenImageQuota !== null && hostApp.customDailyScreenImageQuota !== undefined ? hostApp.customDailyScreenImageQuota : (isClosed ? 15 : 10);
      const dailyScreenQuota = hostApp.customDailyScreenQuota !== null && hostApp.customDailyScreenQuota !== undefined ? hostApp.customDailyScreenQuota : (isClosed ? 6 : 4);

      const hasTabletVideos = promos.some(p => p.slotType === 'video' && p.mediaUrl);
      const hasTabletImages = promos.some(p => p.slotType === 'image' && p.mediaUrl);
      const hasScreenVideos = promos.some(p => (p.slotType === 'screen_video' || p.slotType === 'screen') && p.mediaType === 'video' && p.mediaUrl);
      const hasScreenImages = promos.some(p => (p.slotType === 'screen_image' || p.slotType === 'screen') && p.mediaType === 'image' && p.mediaUrl);

      let dailyVideoChangesRemaining = hostApp.dailyVideoChangesRemaining;
      if (!hasTabletVideos || dailyVideoChangesRemaining === undefined || dailyVideoChangesRemaining === null) {
        dailyVideoChangesRemaining = dailyVideoQuota;
      } else {
        dailyVideoChangesRemaining = Math.min(dailyVideoQuota, dailyVideoChangesRemaining);
      }

      let dailyImageChangesRemaining = hostApp.dailyImageChangesRemaining;
      if (!hasTabletImages || dailyImageChangesRemaining === undefined || dailyImageChangesRemaining === null) {
        dailyImageChangesRemaining = dailyImageQuota;
      } else {
        dailyImageChangesRemaining = Math.min(dailyImageQuota, dailyImageChangesRemaining);
      }

      let dailyScreenVideoChangesRemaining = hostApp.dailyScreenVideoChangesRemaining;
      if (!hasScreenVideos || dailyScreenVideoChangesRemaining === undefined || dailyScreenVideoChangesRemaining === null) {
        dailyScreenVideoChangesRemaining = dailyScreenVideoQuota;
      } else {
        dailyScreenVideoChangesRemaining = Math.min(dailyScreenVideoQuota, dailyScreenVideoChangesRemaining);
      }

      let dailyScreenImageChangesRemaining = hostApp.dailyScreenImageChangesRemaining;
      if (!hasScreenImages || dailyScreenImageChangesRemaining === undefined || dailyScreenImageChangesRemaining === null) {
        dailyScreenImageChangesRemaining = dailyScreenImageQuota;
      } else {
        dailyScreenImageChangesRemaining = Math.min(dailyScreenImageQuota, dailyScreenImageChangesRemaining);
      }

      let dailyScreenChangesRemaining = hostApp.dailyScreenChangesRemaining;
      if (dailyScreenChangesRemaining === undefined || dailyScreenChangesRemaining === null) {
        dailyScreenChangesRemaining = dailyScreenQuota;
      } else {
        dailyScreenChangesRemaining = Math.min(dailyScreenQuota, dailyScreenChangesRemaining);
      }

      return res.status(200).send({
        success: true,
        data: {
          promos,
          quotaStats: {
            maxVideoSlots,
            maxImageSlots,
            maxScreenVideoSlots,
            maxScreenImageSlots,
            maxScreenSlots,
            dailyVideoQuota,
            dailyImageQuota,
            dailyScreenVideoQuota,
            dailyScreenImageQuota,
            dailyScreenQuota,
            dailyVideoChangesRemaining,
            dailyImageChangesRemaining,
            dailyScreenVideoChangesRemaining,
            dailyScreenImageChangesRemaining,
            dailyScreenChangesRemaining,
            isPaused: !!hostApp.isPaused,
            isRevoked: !!hostApp.isRevoked
          }
        }
      });
    } catch (error) {
      console.error('getHostPromos Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch host promos' });
    }
  }

  /**
   * Upload host promo media file into isolated server/uploads/host_promos/[hostApplicationId]/
   */
  async uploadHostPromoMedia(req, res) {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const sharp = require('sharp');
    const ffmpeg = require('fluent-ffmpeg');
    const { pipeline } = require('stream/promises');
    const { v4: uuidv4 } = require('uuid');
    const HostApplication = require('../models/HostApplication');

    const hostApplicationId = req.headers['x-host-application-id'] || req.query.hostApplicationId;
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'Host application ID required' });
    }

    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      if (hostApp.isPaused || hostApp.isRevoked) {
        return res.status(403).send({ success: false, message: 'Account is paused or revoked by platform admin' });
      }

      const filenameHeader = req.headers['x-filename'] || 'file.mp4';
      const ext = path.extname(filenameHeader).toLowerCase() || '.mp4';
      const isVideo = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
      const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      if (!isVideo && !isImage) {
        return res.status(400).send({ success: false, message: 'Unsupported file format' });
      }

      const uploadsDir = path.join(__dirname, '..', 'uploads', 'host_promos', hostApplicationId.toString());
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      if (isImage) {
        const uniqueFilename = `promo_img_${uuidv4().replace(/-/g, '').slice(0, 16)}.webp`;
        const filePath = path.join(uploadsDir, uniqueFilename);

        const sharpStream = sharp().resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 });
        await pipeline(req.body, sharpStream, fs.createWriteStream(filePath));

        return res.status(200).send({
          success: true,
          data: {
            mediaUrl: `/uploads/host_promos/${hostApplicationId}/${uniqueFilename}`,
            mediaType: 'image',
            durationSeconds: 15
          }
        });
      } else {
        // Video upload with ffmpeg transcoding & temp file cleanup
        const uniqueFilename = `promo_vid_${uuidv4().replace(/-/g, '').slice(0, 16)}.mp4`;
        const filePath = path.join(uploadsDir, uniqueFilename);
        const tempPath = path.join(os.tmpdir(), `tmp-host-promo-${Date.now()}${ext}`);

        try {
          await pipeline(req.body, fs.createWriteStream(tempPath));

          // Transcode video using ffmpeg
          await new Promise((resolve, reject) => {
            ffmpeg(tempPath)
              .videoCodec('libx264')
              .outputOptions(['-profile:v baseline', '-level 3.1', '-pix_fmt yuv420p', '-movflags +faststart'])
              .audioCodec('aac')
              .audioChannels(2)
              .on('end', resolve)
              .on('error', reject)
              .save(filePath);
          });

          return res.status(200).send({
            success: true,
            data: {
              mediaUrl: `/uploads/host_promos/${hostApplicationId}/${uniqueFilename}`,
              mediaType: 'video',
              durationSeconds: 30
            }
          });
        } finally {
          // Strictly clean up temp file after transcoding
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('uploadHostPromoMedia Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to upload and process promo media' });
    }
  }

  /**
   * Stream Host Promos: Batch update slots, clean up old files, deduct quota & notify WebSocket
   */
  async streamHostPromos(req, res) {
    const fs = require('fs');
    const path = require('path');
    const VenuePromo = require('../models/VenuePromo');
    const HostApplication = require('../models/HostApplication');
    const { hostApplicationId, slots } = req.body || {};

    if (!hostApplicationId || !Array.isArray(slots)) {
      return res.status(400).send({ success: false, message: 'Invalid payload' });
    }

    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      if (hostApp.isPaused || hostApp.isRevoked) {
        return res.status(403).send({ success: false, message: 'Account is paused or revoked by admin' });
      }

      await this.check2AMQuotaReset(hostApp);

      const isClosed = hostApp.allowOpenAds === false || hostApp.adMode === 'closed';

      const defaultVideoQuota = hostApp.customDailyVideoQuota ?? (isClosed ? 6 : 4);
      const defaultImageQuota = hostApp.customDailyImageQuota ?? (isClosed ? 15 : 10);
      const defaultScreenVideoQuota = hostApp.customDailyScreenVideoQuota ?? (isClosed ? 6 : 4);
      const defaultScreenImageQuota = hostApp.customDailyScreenImageQuota ?? (isClosed ? 15 : 10);
      const defaultScreenQuota = hostApp.customDailyScreenQuota ?? (isClosed ? 6 : 4);

      if (hostApp.dailyVideoChangesRemaining === undefined || hostApp.dailyVideoChangesRemaining === null) {
        hostApp.dailyVideoChangesRemaining = defaultVideoQuota;
      }
      if (hostApp.dailyImageChangesRemaining === undefined || hostApp.dailyImageChangesRemaining === null) {
        hostApp.dailyImageChangesRemaining = defaultImageQuota;
      }
      if (hostApp.dailyScreenVideoChangesRemaining === undefined || hostApp.dailyScreenVideoChangesRemaining === null) {
        hostApp.dailyScreenVideoChangesRemaining = defaultScreenVideoQuota;
      }
      if (hostApp.dailyScreenImageChangesRemaining === undefined || hostApp.dailyScreenImageChangesRemaining === null) {
        hostApp.dailyScreenImageChangesRemaining = defaultScreenImageQuota;
      }
      if (hostApp.dailyScreenChangesRemaining === undefined || hostApp.dailyScreenChangesRemaining === null) {
        hostApp.dailyScreenChangesRemaining = defaultScreenQuota;
      }

      let videoChangesConsumed = 0;
      let imageChangesConsumed = 0;
      let screenVideoChangesConsumed = 0;
      let screenImageChangesConsumed = 0;
      let screenChangesConsumed = 0;

      for (const slot of slots) {
        const { slotType, slotIndex, title, mediaUrl, mediaType, isDeleted } = slot;

        const existingPromo = await VenuePromo.findOne({
          hostApplicationId: hostApp._id,
          slotType,
          slotIndex
        });

        if (isDeleted) {
          if (existingPromo) {
            // Delete physical file from disk
            if (existingPromo.mediaUrl && existingPromo.mediaUrl.startsWith('/uploads/host_promos/')) {
              const relPath = existingPromo.mediaUrl.replace('/uploads/host_promos/', '');
              const fullPath = path.join(__dirname, '..', 'uploads', 'host_promos', relPath);
              if (fs.existsSync(fullPath)) {
                try { fs.unlinkSync(fullPath); } catch (e) { console.error('Unlink error:', e.message); }
              }
            }
            await VenuePromo.deleteOne({ _id: existingPromo._id });
          }
          continue;
        }

        // If media changed, unlink old media file and deduct quota
        const isNewMedia = !existingPromo || existingPromo.mediaUrl !== mediaUrl;
        if (isNewMedia && mediaUrl) {
          if (slotType === 'video') {
            if (hostApp.dailyVideoChangesRemaining - videoChangesConsumed <= 0) {
              return res.status(429).send({ success: false, message: 'Daily tablet video change quota exhausted! Resets at 2:00 AM IST.' });
            }
            videoChangesConsumed++;
          } else if (slotType === 'screen_video') {
            if (hostApp.dailyScreenVideoChangesRemaining - screenVideoChangesConsumed <= 0) {
              return res.status(429).send({ success: false, message: 'Daily screen video change quota exhausted! Resets at 2:00 AM IST.' });
            }
            screenVideoChangesConsumed++;
          } else if (slotType === 'screen_image') {
            if (hostApp.dailyScreenImageChangesRemaining - screenImageChangesConsumed <= 0) {
              return res.status(429).send({ success: false, message: 'Daily screen image change quota exhausted! Resets at 2:00 AM IST.' });
            }
            screenImageChangesConsumed++;
          } else if (slotType === 'screen') {
            if (hostApp.dailyScreenChangesRemaining - screenChangesConsumed <= 0) {
              return res.status(429).send({ success: false, message: 'Daily screen ad change quota exhausted! Resets at 2:00 AM IST.' });
            }
            screenChangesConsumed++;
          } else {
            if (hostApp.dailyImageChangesRemaining - imageChangesConsumed <= 0) {
              return res.status(429).send({ success: false, message: 'Daily tablet image change quota exhausted! Resets at 2:00 AM IST.' });
            }
            imageChangesConsumed++;
          }

          if (existingPromo && existingPromo.mediaUrl && existingPromo.mediaUrl.startsWith('/uploads/host_promos/')) {
            const relPath = existingPromo.mediaUrl.replace('/uploads/host_promos/', '');
            const fullPath = path.join(__dirname, '..', 'uploads', 'host_promos', relPath);
            if (fs.existsSync(fullPath)) {
              try { fs.unlinkSync(fullPath); } catch (e) { console.error('Unlink error:', e.message); }
            }
          }

          if (existingPromo) {
            existingPromo.mediaUrl = mediaUrl;
            existingPromo.mediaType = mediaType;
            existingPromo.title = title || '';
            existingPromo.isStreaming = true;
            await existingPromo.save();
          } else {
            await VenuePromo.create({
              hostApplicationId: hostApp._id,
              slotType,
              slotIndex,
              title: title || '',
              mediaUrl,
              mediaType,
              isStreaming: true
            });
          }
        } else if (existingPromo) {
          existingPromo.title = title || '';
          await existingPromo.save();
        }
      }

      // Deduct consumed daily quota
      hostApp.dailyVideoChangesRemaining = Math.max(0, hostApp.dailyVideoChangesRemaining - videoChangesConsumed);
      hostApp.dailyImageChangesRemaining = Math.max(0, hostApp.dailyImageChangesRemaining - imageChangesConsumed);
      hostApp.dailyScreenVideoChangesRemaining = Math.max(0, hostApp.dailyScreenVideoChangesRemaining - screenVideoChangesConsumed);
      hostApp.dailyScreenImageChangesRemaining = Math.max(0, hostApp.dailyScreenImageChangesRemaining - screenImageChangesConsumed);
      hostApp.dailyScreenChangesRemaining = Math.max(0, hostApp.dailyScreenChangesRemaining - screenChangesConsumed);
      await hostApp.save();

      // Emit WebSocket push signal to connected venue devices
      if (global.deviceSockets) {
        const payload = JSON.stringify({ event: 'reload_promos', hostApplicationId: hostApp._id.toString() });
        for (const [deviceId, socket] of global.deviceSockets.entries()) {
          try { socket.send(payload); } catch (e) {}
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Venue promos updated and streaming on devices!',
        data: {
          dailyVideoChangesRemaining: hostApp.dailyVideoChangesRemaining,
          dailyImageChangesRemaining: hostApp.dailyImageChangesRemaining
        }
      });
    } catch (error) {
      console.error('streamHostPromos Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to stream venue promos' });
    }
  }

  /**
   * Delete a specific promo slot and unlink its file
   */
  async deleteHostPromoSlot(req, res) {
    const fs = require('fs');
    const path = require('path');
    const VenuePromo = require('../models/VenuePromo');
    const HostApplication = require('../models/HostApplication');
    const { hostApplicationId, slotType, slotIndex } = req.body || {};

    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      const existingPromo = await VenuePromo.findOne({ hostApplicationId: hostApp._id, slotType, slotIndex });
      if (existingPromo) {
        if (existingPromo.mediaUrl && existingPromo.mediaUrl.startsWith('/uploads/host_promos/')) {
          const relPath = existingPromo.mediaUrl.replace('/uploads/host_promos/', '');
          const fullPath = path.join(__dirname, '..', 'uploads', 'host_promos', relPath);
          if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (e) {}
          }
        }
        await VenuePromo.deleteOne({ _id: existingPromo._id });
      }

      return res.status(200).send({ success: true, message: 'Promo slot cleared and file unlinked' });
    } catch (error) {
      console.error('deleteHostPromoSlot Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to delete promo slot' });
    }
  }
  /**
   * Get Venue Analytics (Food sales by time slot, revenue, table frequency)
   */
  async getVenueAnalytics(req, res) {
    try {
      const daysParam = req.query.days;
      const days = parseInt(daysParam || '0', 10);
      const hostApp = await HostApplication.findOne({ userId: req.user.uid });
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host venue application not found' });
      }

      let startDate = new Date();
      if (days === 0) {
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(startDate.getDate() - days);
      }

      // Fetch all non-cancelled orders for this host venue within date range
      const orders = await Order.find({
        hostApplicationId: hostApp._id,
        createdAt: { $gte: startDate }
      });

      // Fetch Menu to get item names and prices
      const menu = await Menu.findOne({ hostApplicationId: hostApp._id });
      const menuItemsMap = {};
      if (menu && menu.items) {
        menu.items.forEach(item => {
          menuItemsMap[item.itemId] = {
            name: item.name,
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl || ''
          };
        });
      }

      let totalRevenuePaise = 0;
      let totalCompletedOrders = 0;

      // Aggregators
      const slotSales = {
        all: { itemCounts: {}, totalRevenue: 0, orderCount: 0 },
        breakfast: { itemCounts: {}, totalRevenue: 0, orderCount: 0 }, // 8am - 12pm (8..11)
        lunch: { itemCounts: {}, totalRevenue: 0, orderCount: 0 },     // 1pm - 4pm (13..15)
        dinner: { itemCounts: {}, totalRevenue: 0, orderCount: 0 }     // 5pm - 11pm (17..22)
      };

      const tableFrequency = {};

      orders.forEach(order => {
        if (order.tableStatus === 'cancelled') return;

        totalRevenuePaise += (order.totalAmount || 0);
        totalCompletedOrders += 1;

        // Table tracking
        const tbl = order.tableNumber || 'Table N/A';
        if (!tableFrequency[tbl]) {
          tableFrequency[tbl] = { tableNumber: tbl, orderCount: 0, totalAmount: 0 };
        }
        tableFrequency[tbl].orderCount += 1;
        tableFrequency[tbl].totalAmount += (order.totalAmount || 0);

        // Determine Time-of-day slot based on local order hour
        const orderHour = new Date(order.createdAt).getHours();
        let slotKey = null;
        if (orderHour >= 8 && orderHour < 12) {
          slotKey = 'breakfast';
        } else if (orderHour >= 13 && orderHour < 16) {
          slotKey = 'lunch';
        } else if (orderHour >= 17 && orderHour < 23) {
          slotKey = 'dinner';
        }

        // Process order items
        if (order.items && order.items.length > 0) {
          order.items.forEach(it => {
            const itemId = it.itemId;
            const qty = it.quantity || 1;
            const itemPricePaise = it.price || (menuItemsMap[itemId]?.price) || 0;
            const itemRev = itemPricePaise * qty;

            // Increment ALL
            if (!slotSales.all.itemCounts[itemId]) {
              slotSales.all.itemCounts[itemId] = { itemId, name: it.name || menuItemsMap[itemId]?.name || itemId, qty: 0, revenuePaise: 0, imageUrl: menuItemsMap[itemId]?.imageUrl || '' };
            }
            slotSales.all.itemCounts[itemId].qty += qty;
            slotSales.all.itemCounts[itemId].revenuePaise += itemRev;
            slotSales.all.totalRevenue += itemRev;

            // Increment Specific Slot if matched
            if (slotKey) {
              if (!slotSales[slotKey].itemCounts[itemId]) {
                slotSales[slotKey].itemCounts[itemId] = { itemId, name: it.name || menuItemsMap[itemId]?.name || itemId, qty: 0, revenuePaise: 0, imageUrl: menuItemsMap[itemId]?.imageUrl || '' };
              }
              slotSales[slotKey].itemCounts[itemId].qty += qty;
              slotSales[slotKey].itemCounts[itemId].revenuePaise += itemRev;
              slotSales[slotKey].totalRevenue += itemRev;
            }
          });
        }
        if (slotKey) {
          slotSales[slotKey].orderCount += 1;
        }
        slotSales.all.orderCount += 1;
      });

      // Helper to process top items for a slot
      const formatSlotData = (slotObj) => {
        const itemsArr = Object.values(slotObj.itemCounts);
        itemsArr.sort((a, b) => b.qty - a.qty);
        const topSeller = itemsArr[0] || null;
        const maxQty = topSeller ? topSeller.qty : 1;

        const rankedItems = itemsArr.slice(0, 3).map(item => ({
          ...item,
          percentageShare: Math.round((item.qty / maxQty) * 100)
        }));

        return {
          totalRevenuePaise: slotObj.totalRevenue,
          orderCount: slotObj.orderCount,
          topSeller,
          rankedItems
        };
      };

      // Find Peak Revenue Slot (Strict check: return '--' if zero orders/revenue)
      let peakSlotName = '--';
      let maxSlotRev = 0;

      if (totalCompletedOrders > 0 && totalRevenuePaise > 0) {
        if (slotSales.breakfast.totalRevenue > maxSlotRev) {
          peakSlotName = 'Breakfast';
          maxSlotRev = slotSales.breakfast.totalRevenue;
        }
        if (slotSales.lunch.totalRevenue > maxSlotRev) {
          peakSlotName = 'Lunch';
          maxSlotRev = slotSales.lunch.totalRevenue;
        }
        if (slotSales.dinner.totalRevenue > maxSlotRev) {
          peakSlotName = 'Dinner';
          maxSlotRev = slotSales.dinner.totalRevenue;
        }
      }

      // Process Tables Frequency
      const tablesArr = Object.values(tableFrequency);
      tablesArr.sort((a, b) => b.orderCount - a.orderCount);

      const mostActiveTable = tablesArr[0] || null;
      const leastActiveTable = tablesArr.length > 1 ? tablesArr[tablesArr.length - 1] : null;

      return res.status(200).send({
        success: true,
        data: {
          days,
          venueName: hostApp.outletName,
          summary: {
            totalRevenuePaise,
            totalCompletedOrders,
            avgOrderValuePaise: totalCompletedOrders > 0 ? Math.round(totalRevenuePaise / totalCompletedOrders) : 0,
            peakSlotName
          },
          slots: {
            all: formatSlotData(slotSales.all),
            breakfast: formatSlotData(slotSales.breakfast),
            lunch: formatSlotData(slotSales.lunch),
            dinner: formatSlotData(slotSales.dinner)
          },
          tables: {
            mostActiveTable,
            leastActiveTable,
            totalActiveTables: tablesArr.length
          }
        }
      });
    } catch (error) {
      console.error('getVenueAnalytics Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to generate venue analytics' });
    }
  }

  /**
   * Get modular bill config for venue
   */
  async getBillConfig(req, res) {
    const { applicationId } = req.params;
    try {
      const hostApp = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }
      return res.status(200).send({
        success: true,
        data: hostApp.billConfig || {}
      });
    } catch (error) {
      console.error('getBillConfig Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch bill config' });
    }
  }

  /**
   * Update modular bill config for venue
   */
  async updateBillConfig(req, res) {
    const { applicationId } = req.params;
    const billConfigData = req.body || {};

    try {
      const hostApp = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      hostApp.billConfig = {
        ...(hostApp.billConfig ? hostApp.billConfig.toObject() : {}),
        ...billConfigData
      };

      await hostApp.save();

      return res.status(200).send({
        success: true,
        message: 'Bill configuration saved successfully',
        data: hostApp.billConfig
      });
    } catch (error) {
      console.error('updateBillConfig Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to update bill config' });
    }
  }

  /**
   * Upload bill image (logo or QR code image)
   */
  async uploadBillImage(req, res) {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    const { pipeline } = require('stream/promises');

    const filenameHeader = req.headers['x-filename'] || 'bill_image.png';
    const ext = path.extname(filenameHeader).toLowerCase() || '.png';

    if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, WEBP, and SVG are allowed.' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads', 'bills');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFilename = `bill_${uuidv4().replace(/-/g, '').slice(0, 16)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    try {
      if (Buffer.isBuffer(req.body)) {
        fs.writeFileSync(filePath, req.body);
      } else if (req.body && typeof req.body.pipe === 'function') {
        await pipeline(req.body, fs.createWriteStream(filePath));
      } else if (req.body && typeof req.body[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const chunk of req.body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
      } else {
        return res.status(400).send({ success: false, message: 'Invalid or empty image payload' });
      }

      const fileUrl = `/uploads/bills/${uniqueFilename}`;
      return res.status(200).send({
        success: true,
        message: 'Image uploaded successfully',
        url: fileUrl
      });
    } catch (error) {
      console.error('uploadBillImage Error:', error.message);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      return res.status(500).send({ success: false, message: 'Failed to upload bill image: ' + error.message });
    }
  }
}

module.exports = new HostController();
