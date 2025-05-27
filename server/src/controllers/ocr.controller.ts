import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as ocrService from '../services/ocr.service';
import * as whatsappService from '../services/whatsapp.service';

// Define a type for the request with file
export interface MulterRequest extends Request {
  file: Express.Multer.File;
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cutlist-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

/**
 * Process a cutting list image using OCR
 * This endpoint accepts an image file and extracts cutting list data using OCR
 */
export const processCutlistImage = async (req: Request, res: Response) => {
  // Use multer middleware to handle the file upload
  const uploadMiddleware = upload.single('image');

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading file',
        error: err.message
      });
    }

    try {
      // Check if file was uploaded
      const multerReq = req as MulterRequest;
      if (!multerReq.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Get additional parameters
      const { phoneNumber, customerName, projectName } = req.body;

      // Process the image with OCR
      const filePath = multerReq.file.path;
      const ocrResults = await ocrService.processImageWithOCR(filePath);

      // Convert OCR results to cutting list data
      const cutlistData = ocrService.convertOCRToCutlistData(ocrResults);

      // Send confirmation to WhatsApp if phone number is provided
      let whatsappResponse = null;
      if (phoneNumber) {
        whatsappResponse = await whatsappService.sendWhatsAppConfirmation(
          phoneNumber,
          cutlistData,
          customerName || 'Customer',
          projectName || 'Cutting List Project'
        );
      }

      // Return the extracted data
      res.status(200).json({
        success: true,
        message: 'Cutting list image processed successfully',
        data: cutlistData,
        rawText: ocrResults.rawText,
        whatsappSent: !!whatsappResponse,
        whatsappResponse,
        imagePath: multerReq.file.path
      });
    } catch (error) {
      console.error('Error processing cutting list image:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing cutting list image',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};

/**
 * Get the status of a previously processed image
 */
export const getProcessingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would check a database or cache for the status
    // For now, we'll just return a mock response

    res.status(200).json({
      success: true,
      id,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting processing status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting processing status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Update cutting list data after OCR processing
 */
export const updateCutlistData = async (req: Request, res: Response) => {
  try {
    const { cutlistData } = req.body;

    if (!cutlistData) {
      return res.status(400).json({
        success: false,
        message: 'No cutlist data provided'
      });
    }

    // In a real implementation, you would save the updated data to a database
    // For now, we'll just return the data as received

    res.status(200).json({
      success: true,
      message: 'Cutlist data updated successfully',
      data: cutlistData
    });
  } catch (error) {
    console.error('Error updating cutlist data:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cutlist data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Send WhatsApp confirmation for a cutting list
 */
export const sendWhatsAppConfirmation = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, cutlistData, customerName, projectName } = req.body;

    if (!phoneNumber || !cutlistData) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and cutlist data are required'
      });
    }

    // Send WhatsApp confirmation
    const whatsappResponse = await whatsappService.sendWhatsAppConfirmation(
      phoneNumber,
      cutlistData,
      customerName || 'Customer',
      projectName || 'Cutting List Project'
    );

    res.status(200).json({
      success: true,
      message: 'WhatsApp confirmation sent successfully',
      whatsappResponse
    });
  } catch (error) {
    console.error('Error sending WhatsApp confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending WhatsApp confirmation',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
