import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPricingTier extends Document {
  gamingOptionId: Types.ObjectId;
  playerCount?: number;
  durationMinutes: number;
  price: number;
  label?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingTierSchema = new Schema<IPricingTier>(
  {
    gamingOptionId: { type: Schema.Types.ObjectId, ref: 'GamingOption', required: true },
    playerCount: { type: Number },
    durationMinutes: { type: Number, required: true },
    price: { type: Number, required: true },
    label: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pricingTierSchema.index({ gamingOptionId: 1, playerCount: 1, durationMinutes: 1 });

export const PricingTier = mongoose.model<IPricingTier>('PricingTier', pricingTierSchema);
