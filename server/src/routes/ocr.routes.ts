import express, { Router, RequestHandler } from 'express';
import * as ocrController from '../controllers/ocr.controller';

const router: Router = express.Router();

// POST process a cutting list image with OCR
router.post('/process-image', ocrController.processCutlistImage as RequestHandler);

// GET the status of a previously processed image
router.get('/status/:id', ocrController.getProcessingStatus as RequestHandler);

// PUT update cutting list data after OCR processing
router.put('/update', ocrController.updateCutlistData as RequestHandler);

// POST send WhatsApp confirmation for a cutting list
router.post('/send-whatsapp', ocrController.sendWhatsAppConfirmation as RequestHandler);

export default router;
