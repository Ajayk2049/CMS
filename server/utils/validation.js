class Validator {
  /**
   * Validates Indian mobile phone numbers
   * Expected format: raw 10 digits starting with 6-9, or +91 followed by 10 digits starting with 6-9
   * @param {string} phone 
   * @returns {{isValid: boolean, error?: string, formatted?: string}}
   */
  validatePhone(phone) {
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleanPhone = phone.trim();

    // Check if country code is included
    if (cleanPhone.startsWith('+')) {
      if (!cleanPhone.startsWith('+91')) {
        return { 
          isValid: false, 
          error: 'International OTP coming soon – please choose an Indian number (+91) for now' 
        };
      }
      
      const numberPart = cleanPhone.slice(3);
      const isIndianMobile = /^[6-9]\d{9}$/.test(numberPart);
      if (!isIndianMobile) {
        return { isValid: false, error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9' };
      }

      return { isValid: true, formatted: numberPart };
    }

    // If no country code, assume India (+91) and check 10 digit constraint
    const isIndianMobile = /^[6-9]\d{9}$/.test(cleanPhone);
    if (!isIndianMobile) {
      return { isValid: false, error: 'Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9' };
    }

    return { isValid: true, formatted: cleanPhone };
  }

  /**
   * Validate 6-digit OTP
   * @param {string} otp 
   * @returns {boolean}
   */
  validateOTP(otp) {
    if (!otp) return false;
    return /^\d{6}$/.test(otp.trim());
  }
}

module.exports = new Validator();
