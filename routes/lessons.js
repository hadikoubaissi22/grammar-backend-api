import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/lessons
router.get('/', async (req, res) => {
  try {
    const classid = req.user.classid; // ✅ from token

    const lessonsResult = await pool.query(
      'SELECT * FROM lessons WHERE classid=$1 ORDER BY id',
      [classid]
    );

    const lessons = [];

    for (const lesson of lessonsResult.rows) {
      const questionsResult = await pool.query(
        'SELECT * FROM questions WHERE lesson_id=$1',
        [lesson.id]
      );

      const questions = [];

      for (const question of questionsResult.rows) {
        const optionsResult = await pool.query(
          'SELECT * FROM options WHERE question_id=$1 ORDER BY id',
          [question.id]
        );

        questions.push({
          id: question.id,
          text: question.text,
          correctAnswer: question.correct_answer,
          image: question.image_url,
          options: optionsResult.rows.map(o => o.option_text)
        });
      }

      lessons.push({ id: lesson.id, title: lesson.title, classId: lesson.classid,questions });
    }

    res.status(200).json({ lessons });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// POST /api/lessons
router.post('/', async (req, res) => {
  try {
    const { title, classId, questions } = req.body; // ✅ receive classId

    // ✅ Insert lesson with classId
    const lessonResult = await pool.query(
      'INSERT INTO lessons(title, classid) VALUES($1, $2) RETURNING id',
      [title, classId]
    );
    const lessonId = lessonResult.rows[0].id;

    // Insert questions
    for (const q of questions) {
      const questionResult = await pool.query(
        `INSERT INTO questions(lesson_id, text, correct_answer, image_url) 
         VALUES($1, $2, $3, $4) RETURNING id`,
        [lessonId, q.text, q.correctAnswer, q.image || null]
      );

      const questionId = questionResult.rows[0].id;

      for (const optionText of q.options) {
        await pool.query(
          'INSERT INTO options(question_id, option_text) VALUES($1, $2)',
          [questionId, optionText]
        );
      }
    }

    // Log
    await pool.query(
      `INSERT INTO logs (logs_type, comment, userid, datetime)
      VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Beirut')`,
      [6, `${req.user.fullname} added new lesson ${lessonId}`, req.user.id]
    );

    res.status(201).json({ message: 'Lesson saved successfully!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// DELETE a lesson by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the lesson (questions + options will be deleted automatically because of ON DELETE CASCADE)
    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    await pool.query(
      `INSERT INTO logs (logs_type, comment, userid, datetime)
      VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Beirut')`,
      [7, `${req.user.fullname} deleted lesson ${id}`, req.user.id]
    );

    res.status(200).json({ message: 'Lesson deleted successfully', lesson: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/lessons/:id
router.put('/:id', async (req, res) => {
  const lessonId = req.params.id;
  const { title, questions } = req.body;

  try {
    // 1️⃣ Update lesson title
    await pool.query('UPDATE lessons SET title=$1 WHERE id=$2', [title, lessonId]);

    // 2️⃣ Get existing questions from DB
    const existingQuestionsResult = await pool.query(
      'SELECT id FROM questions WHERE lesson_id=$1',
      [lessonId]
    );
    const existingQuestionIds = existingQuestionsResult.rows.map(q => q.id);

    const updatedQuestionIds = [];

    // 3️⃣ Insert/update questions
    for (const q of questions) {
      let questionId;
      if (q.id && existingQuestionIds.includes(q.id)) {
        // Update existing question
        await pool.query(
          'UPDATE questions SET text=$1, correct_answer=$2, image_url=$3 WHERE id=$4',
          [q.text, q.correctAnswer, q.image || null, q.id]
        );
        questionId = q.id;
      } else {
        // Insert new question
        const questionResult = await pool.query(
          'INSERT INTO questions(lesson_id, text, correct_answer, image_url) VALUES($1, $2, $3, $4) RETURNING id',
          [lessonId, q.text, q.correctAnswer, q.image || null]
        );
        questionId = questionResult.rows[0].id;
      }

      updatedQuestionIds.push(questionId);

      // 4️⃣ Delete old options for this question
      await pool.query('DELETE FROM options WHERE question_id=$1', [questionId]);

      // 5️⃣ Insert new options
      for (const optionText of q.options) {
        await pool.query(
          'INSERT INTO options(question_id, option_text) VALUES($1, $2)',
          [questionId, optionText]
        );
      }
    }

    // 6️⃣ Delete questions that were removed
    const questionsToDelete = existingQuestionIds.filter(id => !updatedQuestionIds.includes(id));
    if (questionsToDelete.length > 0) {
      await pool.query('DELETE FROM questions WHERE id = ANY($1)', [questionsToDelete]);
    }

    await pool.query(
      `INSERT INTO logs (logs_type, comment, userid, datetime)
      VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Beirut')`,
      [8, `${req.user.fullname} updated lesson ${lessonId}`, req.user.id]
    );

    res.status(200).json({ message: 'Lesson updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



export default router;
