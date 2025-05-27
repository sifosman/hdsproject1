import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
import { renderTemplate } from '../services/template.service';

// Import the Cutlist model with CommonJS require to avoid TypeScript module resolution issues
const Cutlist = require('../models/cutlist.model').default;

// Prepare cutlist data for template rendering
const prepareCutlistData = (cutlistData: any) => {
  return {
    dimensions: cutlistData.dimensions || [],
    unit: cutlistData.unit || 'mm',
    rawText: cutlistData.rawText || '',
    customerName: cutlistData.customerName || 'Customer',
    projectName: cutlistData.projectName || 'Cutting List Project',
    id: cutlistData._id
  };
};

// View cutlist by ID
const viewCutlistById = async (req: Request, res: Response) => {
  try {
    const cutlistId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(cutlistId)) {
      return res.status(400).send('Invalid cutting list ID');
    }
    
    const cutlist = await Cutlist.findById(cutlistId);
    
    if (!cutlist) {
      return res.status(404).send('Cutting list not found');
    }
    
    // Prepare data for template
    const templateData = prepareCutlistData(cutlist);
    
    // Render the template
    const htmlContent = await renderTemplate('cutlist-template', templateData);
    
    // Return HTML page
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Error viewing cutting list:', error);
    res.status(500).send('Server error');
  }
};

// Update cutting list by ID
const updateCutlistById = async (req: Request, res: Response) => {
  try {
    const cutlistId = req.params.id;
    const { dimensions } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(cutlistId)) {
      return res.status(400).json({ success: false, message: 'Invalid cutting list ID' });
    }
    
    const cutlist = await Cutlist.findById(cutlistId);
    
    if (!cutlist) {
      return res.status(404).json({ success: false, message: 'Cutting list not found' });
    }
    
    // Update dimensions
    cutlist.dimensions = dimensions;
    await cutlist.save();
    
    res.json({
      success: true,
      message: 'Cutting list updated successfully',
      cutlist
    });
    
  } catch (error) {
    console.error('Error updating cutting list:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get cutlist data as JSON
const getCutlistData = async (req: Request, res: Response) => {
  try {
    const cutlistId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(cutlistId)) {
      return res.status(400).json({ success: false, message: 'Invalid cutting list ID' });
    }
    
    const cutlist = await Cutlist.findById(cutlistId);
    
    if (!cutlist) {
      return res.status(404).json({ success: false, message: 'Cutting list not found' });
    }
    
    res.json({
      success: true,
      cutlist
    });
    
  } catch (error) {
    console.error('Error getting cutlist data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all cutlists
const getAllCutlists = async (req: Request, res: Response) => {
  try {
    const cutlists = await Cutlist.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      cutlists
    });
    
  } catch (error) {
    console.error('Error getting all cutlists:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Export controller as an object with methods
export const cutlistController = {
  viewCutlistById,
  updateCutlistById,
  getCutlistData,
  getAllCutlists
};
