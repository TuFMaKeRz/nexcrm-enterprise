const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many requests from this IP address, please try again after 15 minutes.',
      429
    );
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 mins for login/register
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many authentication attempts. Please try again after 15 minutes.',
      429
    );
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
