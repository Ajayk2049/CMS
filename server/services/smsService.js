const axios = require('axios');
const config = require('../config/config');

class SMSService {
  /**
   * Send a 6-digit OTP to a mobile number
   * @param {string} phone 10-digit Indian mobile number
   * @param {string} otp 6-digit verification code
   * @returns {Promise<boolean>}
   */
  async sendOTP(phone, otp) {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // Demo Mode bypass
    if (config.demoMode) {
      console.log(`[SMS DEMO MODE] OTP for ${phone.slice(0, 6)}**** is ${otp}`);
      return true;
    }

    try {
      const response = await axios.post(
        'https://api.startmessaging.com/otp/send',
        {
          phoneNumber: formattedPhone,
          templateId: config.otpTemplateId,
          variables: {
            otp: otp,
            appName: 'CMSPlatform'
          }
        },
        {
          headers: {
            'X-API-Key': config.startMessagingApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('StartMessaging SMS Service Error:', error.response?.data || error.message);
      // Determine failure details
      if (error.response) {
        const status = error.response.status;
        if (status === 401) throw new Error('SMS service not configured (Invalid API Key)');
        if (status === 402) throw new Error('Insufficient Balance for SMS');
        if (status === 429) throw new Error('SMS Rate limit exceeded');
      }
      throw new Error('Failed to send OTP message via provider');
    }
  }

  /**
   * Check status of sent message
   * @param {string} messageId 
   * @returns {Promise<string>} Status: initiated, queued, sent, delivered, failed
   */
  async checkStatus(messageId) {
    if (config.demoMode) {
      return 'delivered';
    }

    try {
      const response = await axios.get(
        `https://api.startmessaging.com/messages/${messageId}`,
        {
          headers: {
            'X-API-Key': config.startMessagingApiKey
          }
        }
      );
      return response.data.status;
    } catch (error) {
      console.error('StartMessaging SMS Status Fetch Error:', error.message);
      return 'failed';
    }
  }
}

module.exports = new SMSService();
