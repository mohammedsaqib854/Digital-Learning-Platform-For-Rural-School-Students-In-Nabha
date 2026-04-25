const app = require('./app');
const { initializeDb } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Initialize Database
try {
  initializeDb();
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
