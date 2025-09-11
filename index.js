import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import lessonsRouter from './routes/lessons.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
// app.use('/lessons', lessonsRouter);
app.use("/lessons", authMiddleware, lessonsRouter);
app.use('/api', authRouter);

// Root
app.get('/', (req, res) => {
  res.send('Grammar Backend API is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
