import express from 'express';
import pool from '../db.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer'; // You'll need to install this package

const router = express.Router();

// Configure your email transporter (replace with your service credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail', // or 'SendGrid', 'Mailgun', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper function to generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/register
// Step 1: User submits details and we send an OTP
router.post('/register', async (req, res) => {
    const { fullName, email, username, password } = req.body;

    try {
        // Check if the username or email already exists
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

        // Generate and save the OTP to a temporary table or add it to the user object if they exist
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        // You'll need a new table for temporary registration data or add columns to your users table
        // Example: a temporary_registrations table
        await pool.query(
            'INSERT INTO temporary_registrations (full_name, email, username, password, otp, otp_expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [fullName, email, username, password, otp, expiresAt]
        );

        // Send the OTP email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Grammar Master: Your One-Time Password (OTP)',
            html: `
                <h2>Email Verification</h2>
                <p>Hello ${fullName},</p>
                <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
                <h1 style="color: #7E6EF9;">${otp}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.' });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// POST /api/verify-otp
// Step 2: User submits OTP for verification
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM temporary_registrations WHERE email = $1 AND otp = $2 AND otp_expires_at > NOW()',
            [email, otp]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const tempUser = result.rows[0];

        // Hash the password before saving to the permanent users table
        const hashedPassword = await bcrypt.hash(tempUser.password, 10);

        // Save the user to the main `users` table
        await pool.query(
            'INSERT INTO users (full_name, email, username, password) VALUES ($1, $2, $3, $4)',
            [tempUser.full_name, tempUser.email, tempUser.username, hashedPassword]
        );

        // Delete the temporary registration record
        await pool.query('DELETE FROM temporary_registrations WHERE email = $1', [email]);

        res.status(200).json({ message: 'Email verified and registration complete!' });

    } catch (err) {
        console.error('OTP verification error:', err);
        res.status(500).json({ message: 'Server error during verification' });
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