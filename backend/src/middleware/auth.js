const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const config = require('../config');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      logger.warn('No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get user from token
      const user = await User.findById(decoded.id);

      // Check if user exists
      if (!user) {
        logger.warn(`No user found with id ${decoded.id}`);
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Check if user is active and not expired
      if (!user.isValidUser()) {
        logger.warn(`User ${user.username} account is inactive or expired`);
        return res.status(401).json({
          success: false,
          message: 'Account is inactive or expired'
        });
      }

      // Add user to request object
      req.user = user;
      next();

    } catch (err) {
      logger.error('Token verification failed:', err);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (err) {
    logger.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin middleware
exports.adminProtect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      logger.warn('No admin token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Check if token is for admin
      if (!decoded.isAdmin) {
        logger.warn('Non-admin tried to access admin route');
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access admin routes'
        });
      }

      // Add admin flag to request
      req.isAdmin = true;
      next();

    } catch (err) {
      logger.error('Admin token verification failed:', err);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (err) {
    logger.error('Admin auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Validate WhatsApp source
exports.validateWhatsAppSource = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find user by phone number
    const user = await User.findOne({
      'phoneNumbers.number': phoneNumber,
      'phoneNumbers.isActive': true
    });

    if (!user) {
      logger.warn(`No active user found for phone number ${phoneNumber}`);
      return res.status(401).json({
        success: false,
        message: 'Phone number not registered or inactive'
      });
    }

    // Check if user is active and not expired
    if (!user.isValidUser()) {
      logger.warn(`User ${user.username} account is inactive or expired`);
      return res.status(401).json({
        success: false,
        message: 'Account is inactive or expired'
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (err) {
    logger.error('WhatsApp source validation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Rate limiting middleware
exports.rateLimit = (maxRequests, timeWindow) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Clean up old requests
    requests.forEach((timestamp, key) => {
      if (timestamp < windowStart) {
        requests.delete(key);
      }
    });

    // Get requests in current window
    const requestCount = (requests.get(ip) || [])
      .filter(timestamp => timestamp > windowStart)
      .length;

    if (requestCount >= maxRequests) {
      logger.warn(`Rate limit exceeded for IP ${ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    // Add current request
    const requestTimestamps = requests.get(ip) || [];
    requestTimestamps.push(now);
    requests.set(ip, requestTimestamps);

    next();
  };
};
