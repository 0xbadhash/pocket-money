// backend/src/models/userModel.js

// In-memory array to simulate a database for users
const users = [];
let userIdCounter = 1;

/**
 * Simulates finding a user by their email.
 * @param {string} email - The email of the user to find.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
const findUserByEmail = async (email) => {
  return users.find(user => user.email === email) || null;
};

/**
 * Simulates finding a user by their ID.
 * @param {string} id - The ID of the user to find.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
const findUserById = async (id) => {
  return users.find(user => user.id === id) || null;
};

/**
 * Simulates creating a new user.
 * In a real application, this would involve password hashing.
 * @param {object} userData - The user data (e.g., name, email, password, role).
 * @returns {Promise<object>} The created user object.
 */
const createUser = async (userData) => {
  const newUser = {
    id: `user_${userIdCounter++}`,
    ...userData, // In a real app, NEVER store plain password. Hash it first.
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(newUser);
  // Return a copy, excluding the password for security, even in this mock.
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

/**
 * Retrieves all users (for admin purposes, simulate with caution).
 * @returns {Promise<object[]>} An array of user objects.
 */
const findAllUsers = async () => {
  // Return copies, excluding passwords
  return users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findAllUsers,
  // users // Exposing this only for potential direct manipulation in mock setup if ever needed, not for controllers
};
