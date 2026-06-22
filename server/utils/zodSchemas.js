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

const registerSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
  password: z.string({ required_error: 'Password is required' })
    .min(8, 'Password must be 8-12 characters')
    .max(12, 'Password must be 8-12 characters')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'Password must contain both letters and numbers'
    }),
  role: z.enum(['merchant', 'advertiser'], {
    errorMap: () => ({ message: 'Role must be merchant or advertiser' })
  })
});

const loginSchema = z.object({
  phone: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  selectedRole: z.enum(['merchant', 'advertiser', 'admin']).optional()
}).refine((data) => data.phone || data.identifier, {
  message: 'Identifier (email or phone) is required',
  path: ['identifier']
});

const verifyOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits')
});

const sendOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required')
});

const resetPasswordSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
  password: z.string({ required_error: 'Password is required' })
    .min(8, 'Password must be 8-12 characters')
    .max(12, 'Password must be 8-12 characters')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'Password must contain both letters and numbers'
    })
});

const addRoleSchema = z.object({
  role: z.enum(['merchant', 'advertiser'], {
    errorMap: () => ({ message: 'Role must be merchant or advertiser' })
  }),
  password: z.string({ required_error: 'Current password is required' }).min(1, 'Password is required')
});

module.exports = {
  deviceActivationSchema,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  sendOtpSchema,
  resetPasswordSchema,
  addRoleSchema
};
