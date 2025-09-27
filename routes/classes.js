import express from 'express';
import pool from '../db.js';

const router = express.Router();

// routes/classes.js
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes ORDER BY id ASC');
    res.json({ classes: result.rows }); // ✅ wrap in { classes: [] }
  } catch (err) {
    console.error('Error fetching classes:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// ✅ Add a new class
router.post('/', async (req, res) => {
  try {
    const { name, description, level } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    const result = await pool.query(
      `INSERT INTO classes (name, description, level, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING *`,
      [name, description, level]
    );

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0],
    });
  } catch (err) {
    console.error('Error creating class:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
