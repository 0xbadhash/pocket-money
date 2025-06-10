// backend/src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/v1/auth/register/parent
router.post('/register/parent', authController.registerParent);

// POST /api/v1/auth/login
router.post('/login', authController.loginUser);

// GET /api/v1/auth/users (for admin purposes)
router.get('/users', authController.getAllUsers);

// POST /api/v1/auth/request-password-recovery
router.post('/request-password-recovery', authController.requestPasswordRecovery);

// GET /api/v1/auth/google/initiate
router.get('/google/initiate', authController.googleInitiate);

module.exports = router;
