const HostApplication = require('../models/HostApplication');
const Menu = require('../models/Menu');

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
      deviceType,
      quantity
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
      !email ||
      !deviceType ||
      !quantity
    ) {
      return res.status(400).send({ success: false, message: 'All form fields are required' });
    }

    if (!['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({ success: false, message: 'Invalid device type. Must be tablet or screen' });
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      return res.status(400).send({ success: false, message: 'Quantity must be at least 1' });
    }

    try {
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
        deviceType,
        quantity: parsedQty,
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
    try {
      let menu = await Menu.findOne({ merchantId: req.user.uid });
      if (!menu) {
        // Return empty menu format if not initialized yet
        return res.status(200).send({ success: true, data: { items: [] } });
      }
      return res.status(200).send({ success: true, data: menu });
    } catch (error) {
      console.error('getMenu Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch menu' });
    }
  }

  /**
   * Create or Update restaurant menu
   */
  async updateMenu(req, res) {
    const { items } = req.body || {};

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
      const menu = await Menu.findOneAndUpdate(
        { merchantId: req.user.uid },
        { items, updatedAt: Date.now() },
        { upsert: true, new: true }
      );

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
}

module.exports = new HostController();
