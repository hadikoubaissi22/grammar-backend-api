import express from 'express';
import pool from '../db.js';

const router = express.Router();

// routes/students.js
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.firstname, s.lastname, s.fathername, s.mothername,
             s.phone, s.class_id, c.name AS class_name, s.created_at
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.id ASC
    `);

    res.json({ students: result.rows }); // now each student has class_name
  } catch (err) {
    console.error('Error fetching students:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Add a new student
router.post('/', async (req, res) => {
  try {
    const { firstname, lastname, fathername, mothername, phone, class_id } = req.body;

    if (!firstname || !lastname) {
      return res.status(400).json({ error: 'First Name and Last Name are required' });
    }

    const result = await pool.query(
      `INSERT INTO students (firstname, lastname, fathername, mothername, phone, class_id,created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [firstname, lastname, fathername,mothername, phone, class_id]
    );

    res.status(201).json({
      message: 'Student created successfully',
      student: result.rows[0],
    });
  } catch (err) {
    console.error('Error creating student:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
