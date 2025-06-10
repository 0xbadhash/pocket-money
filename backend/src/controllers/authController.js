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

const getAllUsers = async (req, res) => {
  try {
    // TODO: Add authentication and authorization check here to ensure only admins can access
    // For now, it's open for demonstration with the mock backend.
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. Admin role required.' }});
    // }

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

  // In a real application:
  // 1. Check if the email exists in the database.
  // 2. Generate a secure, unique, time-limited token.
  // 3. Store the token (hashed) associated with the user's account.
  // 4. Send an email to the user with a link containing this token.
  console.log(`Password recovery requested for email: ${email}`); // Mock action

  // Always return a generic message to prevent email enumeration attacks
  res.status(200).json({
    data: {
      message: "If an account with that email address exists, a password recovery link has been sent."
    }
  });
};

module.exports = {
  registerParent,
  loginUser,
  getAllUsers,
  requestPasswordRecovery, // Add new function here
};
