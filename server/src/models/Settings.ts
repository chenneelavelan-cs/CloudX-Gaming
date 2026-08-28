import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  businessName: string;
  timezone: string;
  currency: string;
  taxEnabled: boolean;
  taxPercentage: number;
  sessionExtensionOptions: number[];
  sessionWarningThresholds: {
    endingSoonMinutes: number;
    almostEndedMinutes: number;
  };
  billNumberPrefix: string;
  billNumberCounter: number;
  operatingHours?: {
    open: string;
    close: string;
  };
}

const settingsSchema = new Schema<ISettings>({
  key: { type: String, default: 'global', unique: true },
  businessName: { type: String, default: 'CloudX Gaming' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  taxEnabled: { type: Boolean, default: false },
  taxPercentage: { type: Number, default: 0 },
  sessionExtensionOptions: { type: [Number], default: [30, 60] },
  sessionWarningThresholds: {
    endingSoonMinutes: { type: Number, default: 15 },
    almostEndedMinutes: { type: Number, default: 5 },
  },
  billNumberPrefix: { type: String, default: 'BILL' },
  billNumberCounter: { type: Number, default: 0 },
  operatingHours: {
    open: { type: String, default: '10:00' },
    close: { type: String, default: '23:00' },
  },
});

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export async function getSettings(): Promise<ISettings> {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create({ key: 'global' });
  }
  return settings;
}

export async function getNextBillNumber(): Promise<string> {
  const settings = await Settings.findOneAndUpdate(
    { key: 'global' },
    { $inc: { billNumberCounter: 1 } },
    { new: true, upsert: true }
  );
  const year = new Date().getFullYear();
  const counter = String(settings!.billNumberCounter).padStart(4, '0');
  return `${settings!.billNumberPrefix}-${year}-${counter}`;
}
