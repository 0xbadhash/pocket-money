// backend/src/server.js
const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // For parsing application/json

// Mount API routes
app.use('/api/v1/auth', authRoutes);

// Basic root route for testing if the server is up
app.get('/', (req, res) => {
  res.send('Backend server is running.');
});

// Global error handler (very basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
