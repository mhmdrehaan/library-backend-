const express = require('express');
const cors = require('cors');
const pool = require('./db');
const booksRouter = require('./routes/books');
const membersRouter = require('./routes/members');
const authRouter = require('./routes/auth');
const borrowingsRouter = require('./routes/borrowings');
const returnRoutes = require('./routes/returns');
const reportRoutes = require('./routes/reports');
require('dotenv').config();

const app = express();

// CORS Configuration - HARUS DI ATAS
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/auth', authRouter);
app.use('/api/borrowings', borrowingsRouter);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);


// Test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({ message: 'Database connected!', solution: rows[0].solution });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});