const axios = require('axios');
const config = require('../config/config');

class PhonePeService {
  constructor() {
    this.tokenCache = {
      token: null,
      expiresAt: 0
    };
  }

  /**
   * Securely retrieve and cache the OAuth 2.0 access token
   * @returns {Promise<string>}
   */
  async getAuthToken() {
    // Check if token exists in cache and is not expired
    if (this.tokenCache.token && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    try {
      const response = await axios.post(
        `${config.phonePe.authUrl}/v1/oauth/token`,
        {
          client_id: config.phonePe.clientId,
          client_secret: config.phonePe.clientSecret,
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      if (!data.access_token) {
        throw new Error('OAuth response did not contain access_token');
      }

      // Store in cache with a 60-second safety buffer
      this.tokenCache.token = data.access_token;
      this.tokenCache.expiresAt = Date.now() + (parseInt(data.expires_in, 10) * 1000) - 60000;

      return this.tokenCache.token;
    } catch (error) {
      console.error('PhonePe OAuth Token Fetch Error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with PhonePe payment service');
    }
  }

  /**
   * Initiate a PhonePe payment (V2 Standard Checkout)
   * @param {Object} params
   * @param {string} params.transactionId Unique merchant transaction ID
   * @param {string} params.userId Unique merchant user ID
   * @param {number} params.amount Amount in paise (1 INR = 100 paise)
   * @param {string} params.redirectUrl URL to return to after payment finishes
   * @param {string} params.phone Optional customer mobile number
   * @returns {Promise<{paymentUrl: string, transactionId: string}>}
   */
  async initiatePayment({ transactionId, userId, amount, redirectUrl, phone }) {
    const endpoint = '/v3/credit/backToSource';
    const token = await this.getAuthToken();

    const payload = {
      merchantId: config.phonePe.merchantId,
      transactionId: transactionId,
      amount: amount,
      merchantOrderId: transactionId,
      message: 'Ad Campaign Booking Payment',
      redirectUrl: redirectUrl,
      callbackUrl: config.phonePe.callbackUrl
    };

    if (phone) {
      payload.mobileNumber = phone.replace(/\D/g, '').slice(-10);
    }

    try {
      const response = await axios.post(
        `${config.phonePe.hostUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${token}`
          }
        }
      );

      if (response.data.success && response.data.data.instrumentResponse?.redirectInfo) {
        return {
          paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
          transactionId: transactionId
        };
      } else {
        throw new Error(response.data.message || 'Failed to retrieve checkout redirect URL');
      }
    } catch (error) {
      console.error('PhonePe V2 Payment Initiation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'PhonePe payment integration error');
    }
  }

  /**
   * Fetch current status of a payment or refund from PhonePe V2 status API
   * @param {string} transactionId 
   * @returns {Promise<{status: string, code: string, amount: number, raw: Object}>}
   */
  async checkTransactionStatus(transactionId) {
    const merchantId = config.phonePe.merchantId;
    const endpoint = `/v3/transaction/${merchantId}/${transactionId}/status`;
    const token = await this.getAuthToken();

    try {
      const response = await axios.get(
        `${config.phonePe.hostUrl}${endpoint}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        return {
          status: data.paymentState, // COMPLETED, FAILED, PENDING
          code: response.data.code,  // PAYMENT_SUCCESS, PAYMENT_ERROR, PAYMENT_PENDING
          amount: data.amount,
          raw: response.data
        };
      } else {
        return {
          status: 'FAILED',
          code: response.data.code || 'PAYMENT_ERROR',
          amount: 0,
          raw: response.data
        };
      }
    } catch (error) {
      console.error('PhonePe V2 Status Check Error:', error.response?.data || error.message);
      if (error.response?.status === 400 || error.response?.status === 404) {
        return {
          status: 'FAILED',
          code: 'TRANSACTION_NOT_FOUND',
          amount: 0,
          raw: error.response.data
        };
      }
      throw new Error('PhonePe status service unavailable');
    }
  }

  /**
   * Initiate a Refund request using V2 Refund API
   * @param {Object} params
   * @param {string} params.refundTransactionId New transaction ID for the refund
   * @param {string} params.originalTransactionId Original payment transaction ID
   * @param {number} params.amount Amount in paise to refund (cannot exceed original amount)
   * @param {string} params.orderId Merchant order ID
   * @returns {Promise<{status: string, code: string}>}
   */
  async initiateRefund({ refundTransactionId, originalTransactionId, amount, orderId }) {
    const endpoint = '/v2/refund';
    const token = await this.getAuthToken();

    const payload = {
      merchantId: config.phonePe.merchantId,
      transactionId: refundTransactionId,
      originalTransactionId: originalTransactionId,
      amount: amount,
      merchantOrderId: orderId,
      message: 'Merchant initiated cancellation refund'
    };

    try {
      const response = await axios.post(
        `${config.phonePe.hostUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        return {
          status: response.data.data.paymentState || 'PENDING',
          code: response.data.code || 'PAYMENT_PENDING'
        };
      } else {
        throw new Error(response.data.message || 'Refund initiation failed');
      }
    } catch (error) {
      console.error('PhonePe V2 Refund Initiation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'PhonePe refund error');
    }
  }

  /**
   * Verify Webhook payload using V2 Basic Auth credentials
   * @param {string} authHeader Request Authorization header value
   * @returns {boolean} True if authentic
   */
  verifyWebhook(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }
    try {
      const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
      const [user, pass] = credentials.split(':');
      
      return user === config.phonePe.webhookUser && pass === config.phonePe.webhookPassword;
    } catch (err) {
      console.error('Webhook Basic Auth Parse Error:', err.message);
      return false;
    }
  }
}

module.exports = new PhonePeService();
