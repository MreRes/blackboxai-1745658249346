const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('Environment variables loaded:');
console.log('JWT_SECRET:', process.env.JWT_SECRET || 'Not Found');
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'Not Found');
console.log('PORT:', process.env.PORT || 'Not Found');
console.log('ALL ENV:', process.env);
