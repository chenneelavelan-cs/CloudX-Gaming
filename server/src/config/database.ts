import mongoose from 'mongoose';
import { config } from '../config';
import { Customer } from '../models/Customer';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  await Customer.syncIndexes();
  console.log('Connected to MongoDB');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
