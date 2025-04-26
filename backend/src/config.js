require('dotenv').config({ path: __dirname + '/../../.env' });

const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  nodeEnv: process.env.NODE_ENV,
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH,
  
  // Default activation periods in days
  activationPeriods: {
    week: 7,
    month: 30,
    year: 365
  },
  
  // Budget notification thresholds (in percentage)
  budgetAlerts: {
    warning: 25, // Alert when 25% remaining
    critical: 10 // Alert when 10% remaining
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'MONGODB_URI',
  'PORT'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    if (envVar === 'JWT_SECRET') {
      process.env[envVar] = 'default_jwt_secret_for_testing_only';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else if (envVar === 'JWT_REFRESH_SECRET') {
      process.env[envVar] = 'default_jwt_refresh_secret_for_testing_only';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else if (envVar === 'SESSION_SECRET') {
      process.env[envVar] = 'default_session_secret_for_testing_only';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else if (envVar === 'ENCRYPTION_KEY') {
      process.env[envVar] = 'default_encryption_key_for_testing_only';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else if (envVar === 'MONGODB_URI') {
      process.env[envVar] = 'mongodb://localhost:27017/whatsapp-financial-bot';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else if (envVar === 'PORT') {
      process.env[envVar] = '3000';
      console.warn(`Warning: Environment variable ${envVar} not set. Using default for testing.`);
    } else {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
});

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  mongoUri: process.env.MONGODB_URI,
  port: process.env.PORT || 3000
};