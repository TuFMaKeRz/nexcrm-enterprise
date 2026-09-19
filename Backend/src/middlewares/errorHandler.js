const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (env.nodeEnv === 'development') {
    console.error('🔥 Error caught by errorHandler:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return ApiResponse.error(res, message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for '${field}'. Please use another value.`;
    return ApiResponse.error(res, message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return ApiResponse.error(res, message, 400);
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return ApiResponse.error(res, 'Validation Error', 400, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token. Please authenticate.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Token expired. Please login again.', 401);
  }

  // Default server error
  return ApiResponse.error(
    res,
    error.message || 'Internal Server Error',
    error.statusCode || 500,
    env.nodeEnv === 'development' ? { stack: err.stack } : null
  );
};

module.exports = errorHandler;
