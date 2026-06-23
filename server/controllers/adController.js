const HostApplication = require('../models/HostApplication');
const AdsRates = require('../models/AdsRates');
const AdBooking = require('../models/AdBooking');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Order = require('../models/Order');
const phonePeService = require('../services/phonePeService');
const config = require('../config/config');
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

      // Generate IDs first
      const transactionId = `TXN_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const orderId = `ORD_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const bookingId = `B_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

      // Construct redirect URL with verifyBookingId parameter
      const finalRedirectUrl = redirectUrl.includes('?')
        ? `${redirectUrl}&verifyBookingId=${bookingId}`
        : `${redirectUrl}?verifyBookingId=${bookingId}`;

      // 1. Call PhonePe Checkout page first
      const initiateResult = await phonePeService.initiatePayment({
        transactionId,
        userId: req.user.uid,
        amount: totalAmount,
        redirectUrl: finalRedirectUrl,
        phone: req.user.phone
      });

      // 2. Save PhonePe transaction record
      const phonePeTxn = new PhonePeTransaction({
        transactionId,
        orderId,
        userId: req.user.uid,
        amount: totalAmount,
        transactionType: 'payment',
        status: 'pending'
      });
      await phonePeTxn.save();

      // 3. Create Ad Booking record
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
        transactionId,
        orderId
      });
      await booking.save();

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

        // Extract paymentId from callback payload
        const paymentId = decodedPayload.data?.transactionId || decodedPayload.data?.providerReferenceId || null;

        // Update corresponding AdBooking
        await AdBooking.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'completed', approvalStatus: 'pending', paymentId }
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

  /**
   * Upload video raw binary payload and save to local disk
   */
  async uploadVideo(req, res) {
    const fs = require('fs');
    const path = require('path');
    
    // Check if body is buffer
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).send({ success: false, message: 'Invalid file payload. Expected raw binary buffer.' });
    }

    try {
      const filenameHeader = req.headers['x-filename'] || 'video.mp4';
      const ext = path.extname(filenameHeader).toLowerCase() || '.mp4';
      
      // Enforce file extension to only support mp4, webm
      if (!['.mp4', '.webm'].includes(ext)) {
        return res.status(400).send({ success: false, message: 'Unsupported file type. Only MP4 and WEBM are allowed.' });
      }

      // Route to tablet or screen subfolder under ads/
      const deviceType = req.query.deviceType || 'tablet';
      const targetSubdir = ['tablet', 'screen'].includes(deviceType) ? deviceType : 'tablet';

      const uniqueFilename = `vid_${uuidv4().replace(/-/g, '').slice(0, 16)}${ext}`;
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'ads', targetSubdir);
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, uniqueFilename);
      fs.writeFileSync(filePath, req.body);

      // Return local server URL
      const fileUrl = `http://localhost:${config.port || 8080}/uploads/ads/${targetSubdir}/${uniqueFilename}`;

      return res.status(200).send({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          filename: uniqueFilename,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error('uploadVideo Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to upload video due to server error' });
    }
  }

  /**
   * Manually trigger PhonePe status query to verify and update booking payment status
   */
  async verifyPayment(req, res) {
    const { bookingId } = req.params || {};
    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'bookingId parameter is required' });
    }

    try {
      // Find booking
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      if (booking.paymentStatus === 'completed') {
        return res.status(200).send({ 
          success: true, 
          message: 'Payment already completed', 
          data: { paymentStatus: 'completed', approvalStatus: booking.approvalStatus } 
        });
      }

      // Check with PhonePe status check
      let mappedStatus = 'PENDING';
      let checkResult = { status: 'PENDING', code: 'PAYMENT_PENDING', raw: null };
      try {
        checkResult = await phonePeService.checkTransactionStatus(booking.transactionId);
        mappedStatus = checkResult.status; // COMPLETED, FAILED, PENDING
        
        console.log(`[PhonePe Status Check for ${booking.bookingId}]:`, checkResult);

        // Fallback for local testing or demo mode:
        if (config.demoMode && (mappedStatus === 'FAILED' || checkResult.code === 'TRANSACTION_NOT_FOUND')) {
          mappedStatus = 'COMPLETED';
          checkResult.code = 'PAYMENT_SUCCESS';
        }
      } catch (err) {
        console.error('PhonePe Check Error, falling back to manual complete in demo mode:', err.message);
        if (config.demoMode) {
          mappedStatus = 'COMPLETED';
          checkResult.code = 'PAYMENT_SUCCESS';
        } else {
          return res.status(500).send({ success: false, message: 'Failed to verify payment with gateway: ' + err.message });
        }
      }

      if (mappedStatus === 'COMPLETED') {
        // Update transaction status ledger
        await PhonePeTransaction.updateOne(
          { transactionId: booking.transactionId },
          { 
            status: 'completed',
            responseCode: checkResult.code || 'PAYMENT_SUCCESS',
            rawCallbackPayload: checkResult.raw || { demoMode: true }
          }
        );

        // Update corresponding AdBooking
        booking.paymentStatus = 'completed';
        booking.approvalStatus = 'pending';
        
        // Extract paymentId from status check result
        const paymentId = checkResult.raw?.payload?.transactionId || checkResult.raw?.payload?.providerReferenceId || 'PAY_MOCK_' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
        booking.paymentId = paymentId;
        await booking.save();

        return res.status(200).send({
          success: true,
          message: 'Payment verified successfully and marked as completed.',
          data: { paymentStatus: 'completed', approvalStatus: 'pending' }
        });
      } else if (mappedStatus === 'FAILED') {
        await PhonePeTransaction.updateOne(
          { transactionId: booking.transactionId },
          { status: 'failed' }
        );

        booking.paymentStatus = 'failed';
        await booking.save();

        return res.status(200).send({
          success: true,
          message: 'Payment verification failed. Transaction was marked as failed.',
          data: { paymentStatus: 'failed', approvalStatus: booking.approvalStatus }
        });
      } else {
        return res.status(200).send({
          success: true,
          message: 'Payment is still pending verification.',
          data: { paymentStatus: 'pending', approvalStatus: booking.approvalStatus }
        });
      }
    } catch (error) {
      console.error('verifyPayment Error:', error.message);
      return res.status(500).send({ success: false, message: 'Internal server error during verification' });
    }
  }
}

module.exports = new AdController();
