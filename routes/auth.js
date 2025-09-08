import express from 'express';
import pool from '../db.js'; // your PostgreSQL pool
import bcrypt from "bcryptjs";


const router = express.Router();

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // If passwords are hashed in DB, use bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    // const isMatch = password === user.password; 
    // if plain text for now

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If login successful, return user info (or token if JWT)
    res.status(200).json({ userId: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
