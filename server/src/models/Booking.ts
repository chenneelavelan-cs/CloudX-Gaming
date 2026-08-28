import mongoose, { Schema, Document, Types } from 'mongoose';

export type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface IBooking extends Document {
  referenceCode: string;
  customerId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  gamingOptionId: Types.ObjectId;
  resourceId?: Types.ObjectId;
  playerCount: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  durationMinutes: number;
  suggestedPrice?: number;
  status: BookingStatus;
  notes?: string;
  source: 'admin' | 'customer';
  gamingEntryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    referenceCode: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    gamingOptionId: { type: Schema.Types.ObjectId, ref: 'GamingOption', required: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'GamingResource' },
    playerCount: { type: Number, required: true, min: 1 },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    suggestedPrice: { type: Number },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'started', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    notes: { type: String },
    source: { type: String, enum: ['admin', 'customer'], default: 'admin' },
    gamingEntryId: { type: Schema.Types.ObjectId, ref: 'GamingEntry' },
  },
  { timestamps: true }
);

bookingSchema.index({ scheduledStart: 1, status: 1 });
bookingSchema.index({ resourceId: 1, scheduledStart: 1, scheduledEnd: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
