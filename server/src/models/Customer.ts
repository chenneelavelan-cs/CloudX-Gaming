import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
  totalVisits: number;
  totalSpending: number;
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String },
    tags: [{ type: String }],
    totalVisits: { type: Number, default: 0 },
    totalSpending: { type: Number, default: 0 },
    lastVisitAt: { type: Date },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text' });
customerSchema.index({ name: 1, phone: 1 }, { unique: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
