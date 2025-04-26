require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use('/api', apiRoutes);

// Serve static files for frontend and admin if needed
app.use('/frontend', express.static(path.join(__dirname, '../../frontend/build')));
app.use('/admin', express.static(path.join(__dirname, '../../admin/build')));

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('MongoDB connected');
  // Start server
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}).catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});
