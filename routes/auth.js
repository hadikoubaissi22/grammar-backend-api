import express from 'express';
import pool from '../db.js'; // your PostgreSQL pool
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
  const { fullName, email, username, password } = req.body;

  try {
    // 1. Check if the username or email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      // Check which one already exists
      const foundUser = existingUser.rows[0];
      if (foundUser.username === username) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      if (foundUser.email === email) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // 3. Save the new user to the database
    const newUser = await pool.query(
      'INSERT INTO users (full_name, email, username, password) VALUES ($1, $2, $3, $4) RETURNING id, username',
      [fullName, email, username, hashedPassword]
    );

    res.status(201).json({ 
      message: 'Registration successful!', 
      user: newUser.rows[0] 
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Account not found' });
    }

    const user = result.rows[0];

    // Check if passwords match using bcrypt.compare
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token valid for 12 hours
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;