import express from 'express';
import pool from '../db.js'; // your PostgreSQL pool
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

// configure mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or use SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/register
router.post('/register', async (req, res) => {
  const { fullName, email, username, password } = req.body;

  try {
    // check existing user
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      const foundUser = existingUser.rows[0];
      if (foundUser.username === username) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      if (foundUser.email === email) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // valid 10 minutes

    // save user with OTP
    const newUser = await pool.query(
      `INSERT INTO users (fullname, email, username, password, otp_code, otp_expires) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email`,
      [fullName, email, username, hashedPassword, otp, otpExpires]
    );

    // send email
    await transporter.sendMail({
      from: `"Grammar Master" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Hello ${fullName}, your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(201).json({
      message: 'OTP sent to your email. Please verify.',
      userId: newUser.rows[0].id
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otp_expires) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // mark verified
    await pool.query(
      'UPDATE users SET is_verified = true, otp_code = NULL, otp_expires = NULL WHERE email=$1',
      [email]
    );

    res.json({ message: 'Account verified successfully!' });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// POST /resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  try {
    // check if user exists
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const foundUser = user.rows[0];

    // if already verified, don’t resend
    if (foundUser.is_verified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    // generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // update OTP in database
    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE email = $3',
      [otp, otpExpires, email]
    );

    // send email
    await transporter.sendMail({
      from: `"Grammar Master" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your New OTP Code",
      text: `Hello ${foundUser.fullname}, your new OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: 'OTP resent to your email' });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Server error while resending OTP' });
  }
});

// POST /reset password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // check if user exists
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const foundUser = user.rows[0];

    // generate new password (8 chars with symbols)
    const crypto = require('crypto');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    let new_password = Array.from(crypto.randomFillSync(new Uint32Array(8)))
      .map(x => chars[x % chars.length])
      .join('');

    // hash the password before saving (recommended)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // update password in database
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    // send email
    await transporter.sendMail({
      from: `"Grammar Master" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your New Password",
      text: `Hello ${foundUser.fullname}, your new password is: ${new_password}\n\nYou can now log in with this new password.`,
    });

    res.status(200).json({ message: 'New password sent to your email' });

  } catch (err) {
    console.error('Reset Password error:', err);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
});


// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1 or email=$1', [username]);

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

    // send email asynchronously (don’t await)
    transporter.sendMail({
      from: `"Grammar Master" <${process.env.EMAIL_USER}>`,
      to: 'koubaissihadi2@gmail.com',
      subject: "Grammar Master - New Login Detected",
      text: `Hello Hadi, ${user.fullname} just logged in ${new Date().toLocaleString("en-US", { timeZone: "Asia/Beirut" })}.`
    }).catch(err => console.error("Email send error:", err));

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;