const path = require('path');
const dotenv = require('dotenv');

// If env-file parameter is passed or we fallback to dev file
const envFileArg = process.argv.find(arg => arg.startsWith('--env-file='));
let envPath;
if (envFileArg) {
  envPath = path.resolve(process.cwd(), envFileArg.split('=')[1]);
} else {
  // Fallback to dev file if nothing is injected via command line
  envPath = path.resolve(__dirname, '.env.dev');
}

dotenv.config({ path: envPath });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  grpcPort: parseInt(process.env.GRPC_PORT, 10) || 50051,
  mongoUri: process.env.MONGO_URI,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT, 10) || 6379,
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_key_12345!',
  demoMode: process.env.DEMO_MODE === 'true',
  demoPhone: process.env.DEMO_PHONE || '9876543210',
  demoOtp: process.env.DEMO_OTP || '123456',
  startMessagingApiKey: process.env.STARTMESSAGING_API_KEY,
  otpTemplateId: process.env.OTP_TEMPLATE_ID,
  phonePe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    authUrl: process.env.PHONEPE_AUTH_URL,
    hostUrl: process.env.PHONEPE_HOST_URL,
    callbackUrl: process.env.PHONEPE_CALLBACK_URL,
    webhookUser: process.env.PHONEPE_WEBHOOK_USER || 'cms_webhook',
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD || 'webhook_secure_pass_123'
  }
};

// Validate critical parameters
const requiredKeys = ['mongoUri', 'jwtSecret', 'startMessagingApiKey', 'otpTemplateId'];
const missingKeys = [];

requiredKeys.forEach(key => {
  if (!config[key]) {
    missingKeys.push(key);
  }
});

const requiredPhonePe = ['merchantId', 'clientId', 'clientSecret', 'authUrl', 'hostUrl', 'callbackUrl'];
requiredPhonePe.forEach(key => {
  if (!config.phonePe[key]) {
    missingKeys.push(`phonePe.${key}`);
  }
});

if (missingKeys.length > 0 && !config.demoMode) {
  throw new Error(`Configuration Validation Failed. Missing keys: ${missingKeys.join(', ')}`);
}

module.exports = config;
