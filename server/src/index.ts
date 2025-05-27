import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import optimizerRoutes from './routes/optimizer.routes';
import projectRoutes from './routes/project.routes';
import botsailorRoutes from './routes/botsailor.routes';
import ocrRoutes from './routes/ocr.routes';
import cutlistRoutes from './routes/cutlist.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static('public'));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/freecut';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/optimizer', optimizerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/botsailor', botsailorRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/cutlist', cutlistRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HDS Group Cutlist API',
    version: '1.3.0',
    endpoints: [
      '/api/optimizer',
      '/api/projects',
      '/api/botsailor',
      '/api/ocr',
      '/api/cutlist'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
