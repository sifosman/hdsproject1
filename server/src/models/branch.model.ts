import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  trading_as: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  // Add any other fields present in your branches table
}

const BranchSchema: Schema = new Schema({
  trading_as: { type: String, required: true, unique: true },
  name: { type: String },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  // Add any other fields as needed
});

export default mongoose.model<IBranch>('Branch', BranchSchema);
