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

    // IMPORTANT: In a real app, NEVER compare plain text passwords.
    // You would:
    // 1. Retrieve the hashed password for the user from the database.
    // 2. Use a library like bcrypt to compare the provided password with the stored hash:
    //    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    // For this mock, we do a direct comparison, which is insecure.
    if (!user || user.password !== password) { // Insecure: direct password comparison
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const token = generateMockJwt(user);
    const { password: _, ...userForResponse } = user; // Exclude password from response

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

module.exports = {
  registerParent,
  loginUser, // Add loginUser here
};
