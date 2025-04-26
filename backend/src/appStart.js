const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Explicitly load .env from backend root

const app = require('./app');

const port = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
