const HostApplication = require('../models/HostApplication');
const AdsRates = require('../models/AdsRates');
const AdBooking = require('../models/AdBooking');
const PhonePeTransaction = require('../models/PhonePeTransaction');
const Order = require('../models/Order');
const phonePeService = require('../services/phonePeService');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');

const resolveMediaUrl = (mediaUrl, host) => {
  if (!mediaUrl) return '';
  if (mediaUrl.includes('/uploads/')) {
    const parts = mediaUrl.split('/uploads/');
    return `http://${host}/uploads/${parts[1]}`;
  }
  if (mediaUrl.startsWith('http')) return mediaUrl;
  const cleanUrl = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
  return `http://${host}${cleanUrl}`;
};

const deleteMediaFile = (mediaUrl) => {
  if (!mediaUrl) return;
  const fs = require('fs');
  const path = require('path');
  const urlParts = mediaUrl.split('/uploads/');
  if (urlParts.length > 1) {
    const relativePath = urlParts[1];
    const localFilePath = path.join(__dirname, '..', 'uploads', relativePath);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`[Media Cleanup] Successfully deleted failed payment media: ${localFilePath}`);
      } catch (err) {
        console.error('[Media Cleanup] Failed to delete media file:', err.message);
      }
    }
  }
};

const pollTransactionStatus = (bookingId, transactionId) => {
  let attempts = 0;
  const maxAttempts = 15; // 15 attempts * 10 seconds = 150 seconds (2.5 min) total
  const interval = setInterval(async () => {
    attempts++;
    console.log(`[Auto-Polling] Checking status for booking ${bookingId} (Attempt ${attempts}/${maxAttempts})...`);
    try {
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking || booking.paymentStatus !== 'pending') {
        console.log(`[Auto-Polling] Polling stopped for booking ${bookingId}. Status is already ${booking?.paymentStatus || 'unknown'}`);
        clearInterval(interval);
        return;
      }

      const checkResult = await phonePeService.checkTransactionStatus(transactionId);
      const mappedStatus = checkResult.status; // COMPLETED, FAILED, PENDING

      if (mappedStatus === 'COMPLETED') {
        console.log(`[Auto-Polling] Booking ${bookingId} payment COMPLETED`);
        await PhonePeTransaction.updateOne(
          { transactionId },
          { 
            status: 'completed',
            responseCode: checkResult.code || 'PAYMENT_SUCCESS',
            rawCallbackPayload: checkResult.raw || { autoPolled: true }
          }
        );
        booking.paymentStatus = 'completed';
        booking.approvalStatus = 'pending';
        booking.paymentId = checkResult.raw?.payload?.transactionId || checkResult.raw?.payload?.providerReferenceId || 'PAY_POLL_' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
        await booking.save();
        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('new_campaign', { bookingId: booking.bookingId });
        }
        clearInterval(interval);
      } else if (mappedStatus === 'FAILED') {
        console.log(`[Auto-Polling] Booking ${bookingId} payment FAILED`);
        await PhonePeTransaction.updateOne(
          { transactionId },
          { status: 'failed' }
        );
        if (booking.mediaUrl) {
          deleteMediaFile(booking.mediaUrl);
        }
        booking.paymentStatus = 'failed';
        await booking.save();
        clearInterval(interval);
      } else {
        console.log(`[Auto-Polling] Booking ${bookingId} is still PENDING`);
        if (attempts >= maxAttempts) {
          console.log(`[Auto-Polling] Max polling attempts reached for booking ${bookingId}. Marking as FAILED.`);
          await PhonePeTransaction.updateOne(
            { transactionId },
            { status: 'failed', responseCode: 'POLLING_TIMEOUT' }
          );
          if (booking.mediaUrl) {
            deleteMediaFile(booking.mediaUrl);
          }
          booking.paymentStatus = 'failed';
          await booking.save();
          clearInterval(interval);
        }
      }
    } catch (err) {
      console.error(`[Auto-Polling] Error checking status for booking ${bookingId}:`, err.message);
      if (attempts >= maxAttempts) {
        // On error at max attempts, also mark as failed
        try {
          await PhonePeTransaction.updateOne(
            { transactionId },
            { status: 'failed', responseCode: 'POLLING_ERROR' }
          );
          const booking = await AdBooking.findOne({ bookingId });
          if (booking && booking.paymentStatus === 'pending') {
            if (booking.mediaUrl) {
              deleteMediaFile(booking.mediaUrl);
            }
            booking.paymentStatus = 'failed';
            await booking.save();
          }
        } catch (cleanupErr) {
          console.error(`[Auto-Polling] Cleanup error for ${bookingId}:`, cleanupErr.message);
        }
        clearInterval(interval);
      }
    }
  }, 10000); // Poll every 10 seconds
};

