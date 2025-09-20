import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import lessonsRouter from './routes/lessons.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();

// Configure CORS to allow specific origins
const allowedOrigins = [
  'http://localhost:3000', // Your local React app
  'https://grammar-master-weld.vercel' // Replace with your actual frontend Vercel URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions)); // Use the configured options

app.use(express.json());

// Routes
app.use("/lessons", authMiddleware, lessonsRouter);
app.use('/api', authRouter);

// Root
app.get('/', (req, res) => {
  res.send('Grammar Backend API is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));