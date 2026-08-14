import mongoose from 'mongoose';

let cachedConnection = null;

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return null;
  }

  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('🍃 [MongoDB] Connected successfully to MongoDB Atlas');
    return cachedConnection;
  } catch (err) {
    console.error('❌ [MongoDB] Connection error:', err.message);
    return null;
  }
}

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb'));
}
