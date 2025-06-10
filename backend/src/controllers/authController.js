// backend/src/controllers/authController.js
const userModel = require('../models/userModel');

// In a real app, use a proper JWT library (e.g., jsonwebtoken)
const generateMockJwt = (user) => {
  return `mock.jwt.for.${user.id}.${Date.now()}`;
};

const registerParent = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' } });
  }

  try {
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'User with this email already exists.' } });
    }

    const newUser = await userModel.createUser({ name, email, password, role: 'parent' });

    const token = generateMockJwt(newUser);
    const { password: _, ...userForResponse } = newUser; // Exclude password from response

    res.status(201).json({
      data: {
        user: userForResponse,
        token: token,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during registration.' } });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } });
  }

  try {
    const user = await userModel.findUserByEmail(email);

    if (!user || user.password !== password) { // Insecure: direct password comparison
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const token = generateMockJwt(user);
    const { password: _, ...userForResponse } = user;

    res.status(200).json({
      data: {
        user: userForResponse,
        token: token,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during login.' } });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.findAllUsers();
    res.status(200).json({
      data: {
        users: users,
        count: users.length,
      }
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred while fetching users.' } });
  }
};

const requestPasswordRecovery = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required.' } });
  }
  console.log(`Password recovery requested for email: ${email}`);
  res.status(200).json({
    data: {
      message: "If an account with that email address exists, a password recovery link has been sent."
    }
  });
};

const googleInitiate = async (req, res) => {
  console.log("Google Sign-In initiated (mock).");

  // Simulate finding or creating a mock Google user
  const mockGoogleEmail = "google.user." + Date.now() + "@example.com";
  const mockGoogleName = "Google User";
  let user = await userModel.findUserByEmail(mockGoogleEmail);

  try {
    if (!user) {
      console.log(`Mock Google user not found, creating: ${mockGoogleEmail}`);
      user = await userModel.createUser({
        name: mockGoogleName,
        email: mockGoogleEmail,
        password: "mockGooglePassword",
        role: 'parent'
      });
    } else {
      console.log(`Mock Google user found: ${mockGoogleEmail}`);
    }

    const token = generateMockJwt(user);
    const { password: _, ...userForResponse } = user;

    res.status(200).json({
      data: {
        user: userForResponse,
        token: token,
        message: "Mock Google Sign-In successful."
      }
    });

  } catch (error) {
    console.error('Mock Google Sign-In error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during mock Google Sign-In.' } });
  }
};

module.exports = {
  registerParent,
  loginUser,
  getAllUsers,
  requestPasswordRecovery,
  googleInitiate, // Add new function here
};
