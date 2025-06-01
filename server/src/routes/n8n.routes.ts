import express, { RequestHandler } from 'express';
import { n8nController } from '../controllers/n8n.controller';

const router = express.Router();

// Direct processing route for n8n data without MongoDB dependency
router.post('/process', n8nController.processN8nData as unknown as RequestHandler);

export default router;
