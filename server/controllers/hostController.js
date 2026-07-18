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
        status: 'pending'
      });

      await application.save();

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
    const { orderId } = req.body || {};
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
   * Request more devices (screens / tabletops) for a venue
   */
  async requestMoreDevices(req, res) {
    const { hostApplicationId, deviceType, quantity } = req.body || {};
    if (!hostApplicationId || !deviceType || !quantity) {
      return res.status(400).send({ success: false, message: 'hostApplicationId, deviceType, and quantity are required' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).send({ success: false, message: 'Quantity must be a positive number' });
    }

    if (deviceType !== 'screen' && deviceType !== 'tabletop') {
      return res.status(400).send({ success: false, message: 'Device type must be screen or tabletop' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      const DeviceRequest = require('../models/DeviceRequest');
      const deviceReq = new DeviceRequest({
        hostApplicationId,
        userId: req.user.uid,
        deviceType,
        quantity: qty
      });
      await deviceReq.save();

      return res.status(200).send({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
      console.error('requestMoreDevices Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to submit device request' });
    }
  }
}

module.exports = new HostController();
