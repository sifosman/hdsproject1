import mongoose, { Schema, Document } from 'mongoose';

// Interface for Botsailor connection settings
export interface IBotsailorConnection extends Document {
  apiUrl: string;
  apiKey: string;
  isConnected: boolean;
  lastSyncTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Botsailor material
export interface IBotsailorMaterial extends Document {
  externalId: string;
  name: string;
  type: string;
  thickness: number;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Botsailor stock piece
export interface IBotsailorStockPiece extends Document {
  externalId: string;
  materialId: string;
  width: number;
  length: number;
  quantity: number;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Botsailor sync log
export interface IBotsailorSyncLog extends Document {
  direction: 'push' | 'pull';
  entityType: 'project' | 'material' | 'stock' | 'cutlist';
  entityId: string;
  status: 'success' | 'failed';
  message: string;
  details: Record<string, any>;
  createdAt: Date;
}

// Schema for Botsailor connection settings
const BotsailorConnectionSchema: Schema = new Schema({
  apiUrl: { type: String, required: true },
  apiKey: { type: String, required: true },
  isConnected: { type: Boolean, default: false },
  lastSyncTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema for Botsailor material
const BotsailorMaterialSchema: Schema = new Schema({
  externalId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  thickness: { type: Number, required: true },
  properties: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema for Botsailor stock piece
const BotsailorStockPieceSchema: Schema = new Schema({
  externalId: { type: String, required: true, unique: true },
  materialId: { type: String, required: true },
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  properties: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema for Botsailor sync log
const BotsailorSyncLogSchema: Schema = new Schema({
  direction: { type: String, enum: ['push', 'pull'], required: true },
  entityType: { type: String, enum: ['project', 'material', 'stock', 'cutlist'], required: true },
  entityId: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  message: { type: String },
  details: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

// Create and export models
export const BotsailorConnection = mongoose.model<IBotsailorConnection>('BotsailorConnection', BotsailorConnectionSchema);
export const BotsailorMaterial = mongoose.model<IBotsailorMaterial>('BotsailorMaterial', BotsailorMaterialSchema);
export const BotsailorStockPiece = mongoose.model<IBotsailorStockPiece>('BotsailorStockPiece', BotsailorStockPieceSchema);
export const BotsailorSyncLog = mongoose.model<IBotsailorSyncLog>('BotsailorSyncLog', BotsailorSyncLogSchema);
