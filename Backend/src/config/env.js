require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/business_crm',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'crm_super_secure_access_secret_key_2026_!@#$%^',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'crm_super_secure_refresh_secret_key_2026_&*(^%$',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cookieSecret: process.env.COOKIE_SECRET || 'crm_cookie_secret_key_9876543210',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'NexCRM Platform <noreply@nexcrm.com>'
  }
};