async function generateBookingId() {
  let bookingId;
  let exists = true;
  while (exists) {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    bookingId = `AD-${randomPart}`;
    const count = await AdBooking.countDocuments({ bookingId });
    if (count === 0) exists = false;
  }
  return bookingId;
}

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
      const apps = await HostApplication.find(
        { state, city, status: 'approved' },
        'outletName outletDescription doorNo street city state zipCode requestTablet tabletQuantity requestScreen screenQuantity'
      );
      
      const outlets = [];
      for (const app of apps) {
        if (app.requestTablet && app.tabletQuantity > 0) {
          outlets.push({
            _id: app._id,
            outletName: app.outletName,
            outletDescription: app.outletDescription,
            doorNo: app.doorNo,
            street: app.street,
            city: app.city,
            state: app.state,
            zipCode: app.zipCode,
            deviceType: 'tablet',
            quantity: app.tabletQuantity
          });
        }
        if (app.requestScreen && app.screenQuantity > 0) {
          outlets.push({
            _id: app._id,
            outletName: app.outletName,
            outletDescription: app.outletDescription,
            doorNo: app.doorNo,
            street: app.street,
            city: app.city,
            state: app.state,
            zipCode: app.zipCode,
            deviceType: 'screen',
            quantity: app.screenQuantity
          });
        }
      }
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

      const bookingQty = parseInt(quantity, 10);

      if (deviceType === 'tablet') {
        if (!outlet.requestTablet) {
          return res.status(400).send({ success: false, message: 'Selected outlet does not support Tablet display' });
        }
        if (bookingQty > outlet.tabletQuantity) {
          return res.status(400).send({ 
            success: false, 
            message: `Requested quantity exceeds tablet availability (${outlet.tabletQuantity})` 
          });
        }
      } else if (deviceType === 'screen') {
        if (!outlet.requestScreen) {
          return res.status(400).send({ success: false, message: 'Selected outlet does not support Screen display' });
        }
        if (bookingQty > outlet.screenQuantity) {
          return res.status(400).send({ 
            success: false, 
            message: `Requested quantity exceeds screen availability (${outlet.screenQuantity})` 
          });
        }
      } else {
        return res.status(400).send({ success: false, message: 'Invalid deviceType requested' });
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
      const bookingId = await generateBookingId();

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

      // Start background status polling
      pollTransactionStatus(bookingId, transactionId);

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

      if (!decodedPayload || (!decodedPayload.data && !decodedPayload.payload)) {
        return res.status(400).send({ success: false, message: 'Invalid callback payload structure: missing data/payload' });
      }

      let success = decodedPayload.success;
      let code = decodedPayload.code;
      let data = decodedPayload.data || decodedPayload.payload;

      if (data === 'WEBHOOK_VALIDATION_SUCCESS') {
        console.log('[PhonePe Webhook] Received validation ping. Responding with 200 OK.');
        return res.status(200).send({ success: true, message: 'Webhook registered successfully' });
      }

      if (decodedPayload.payload) {
        const state = decodedPayload.payload.state;
        const responseCode = decodedPayload.payload.responseCode;
        success = (state === 'COMPLETED' && responseCode === 'SUCCESS');
        code = state === 'COMPLETED' ? 'PAYMENT_SUCCESS' : (state === 'FAILED' ? 'PAYMENT_ERROR' : 'PAYMENT_PENDING');
      }

      const merchantTransactionId = data.merchantTransactionId || data.merchantOrderId;
      const amount = data.amount;

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

        const booking = await AdBooking.findOne({ transactionId: merchantTransactionId });
        if (booking) {
          if (booking.mediaUrl) {
            deleteMediaFile(booking.mediaUrl);
          }
          booking.paymentStatus = 'failed';
          await booking.save();
        }
        await Order.updateOne({ transactionId: merchantTransactionId }, { paymentStatus: 'failed' });
        
        return res.status(200).send({ success: true, message: 'Amount mismatch handled' });
      }

      const stateVal = data.state;
      const responseCodeVal = data.responseCode;
      const isCompleted = (success && code === 'PAYMENT_SUCCESS') || (stateVal === 'COMPLETED' && responseCodeVal === 'SUCCESS');

      const isPending = (
        code === 'PAYMENT_PENDING' ||
        code === 'PAYMENT_SUBMITTED' ||
        code === 'PAYMENT_INITIATED' ||
        code === 'SUBMITTED' ||
        stateVal === 'PENDING' ||
        stateVal === 'SUBMITTED'
      );

      if (isCompleted) {
        txn.status = 'completed';
        txn.responseCode = code || responseCodeVal || 'PAYMENT_SUCCESS';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        // Extract paymentId from callback payload
        const paymentId = data.transactionId || data.providerReferenceId || null;

        // Update corresponding AdBooking
        const booking = await AdBooking.findOneAndUpdate(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'completed', approvalStatus: 'pending', paymentId },
          { new: true }
        );

        if (booking && global.broadcastToAdmins) {
          global.broadcastToAdmins('new_campaign', { bookingId: booking.bookingId });
        }

        // Update corresponding Order (if it was a kiosk customer order)
        await Order.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'completed' }
        );

      } else if (isPending) {
        txn.status = 'pending';
        txn.responseCode = code || responseCodeVal || 'PAYMENT_PENDING';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        // Update corresponding AdBooking (Keep media file)
        await AdBooking.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'pending' }
        );

        // Update corresponding Order (if it was a kiosk customer order)
        await Order.updateOne(
          { transactionId: merchantTransactionId },
          { paymentStatus: 'pending' }
        );

      } else {
        txn.status = 'failed';
        txn.responseCode = code || responseCodeVal || 'PAYMENT_ERROR';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();

        const booking = await AdBooking.findOne({ transactionId: merchantTransactionId });
        if (booking) {
          if (booking.mediaUrl) {
            deleteMediaFile(booking.mediaUrl);
          }
          booking.paymentStatus = 'failed';
          await booking.save();
        }
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

      const mappedBookings = bookings.map(b => {
        const obj = b.toObject();
        obj.mediaUrl = resolveMediaUrl(obj.mediaUrl, req.headers.host);
        return obj;
      });

      return res.status(200).send({ success: true, data: mappedBookings });
    } catch (error) {
      console.error('getMyBookings Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to fetch bookings' });
    }
  }

  /**
   * Upload video raw binary payload, transcode using ffmpeg (Android Baseline, 720p, 30fps) and save to disk
   */
  async uploadVideo(req, res) {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { pipeline } = require('stream/promises');
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const config = require('../config/config');
    const MediaLog = require('../models/MediaLog');

    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

    const filenameHeader = req.headers['x-filename'] || 'video.mp4';
    const ext = path.extname(filenameHeader).toLowerCase();
    
    // Enforce file extension to only support mp4, webm
    if (!['.mp4', '.webm'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only MP4 and WEBM are allowed.' });
    }

    // Create an initial tracking row in the database media log table
    let mediaLog;
    try {
      mediaLog = new MediaLog({
        originalFilename: filenameHeader,
        status: 'processing'
      });
      await mediaLog.save();
    } catch (dbErr) {
      console.error('Failed to create MediaLog:', dbErr.message);
      return res.status(500).send({ success: false, message: 'Failed to initialize upload tracking' });
    }

    // Route to tablet or screen subfolder under ads/
    const deviceType = req.query.deviceType;
    if (!deviceType || !['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({
        success: false,
        message: 'deviceType query parameter is required and must be "tablet" or "screen"'
      });
    }
    const targetSubdir = deviceType;

    // Resolution map: tablet = portrait 800x1280 (9:16), screen = landscape 1920x1080 (16:9)
    const resolutionMap = {
      tablet: '800x1280',
      screen: '1920x1080'
    };
    const resolution = resolutionMap[deviceType];

    // We output H.264 mp4 always for baseline compatibility
    const uniqueFilename = `vid_${uuidv4().replace(/-/g, '').slice(0, 16)}.mp4`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'ads', 'videos', targetSubdir);
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFilename);
    const tempPath = path.join(os.tmpdir(), `tmp-ad-upload-${Date.now()}${ext}`);

    try {
      // Stream the raw network payload directly to a temporary disk file.
      // This solves the non-seekable pipe problem for BOTH MP4 and WebM.
      await pipeline(req.body, fs.createWriteStream(tempPath));

      // Inspect video duration via ffprobe before transcoding
      const maxVideoDurationSeconds = config.maxVideoDurationSeconds || 30;
      try {
        const metadata = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(tempPath, (err, meta) => {
            if (err) return reject(err);
            resolve(meta);
          });
        });

        const durationSeconds = metadata?.format?.duration || 0;
        if (durationSeconds > maxVideoDurationSeconds) {
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
          mediaLog.status = 'failed';
          await mediaLog.save();
          return res.status(400).send({
            success: false,
            message: `Video duration (${Math.round(durationSeconds)}s) exceeds maximum allowed limit of ${maxVideoDurationSeconds} seconds.`
          });
        }
      } catch (probeErr) {
        console.warn('ffprobe duration check warning:', probeErr.message);
      }

      // Run FFmpeg Transcoding using the temporary file path as source
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .videoCodec('libx264')
          .size(resolution)
          .fps(30)
          .outputOptions([
            '-profile:v baseline', 
            '-level 3.1',          
            '-pix_fmt yuv420p',    
            '-movflags +faststart' // Crucial for low-powered Android download-and-stream
          ])
          .audioCodec('aac')
          .audioChannels(2)
          .on('end', resolve)
          .on('error', reject)
          .save(filePath);
      });

      // Clean up temp file safely on success
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {
          console.error('Failed to delete temp file:', err.message);
        }
      }

      // Update MediaLog as completed
      mediaLog.status = 'completed';
      mediaLog.finalizedFilename = uniqueFilename;
      mediaLog.outputPath = filePath;
      await mediaLog.save();

      // Return relative server URL
      const fileUrl = `/uploads/ads/videos/${targetSubdir}/${uniqueFilename}`;

      return res.status(200).send({
        success: true,
        message: 'Video uploaded and optimized successfully',
        data: {
          filename: uniqueFilename,
          url: fileUrl
        }
      });

    } catch (error) {
      console.error('uploadVideo Transcoding Error:', error.message);
      
      // Clean up temp file safely on error
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {}
      }

      // Remove corrupt output file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {}
      }

      // Update MediaLog as failed
      if (mediaLog) {
        mediaLog.status = 'failed';
        mediaLog.errorMessage = error.message;
        await mediaLog.save();
      }

      return res.status(500).send({ success: false, message: 'Failed to upload and transcode video: ' + error.message });
    }
  }

  /**
   * Upload image raw binary payload, optimize via sharp and save to disk
   */
  async uploadImage(req, res) {
    const fs = require('fs');
    const path = require('path');
    const sharp = require('sharp');
    const { v4: uuidv4 } = require('uuid');
    const MediaLog = require('../models/MediaLog');

    const filenameHeader = req.headers['x-filename'] || req.headers['X-Filename'] || 'image.png';
    const ext = path.extname(filenameHeader).toLowerCase();

    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.' });
    }

    const deviceType = req.query.deviceType;
    if (!deviceType || !['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({
        success: false,
        message: 'deviceType query parameter is required and must be "tablet" or "screen"'
      });
    }

    // Resolution map: tablet = 800x1280 (vertical), screen = 1920x1080 (horizontal)
    const dimensionsMap = {
      tablet: { width: 800, height: 1280 },
      screen: { width: 1920, height: 1080 }
    };
    const targetDim = dimensionsMap[deviceType];

    let mediaLog;
    try {
      mediaLog = new MediaLog({
        originalFilename: filenameHeader,
        status: 'processing'
      });
      await mediaLog.save();
    } catch (dbErr) {
      console.error('Failed to create MediaLog:', dbErr.message);
      return res.status(500).send({ success: false, message: 'Failed to initialize upload tracking' });
    }

    const uniqueFilename = `img_${uuidv4().replace(/-/g, '').slice(0, 16)}.webp`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'ads', 'images', deviceType);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFilename);

    let imageBuffer = req.body;
    if (imageBuffer && typeof imageBuffer.pipe === 'function') {
      const chunks = [];
      for await (const chunk of imageBuffer) {
        chunks.push(chunk);
      }
      imageBuffer = Buffer.concat(chunks);
    }

    try {
      await sharp(imageBuffer)
        .resize(targetDim.width, targetDim.height, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .webp({ quality: 85 })
        .toFile(filePath);

      mediaLog.status = 'completed';
      mediaLog.finalizedFilename = uniqueFilename;
      mediaLog.outputPath = filePath;
      await mediaLog.save();

      const fileUrl = `/uploads/ads/images/${deviceType}/${uniqueFilename}`;

      return res.status(200).send({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          filename: uniqueFilename,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error('uploadImage Sharp Error:', error.message);
      if (mediaLog) {
        mediaLog.status = 'failed';
        mediaLog.errorMessage = error.message;
        await mediaLog.save();
      }
      return res.status(500).send({
        success: false,
        message: `Image optimization failed: ${error.message}`
      });
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
        // Only auto-complete if PhonePe hasn't indexed the transaction yet (sandbox delay).
        // Do NOT auto-complete explicitly FAILED transactions.
        if (config.demoMode && checkResult.code === 'TRANSACTION_NOT_FOUND') {
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

        if (booking.mediaUrl) {
          deleteMediaFile(booking.mediaUrl);
        }
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

  /**
   * Get analytics for a specific ad campaign booking
   */
  async getCampaignAnalytics(req, res) {
    const { bookingId } = req.params;
    const userId = req.user.uid;

    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'Booking ID is required' });
    }

    try {
      const AdImpression = require('../models/AdImpression');
      const HostApplication = require('../models/HostApplication');

      const booking = await AdBooking.findOne({ 
        bookingId, 
        $or: [{ advertiserId: req.user.uid }, { userId: req.user.uid }] 
      });
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Ad campaign booking not found or access denied' });
      }

      if (booking.paymentStatus !== 'completed' || booking.approvalStatus !== 'approved') {
        return res.status(403).send({ 
          success: false, 
          message: 'Analytics are only available for paid and approved ad campaigns.' 
        });
      }

      // Fetch impressions for this booking
      const impressions = await AdImpression.find({ bookingId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Aggregate statistics
      const totalPlays = impressions.length;
      const uniqueDevices = new Set(impressions.map(imp => imp.deviceId).filter(Boolean));
      const totalDurationSeconds = impressions.reduce((sum, imp) => sum + (imp.durationSeconds || 15), 0);
      const totalClicks = impressions.reduce((sum, imp) => sum + (imp.interactiveClicks || 0), 0);

      // Resolve venue details for recent impressions
      const venueIds = [...new Set(impressions.map(imp => imp.hostApplicationId).filter(Boolean))];
      const venues = await HostApplication.find({ _id: { $in: venueIds } }).select('outletName city state').lean();
      const venueMap = {};
      venues.forEach(v => {
        venueMap[v._id.toString()] = v;
      });

      const formattedImpressions = impressions.map(imp => {
        const venue = imp.hostApplicationId ? venueMap[imp.hostApplicationId.toString()] : null;
        return {
          id: imp._id,
          deviceId: imp.deviceId || 'Tablet Kiosk',
          outletName: venue ? venue.outletName : (booking.targetScreenType === 'screen' ? 'Digital Display Screen' : 'Venue Tablet'),
          city: venue ? venue.city : '',
          durationSeconds: imp.durationSeconds || 15,
          interactiveClicks: imp.interactiveClicks || 0,
          createdAt: imp.createdAt
        };
      });

      return res.status(200).send({
        success: true,
        data: {
          bookingId,
          campaignName: booking.targetAudience || `Ad ${bookingId}`,
          targetScreenType: booking.targetScreenType,
          totalPlays,
          uniqueDevicesCount: uniqueDevices.size,
          totalDurationSeconds,
          totalDurationMinutes: (totalDurationSeconds / 60).toFixed(1),
          totalClicks,
          recentImpressions: formattedImpressions
        }
      });
    } catch (error) {
      console.error('getCampaignAnalytics Error:', error.message);
      return res.status(500).send({ success: false, message: 'Failed to retrieve campaign analytics' });
    }
  }
}

module.exports = new AdController();
