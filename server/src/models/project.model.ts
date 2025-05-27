import mongoose, { Schema, Document } from 'mongoose';

// Piece interface
export interface IPiece {
  width: number;
  length: number;
  amount: number;
  pattern: number; // 0: none, 1: parallel to width, 2: parallel to length
  kind: number;    // 0: cutpiece, 1: stockpiece
}

// Project interface
export interface IProject extends Document {
  name: string;
  description?: string;
  unit: number;    // 0: mm, 1: inch, 2: foot
  layout: number;  // 0: guillotine, 1: nested
  width: number;   // cut width
  pieces: IPiece[];
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Piece schema
const PieceSchema: Schema = new Schema({
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  amount: { type: Number, required: true, default: 1 },
  pattern: { type: Number, required: true, default: 0 },
  kind: { type: Number, required: true, default: 0 }
});

// Project schema
const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  unit: { type: Number, required: true, default: 0 },
  layout: { type: Number, required: true, default: 0 },
  width: { type: Number, required: true, default: 3 },
  pieces: [PieceSchema],
  userId: { type: String },
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
