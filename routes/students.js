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

    const studentId = result.rows[0].id;

    res.status(201).json({
      message: 'Student created successfully',
      student: result.rows[0],
    });

    // await pool.query(
    //   `INSERT INTO logs (logs_type, comment, userid, datetime)
    //   VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Beirut')`,
    //   [9, `${req.user.fullname} added new student: ${studentId}`, req.user.id]
    // );

  } catch (err) {
    console.error('Error creating student:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// ✅ Update an existing student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, fathername, mothername, phone, class_id } = req.body;

    // Validation
    if (!firstname || !lastname) {
      return res.status(400).json({ error: 'First Name and Last Name are required' });
    }

    // Check if the student exists
    const existing = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update the student
    const result = await pool.query(
      `UPDATE students 
       SET firstname = $1, lastname = $2, fathername = $3, mothername = $4, phone = $5, class_id = $6
       WHERE id = $7 
       RETURNING *`,
      [firstname, lastname, fathername, mothername, phone, class_id, id]
    );

    res.status(200).json({
      message: 'Student updated successfully',
      student: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating student:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


export default router;
