const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn
  });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
