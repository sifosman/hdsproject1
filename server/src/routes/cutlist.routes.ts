import express, { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { cutlistController } from '../controllers/cutlist.controller';
import { processImageWithOCR, saveImageFile } from '../services/ocr-disabled.service';
import Cutlist from '../models/cutlist.model';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Route to view a cutlist by its ID
router.get('/view/:id', cutlistController.viewCutlistById as RequestHandler);

// Route to update a cutlist's data
router.post('/update/:id', cutlistController.updateCutlistById as RequestHandler);

// Route to reprocess an existing cutlist to fix quantities
router.put('/reprocess/:id', cutlistController.reprocessCutlistById as RequestHandler);

// Route to create a cutlist from n8n data
router.post('/n8n-data', cutlistController.createFromN8nData as RequestHandler);

// Route to get cutlist data as JSON
router.get('/data/:id', cutlistController.getCutlistData as RequestHandler);

// API endpoint to get all cutlists
router.get('/', cutlistController.getAllCutlists as RequestHandler);

// Route to handle image upload and processing
router.post('/process', upload.single('image'), (async (req: Request, res: Response) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Save the image
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const imagePath = await saveImageFile(req.file.buffer, fileExtension);

    // Process the image with OCR
    const ocrResults = await processImageWithOCR(imagePath);

    // Create a new cutlist
    const cutlist = new Cutlist({
      rawText: ocrResults.rawText,
      dimensions: ocrResults.dimensions,
      unit: ocrResults.unit,
      customerName: req.body.customerName || 'Customer',
      projectName: req.body.projectName || 'Cutting List Project',
    });

    // Save the cutlist
    await cutlist.save();

    // Return success
    res.json({
      success: true,
      message: 'Image processed successfully',
      cutlistId: cutlist._id
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ success: false, message: 'Error processing image' });
  }
}) as RequestHandler);

// Route to process the sample cutlist.jpg
router.get('/process-sample', (async (req: Request, res: Response) => {
  try {
    // Get the path to cutlist.jpg in the project root
    const sampleImagePath = path.join(process.cwd(), 'cutlist.jpg');
    
    // Check if the file exists
    if (!fs.existsSync(sampleImagePath)) {
      return res.status(404).json({ success: false, message: 'Sample cutlist.jpg not found' });
    }

    // Process the image with OCR
    const ocrResults = await processImageWithOCR(sampleImagePath);

    // Create a new cutlist
    const cutlist = new Cutlist({
      rawText: ocrResults.rawText,
      dimensions: ocrResults.dimensions,
      unit: ocrResults.unit,
      customerName: 'Sample Customer',
      projectName: 'Sample Cutting List',
    });

    // Save the cutlist
    await cutlist.save();

    // Redirect to the cutlist view
    res.redirect(`/api/cutlist/view/${cutlist._id}`);
  } catch (error) {
    console.error('Error processing sample image:', error);
    res.status(500).json({ success: false, message: 'Error processing sample image' });
  }
}) as RequestHandler);

// Route to test the cutlist feature
router.get('/test', (req: Request, res: Response) => {
  res.redirect('/cutlist-test.html');
});

export default router;
