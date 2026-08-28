import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGamingOption extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  supportsPlayerPricing: boolean;
  membershipDiscountPercent: number;
  minPlayers: number;
  maxPlayers: number;
  minDurationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const gamingOptionSchema = new Schema<IGamingOption>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    icon: { type: String },
    supportsPlayerPricing: { type: Boolean, default: false },
    membershipDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    minPlayers: { type: Number, default: 1 },
    maxPlayers: { type: Number, default: 4 },
    minDurationMinutes: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GamingOption = mongoose.model<IGamingOption>('GamingOption', gamingOptionSchema);

export interface IGamingResource extends Document {
  name: string;
  code: string;
  description?: string;
  supportedOptionIds: Types.ObjectId[];
  capabilities?: {
    gpu?: string;
    hasDrivingSetup?: boolean;
    hasVR?: boolean;
  };
  bufferMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const gamingResourceSchema = new Schema<IGamingResource>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    supportedOptionIds: [{ type: Schema.Types.ObjectId, ref: 'GamingOption' }],
    capabilities: {
      gpu: { type: String },
      hasDrivingSetup: { type: Boolean },
      hasVR: { type: Boolean },
    },
    bufferMinutes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GamingResource = mongoose.model<IGamingResource>('GamingResource', gamingResourceSchema);
