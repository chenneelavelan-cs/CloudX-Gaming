import mongoose, { Schema, Document, Types } from 'mongoose';

export type GamingEntryStatus = 'active' | 'completed' | 'cancelled';

export interface IExtensionRecord {
  extendedAt: Date;
  addedMinutes: number;
  previousEndAt: Date;
  newEndAt: Date;
  previousPrice: number;
  newPrice: number;
}

export interface IGamingEntry extends Document {
  customerId?: Types.ObjectId;
  customerName?: string;
  bookingId?: Types.ObjectId;
  gamingOptionId: Types.ObjectId;
  resourceId: Types.ObjectId;
  playerCount: number;
  startedAt: Date;
  expectedEndAt: Date;
  endedAt?: Date;
  durationMinutes: number;
  actualDurationMinutes?: number;
  calculatedPrice: number;
  priceOverride?: number;
  finalPrice: number;
  status: GamingEntryStatus;
  extensionHistory: IExtensionRecord[];
  notes?: string;
  billId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const gamingEntrySchema = new Schema<IGamingEntry>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, trim: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    gamingOptionId: { type: Schema.Types.ObjectId, ref: 'GamingOption', required: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'GamingResource', required: true },
    playerCount: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, required: true },
    expectedEndAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMinutes: { type: Number, required: true },
    actualDurationMinutes: { type: Number },
    calculatedPrice: { type: Number, required: true },
    priceOverride: { type: Number },
    finalPrice: { type: Number, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    extensionHistory: [
      {
        extendedAt: { type: Date, required: true },
        addedMinutes: { type: Number, required: true },
        previousEndAt: { type: Date, required: true },
        newEndAt: { type: Date, required: true },
        previousPrice: { type: Number, required: true },
        newPrice: { type: Number, required: true },
      },
    ],
    notes: { type: String },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill' },
  },
  { timestamps: true }
);

gamingEntrySchema.index({ status: 1, expectedEndAt: 1 });
gamingEntrySchema.index({ resourceId: 1, status: 1 });

export const GamingEntry = mongoose.model<IGamingEntry>('GamingEntry', gamingEntrySchema);
