import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const lessonsResult = await pool.query('SELECT * FROM lessons ORDER BY id');
    const lessons = [];

    for (const lesson of lessonsResult.rows) {
      const questionsResult = await pool.query('SELECT * FROM questions WHERE lesson_id=$1', [lesson.id]);
      const questions = [];

      for (const question of questionsResult.rows) {
        const optionsResult = await pool.query('SELECT * FROM options WHERE question_id=$1 ORDER BY id', [question.id]);
        questions.push({
          id: question.id,
          text: question.text,
          correctAnswer: question.correct_answer,
          image: question.image_url,
          options: optionsResult.rows.map(o => o.option_text)
        });
      }

      lessons.push({ id: lesson.id, title: lesson.title, questions });
    }

    res.status(200).json({ lessons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
