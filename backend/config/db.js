const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linkflow';
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB Database.');
  } catch (err) {
    console.error('MongoDB database connection error:', err.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    } else {
      throw err;
    }
  }
};

module.exports = connectDB;
