const HostApplication = require('../models/HostApplication');
const AdsRates = require('../models/AdsRates');
const AdBooking = require('../models/AdBooking');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Order = require('../models/Order');
const phonePeService = require('../services/phonePeService');
const { v4: uuidv4 } = require('uuid');

class AdController {
  /**
   * Get unique states with approved host outlets
   */
  async getStates(req, res) {
    try {
      const states = await HostApplication.distinct('state', { status: 'approved' });
      return res.status(200).send({ success: true, data: states });
    } catch (error) {
      console.error('getStates Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch states' });
    }
  }

  /**
   * Get unique cities inside a state with approved host outlets
   */
  async getCities(req, res) {
    const { state } = req.query || {};
    if (!state) {
      return res.status(400).send({ success: false, message: 'State parameter is required' });
    }

    try {
      const cities = await HostApplication.distinct('city', { state, status: 'approved' });
      return res.status(200).send({ success: true, data: cities });
    } catch (error) {
      console.error('getCities Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch cities' });
    }
  }

  /**
   * Get approved host outlets inside a city/state
   */
  async getOutlets(req, res) {
    const { state, city } = req.query || {};
    if (!state || !city) {
      return res.status(400).send({ success: false, message: 'State and city parameters are required' });
    }

    try {
      const outlets = await HostApplication.find(
        { state, city, status: 'approved' },
        'outletName outletDescription doorNo street city state zipCode deviceType quantity'
      );
      return res.status(200).send({ success: true, data: outlets });
    } catch (error) {
      console.error('getOutlets Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch outlets' });
    }
  }

  /**
   * Fetch current ad rates
   */
  async getRates(req, res) {
    const { deviceType } = req.query || {};
    const query = {};
    if (deviceType) {
      query.deviceType = deviceType;
    }

    try {
      const rates = await AdsRates.find(query).sort({ deviceType: 1, durationDays: 1 });
      return res.status(200).send({ success: true, data: rates });
    } catch (error) {
      console.error('getRates Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch rates' });
    }
  }

  /**
   * Initiate an Ad Booking and get PhonePe Checkout URL
   */
  async bookAd(req, res) {
    const {
      outletId,
      deviceType,
      quantity,
      adDurationDays,
      frequency,
      mediaUrl,
      redirectUrl
    } = req.body || {};

    if (!outletId || !deviceType || !quantity || !adDurationDays || !frequency || !mediaUrl || !redirectUrl) {
      return res.status(400).send({ success: false, message: 'All booking fields and redirectUrl are required' });
    }

    try {
      // Find outlet
      const outlet = await HostApplication.findById(outletId);
      if (!outlet || outlet.status !== 'approved') {
        return res.status(400).send({ success: false, message: 'Selected outlet is not approved or not found' });
      }

      if (outlet.deviceType !== deviceType) {
        return res.status(400).send({ 
          success: false, 
          message: `Outlet device type mismatch. Outlet supports: ${outlet.deviceType}` 
        });
      }

      const bookingQty = parseInt(quantity, 10);
      if (bookingQty > outlet.quantity) {
        return res.status(400).send({ 
          success: false, 
          message: `Requested quantity exceeds outlet availability (${outlet.quantity})` 
        });
      }

      // Fetch rates
      const rate = await AdsRates.findOne({
        deviceType,
        durationDays: parseInt(adDurationDays, 10),
        frequency
      });

      if (!rate) {
        return res.status(400).send({ 
          success: false, 
          message: 'No active pricing rate plan found for this duration and frequency combination' 
        });
      }

      const totalAmount = rate.amount * bookingQty; // amount is in paise

      // Create transaction record
      const transactionId = `TXN_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const orderId = `ORD_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

      const phonePeTxn = new PhonePeTransaction({
        transactionId,
        orderId,
        userId: req.user.uid,
        amount: totalAmount,
        transactionType: 'payment',
        status: 'pending'
      });
      await phonePeTxn.save();

      // Create Ad Booking record
      const bookingId = `B_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const booking = new AdBooking({
        bookingId,
        advertiserId: req.user.uid,
        state: outlet.state,
        city: outlet.city,
        outletId: outlet._id,
        deviceType,
        quantity: bookingQty,
        adDurationDays: parseInt(adDurationDays, 10),
        frequency,
        amount: totalAmount,
        mediaUrl,
        paymentStatus: 'pending',
        approvalStatus: 'pending',
        transactionId
      });
      await booking.save();

      // Call PhonePe Checkout page
      const initiateResult = await phonePeService.initiatePayment({
        transactionId,
        userId: req.user.uid,
        amount: totalAmount,
        redirectUrl: redirectUrl,
        phone: req.user.phone
      });

      return res.status(200).send({
        success: true,
        message: 'Ad booking initiated. Redirect to payment gateway',
        data: {
          bookingId,
          transactionId,
          paymentUrl: initiateResult.paymentUrl
        }
      });
    } catch (error) {
      console.error('bookAd Error:', error.message);
      return res.status(500).send({ success: false, message: error.message || 'Ad booking placement failed' });
    }
  }

  /**
   * PhonePe Payment Webhook Callback (POST)
   */
  async paymentCallback(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(400).send({ success: false, message: 'Authorization header missing' });
    }

    try {
      // Verify Basic Auth Credentials
      const isAuthentic = phonePeService.verifyWebhook(authHeader);
      if (!isAuthentic) {
        return res.status(401).send({ success: false, message: 'Webhook Basic Auth verification failed' });
      }

      // In V2, payload is sent as direct JSON in body
      const decodedPayload = req.body;
      console.log('[PhonePe V2 Webhook Received]:', decodedPayload);

      if (!decodedPayload || !decodedPayload.data) {
        return res.status(400).send({ success: false, message: 'Invalid callback payload structure' });
      }

      const { success, code, data } = decodedPayload;
      const { merchantTransactionId, amount } = data;

      // Find transaction ledger
      const txn = await PhonePeTransaction.findOne({ transactionId: merchantTransactionId });
      if (!txn) {
        return res.status(404).send({ success: false, message: 'Transaction record not found' });
      }

      if (txn.status !== 'pending') {
        // Idempotency: webhook already processed
        return res.status(200).send({ success: true, message: 'Already processed' });
      }

      // Cross-check amounts
      if (txn.amount !== amount) {
        console.warn(`[WARNING] Webhook amount mismatch for ${merchantTransactionId}. Expected ${txn.amount}, received ${amount}`);
        txn.status = 'failed';
        txn.responseCode = 'AMOUNT_MISMATCH';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        await AdBooking.updateOne({ transactionId: merchantTransactionId }, { paymentStatus: 'failed' });
        await Order.updateOne({ transactionId: merchantTransactionId }, { paymentStatus: 'failed' });
        
        return res.status(200).send({ success: true, message: 'Amount mismatch handled' });
      }

      if (success && code === 'PAYMENT_SUCCESS') {
        txn.status = 'completed';
        txn.responseCode = code;
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        // Update corresponding AdBooking
        await AdBooking.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'completed', approvalStatus: 'pending' }
        );

        // Update corresponding Order (if it was a kiosk customer order)
        await Order.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'completed' }
        );

      } else {
        txn.status = 'failed';
        txn.responseCode = code || 'PAYMENT_ERROR';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        await AdBooking.updateOne({ transactionId: merchantTransactionId }, { paymentStatus: 'failed' });
        await Order.updateOne({ transactionId: merchantTransactionId }, { paymentStatus: 'failed' });
      }

      return res.status(200).send({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('paymentCallback Error:', error.message);
      return res.status(500).send({ success: false, message: 'Internal server error processing callback' });
    }
  }

  /**
   * Get list of ad campaigns booked by advertiser
   */
  async getMyBookings(req, res) {
    try {
      const bookings = await AdBooking.find({ advertiserId: req.user.uid })
        .populate('outletId', 'outletName city state')
        .sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: bookings });
    } catch (error) {
      console.error('getMyBookings Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch bookings' });
    }
  }
}

module.exports = new AdController();
