import express, { Router, RequestHandler } from 'express';
import * as ocrController from '../controllers/ocr.controller';

const router: Router = express.Router();

// POST process a cutting list image with OCR
router.post('/process-image', ocrController.processCutlistImage as RequestHandler);

// POST receive OCR data from n8n workflow
router.post('/n8n-data', ocrController.processN8nOcrData as RequestHandler);

// TEST endpoint that should be accessible via GET for troubleshooting
router.get('/n8n-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'N8N test endpoint is working!',
    timestamp: new Date().toISOString()
  });
});

// GET the status of a previously processed image
router.get('/status/:id', ocrController.getProcessingStatus as RequestHandler);

// PUT update cutting list data after OCR processing
router.put('/update', ocrController.updateCutlistData as RequestHandler);

// POST send WhatsApp confirmation for a cutting list
router.post('/send-whatsapp', ocrController.sendWhatsAppConfirmation as RequestHandler);

export default router;
