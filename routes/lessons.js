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

// POST /api/lessons
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title and questions are required" });
    }

    await client.query("BEGIN");

    // Insert lesson
    const lessonResult = await client.query(
      "INSERT INTO lessons (title) VALUES ($1) RETURNING id",
      [title]
    );
    const lessonId = lessonResult.rows[0].id;

    // Insert questions & options
    for (const q of questions) {
      const questionResult = await client.query(
        `INSERT INTO questions (lesson_id, text, correct_answer, image_url) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [lessonId, q.text, q.correctAnswer, q.image || null]
      );
      const questionId = questionResult.rows[0].id;

      for (const opt of q.options) {
        await client.query(
          "INSERT INTO options (question_id, option_text) VALUES ($1, $2)",
          [questionId, opt]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Lesson created successfully", lessonId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
