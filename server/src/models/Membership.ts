import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDiscountRule {
  gamingOptionId?: Types.ObjectId;
  productCategory?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

export interface IMembershipPlan extends Document {
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  discountRules: IDiscountRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    durationDays: { type: Number, required: true },
    price: { type: Number, required: true },
    discountRules: [
      {
        gamingOptionId: { type: Schema.Types.ObjectId, ref: 'GamingOption' },
        productCategory: { type: String },
        discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
        discountValue: { type: Number, required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MembershipPlan = mongoose.model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);

export interface ICustomerMembership extends Document {
  customerId: Types.ObjectId;
  planId: Types.ObjectId;
  startDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const customerMembershipSchema = new Schema<ICustomerMembership>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
);

customerMembershipSchema.index({ customerId: 1, status: 1 });

export const CustomerMembership = mongoose.model<ICustomerMembership>(
  'CustomerMembership',
  customerMembershipSchema
);
