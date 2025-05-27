import mongoose from 'mongoose';

// Define the dimension schema
const DimensionSchema = new mongoose.Schema({
  width: {
    type: Number,
    required: true
  },
  length: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  description: {
    type: String,
    default: ''
  }
});

// Define the cutting list schema
const CutlistSchema = new mongoose.Schema({
  rawText: {
    type: String,
    required: true
  },
  dimensions: [DimensionSchema],
  unit: {
    type: String,
    default: 'mm'
  },
  customerName: {
    type: String,
    default: 'Customer'
  },
  projectName: {
    type: String,
    default: 'Cutting List Project'
  },
  phoneNumber: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
CutlistSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Cutlist = mongoose.model('Cutlist', CutlistSchema);

export default Cutlist;
