import express from 'express';
import pool from '../db.js'; // your PostgreSQL pool
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const router = express.Router();

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Account not found' });
    }

    const user = result.rows[0];

    // If passwords are hashed in DB, use bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    // const isMatch = password === user.password; 
    // if plain text for now

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Generate JWT token valid for 6 hours
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // If login successful, return user info (or token if JWT)
    // res.status(200).json({ userId: user.id, username: user.username });
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
