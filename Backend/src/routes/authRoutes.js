const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

// Public auth routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

// Protected auth routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
