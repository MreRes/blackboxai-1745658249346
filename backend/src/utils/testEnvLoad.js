require('dotenv').config();

console.log('Testing environment variable loading:');
console.log('JWT_SECRET:', process.env.JWT_SECRET || 'Not Found');
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'Not Found');
console.log('PORT:', process.env.PORT || 'Not Found');
