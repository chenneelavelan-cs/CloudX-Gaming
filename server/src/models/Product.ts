import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: string;
  description?: string;
  mustTry?: boolean;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, lowercase: true, default: 'other' },
    description: { type: String },
    mustTry: { type: Boolean, default: false },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', productSchema);

export interface IComboItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICombo extends Document {
  name: string;
  description?: string;
  mustTry?: boolean;
  items: IComboItem[];
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const comboSchema = new Schema<ICombo>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    mustTry: { type: Boolean, default: false },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Combo = mongoose.model<ICombo>('Combo', comboSchema);
