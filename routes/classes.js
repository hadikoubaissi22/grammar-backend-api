import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /classes
router.get('/classes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM classes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching classes:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
