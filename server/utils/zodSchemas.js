const { z } = require('zod');

const deviceActivationSchema = z.object({
  deviceId: z.string({
    required_error: 'Device ID is required'
  }).min(1, 'Device ID cannot be empty'),
  hardwareId: z.string({
    required_error: 'Hardware ID is required'
  }).min(1, 'Hardware ID cannot be empty'),
  deviceType: z.enum(['tablet', 'screen'], {
    errorMap: () => ({ message: 'Device type must be tablet or screen' })
  }),
  kioskPassword: z.string().optional().refine((val) => {
    // If it's a tablet, password is required and must be 4-12 characters
    // We validate this in custom logic based on deviceType or refine
    return true;
  })
}).refine((data) => {
  if (data.deviceType === 'tablet') {
    return typeof data.kioskPassword === 'string' && data.kioskPassword.length >= 4 && data.kioskPassword.length <= 12;
  }
  return true;
}, {
  message: 'Bypass password is required for tablets and must be 4-12 characters long',
  path: ['kioskPassword']
});

module.exports = {
  deviceActivationSchema
};
