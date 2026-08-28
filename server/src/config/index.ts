import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudx-gaming',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  nodeEnv: process.env.NODE_ENV || 'development',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@cloudxgaming.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  adminName: process.env.ADMIN_NAME || 'CloudX Admin',
  timezone: 'Asia/Kolkata',
};
