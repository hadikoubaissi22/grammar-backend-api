import express from "express";
import pool from "../db.js";
import NodeCache from "node-cache";

const router = express.Router();

// Initialize NodeCache (TTL = 600 sec = 10 min)
const cache = new NodeCache({ stdTTL: 600 });

// GET all lessons (with cache)
router.get("/", async (req, res) => {
  try {
    // Check cache first
    const cachedLessons = cache.get("lessons");
    if (cachedLessons) {
      console.log("Serving lessons from cache");
      return res.status(200).json(cachedLessons);
    }

    // If not cached → fetch from DB
    const lessonsResult = await pool.query("SELECT * FROM lessons ORDER BY id");
    const lessons = [];

    for (const lesson of lessonsResult.rows) {
      const questionsResult = await pool.query(
        "SELECT * FROM questions WHERE lesson_id=$1",
        [lesson.id]
      );

      const questions = [];
      for (const question of questionsResult.rows) {
        const optionsResult = await pool.query(
          "SELECT * FROM options WHERE question_id=$1 ORDER BY id",
          [question.id]
        );

        questions.push({
          id: question.id,
          text: question.text,
          correctAnswer: question.correct_answer,
          image: question.image_url,
          options: optionsResult.rows.map((o) => o.option_text),
        });
      }

      lessons.push({ id: lesson.id, title: lesson.title, questions });
    }

    const responseData = { lessons };

    // Save to cache
    cache.set("lessons", responseData);

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST new lesson (invalidate cache after insert)
router.post("/", async (req, res) => {
  try {
    const { title, questions } = req.body;

    const lessonResult = await pool.query(
      "INSERT INTO lessons(title) VALUES($1) RETURNING id",
      [title]
    );
    const lessonId = lessonResult.rows[0].id;

    for (const q of questions) {
      const questionResult = await pool.query(
        "INSERT INTO questions(lesson_id, text, correct_answer, image_url) VALUES($1, $2, $3, $4) RETURNING id",
        [lessonId, q.text, q.correctAnswer, q.image || null]
      );
      const questionId = questionResult.rows[0].id;

      for (const optionText of q.options) {
        await pool.query(
          "INSERT INTO options(question_id, option_text) VALUES($1, $2)",
          [questionId, optionText]
        );
      }
    }

    // Clear cache so next GET fetches fresh data
    cache.del("lessons");

    res.status(201).json({ message: "Lesson saved successfully!" });
  } catch (err) {
    console.error("Error saving lesson:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE a lesson (invalidate cache after delete)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM lessons WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Clear cache after delete
    cache.del("lessons");

    res
      .status(200)
      .json({ message: "Lesson deleted successfully", lesson: result.rows[0] });
  } catch (err) {
    console.error("Error deleting lesson:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
