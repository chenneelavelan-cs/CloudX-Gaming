import mongoose, { Schema, Document, Types } from 'mongoose';

export type BillItemType = 'gaming' | 'product' | 'combo' | 'custom';
export type PaymentMethod = 'cash' | 'upi';
export type PaymentStatus = 'paid' | 'cancelled';

export interface IBillItem {
  _id?: Types.ObjectId;
  type: BillItemType;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  gamingEntryId?: Types.ObjectId;
  gamingOptionId?: Types.ObjectId;
  productId?: Types.ObjectId;
  comboId?: Types.ObjectId;
  playerCount?: number;
  durationMinutes?: number;
  calculatedPrice?: number;
  isPriceOverridden: boolean;
}

export interface IBill extends Document {
  billNumber: string;
  customerId?: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: IBillItem[];
  linkedBookingIds: Types.ObjectId[];
  linkedGamingEntryIds: Types.ObjectId[];
  subtotal: number;
  discountAmount: number;
  discountDetails?: {
    membershipId?: Types.ObjectId;
    manualDiscount?: number;
    manualDiscountReason?: string;
  };
  taxAmount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const billItemSchema = new Schema<IBillItem>(
  {
    type: { type: String, enum: ['gaming', 'product', 'combo', 'custom'], required: true },
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    gamingEntryId: { type: Schema.Types.ObjectId, ref: 'GamingEntry' },
    gamingOptionId: { type: Schema.Types.ObjectId, ref: 'GamingOption' },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    comboId: { type: Schema.Types.ObjectId, ref: 'Combo' },
    playerCount: { type: Number },
    durationMinutes: { type: Number },
    calculatedPrice: { type: Number },
    isPriceOverridden: { type: Boolean, default: false },
  },
  { _id: true }
);

const billSchema = new Schema<IBill>(
  {
    billNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerPhone: { type: String },
    items: [billItemSchema],
    linkedBookingIds: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
    linkedGamingEntryIds: [{ type: Schema.Types.ObjectId, ref: 'GamingEntry' }],
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    discountDetails: {
      membershipId: { type: Schema.Types.ObjectId, ref: 'CustomerMembership' },
      manualDiscount: { type: Number },
      manualDiscountReason: { type: String },
    },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi'] },
    paymentStatus: { type: String, enum: ['paid', 'cancelled'], default: 'paid' },
    paidAt: { type: Date },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

billSchema.index({ paymentStatus: 1, paidAt: 1 });
billSchema.index({ createdAt: -1 });

export const Bill = mongoose.model<IBill>('Bill', billSchema);
