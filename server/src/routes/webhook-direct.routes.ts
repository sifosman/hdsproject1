import express, { RequestHandler } from 'express';
import { webhookDirectController } from '../controllers/webhook-direct.controller';

const router = express.Router();

// Test the webhook directly
router.get('/test', webhookDirectController.testWebhook as unknown as RequestHandler);

// Process n8n data directly
router.post('/n8n-direct', webhookDirectController.processN8n as unknown as RequestHandler);

export default router;
