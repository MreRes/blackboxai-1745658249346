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
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = config;
