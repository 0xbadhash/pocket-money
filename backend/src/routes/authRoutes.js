// backend/src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/v1/auth/register/parent
router.post('/register/parent', authController.registerParent);

// POST /api/v1/auth/login
router.post('/login', authController.loginUser); // Add login route

module.exports = router;
