const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.cookieSecret));

// HTTP request logger in dev
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Global API rate limiter
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  return ApiResponse.error(res, `Route '${req.originalUrl}' not found on this CRM server.`, 404);
});

// Centralized error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(env.port, () => {
      console.log(`🚀 Business CRM Server running in [${env.nodeEnv}] mode on port ${env.port}`);
      console.log(`📡 API Base Endpoint: http://localhost:${env.port}/api/v1`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated.');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
