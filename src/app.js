const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow loading local images/files
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is active' });
});

// Routes
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const aiRoutes = require('./routes/ai.routes');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  // Multer Error Handling
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      status: 'error',
      message: `Upload Error: ${err.message}` 
    });
  }

  // Custom validation errors (e.g., from fileFilter)
  if (err.message === 'Only PDF and DOCX files are allowed') {
    return res.status(400).json({ 
      status: 'error',
      message: err.message 
    });
  }

  // General server errors
  const status = err.status || 500;
  res.status(status).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
