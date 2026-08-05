const pino = require('pino');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = config.logLevel || (isProduction ? 'warn' : 'debug');

// Configure transport streams (Console + Log Files)
const targets = [];

// Stream 1: Console Output
if (!isProduction) {
  targets.push({
    target: 'pino-pretty',
    level: logLevel,
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    }
  });
} else {
  targets.push({
    target: 'pino/file',
    level: logLevel,
    options: { destination: 1 } // Standard output (stdout)
  });
}

// Stream 2: Combined Log File
targets.push({
  target: 'pino/file',
  level: logLevel,
  options: {
    destination: path.join(logsDir, 'combined.log'),
    mkdir: true
  }
});

// Stream 3: Dedicated Error Log File
targets.push({
  target: 'pino/file',
  level: 'warn', // Captures warn, error, and fatal
  options: {
    destination: path.join(logsDir, 'error.log'),
    mkdir: true
  }
});

const transport = pino.transport({ targets });

const logger = pino(
  {
    level: logLevel,
    base: { env: config.env },
    timestamp: pino.stdTimeFunctions.isoTime
  },
  transport
);

module.exports = logger;
