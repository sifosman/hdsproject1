import express, { Request, Response } from 'express';
import supabaseController from '../controllers/supabase.controller';

const router = express.Router();

// Test connection to Supabase
router.get('/test', function(req: Request, res: Response) {
  supabaseController.testConnection(req, res);
});

// Product routes
router.get('/products/:productCode', function(req: Request, res: Response) {
  supabaseController.getProductDetails(req, res);
});

router.get('/products/:productCode/pricing', function(req: Request, res: Response) {
  supabaseController.getProductPricing(req, res);
});

// Quote routes
router.post('/quotes', function(req: Request, res: Response) {
  supabaseController.createQuote(req, res);
});

router.patch('/quotes/:quoteNumber/status', function(req: Request, res: Response) {
  supabaseController.updateQuoteStatus(req, res);
});

// Invoice routes
router.post('/invoices/from-quote/:quoteNumber', function(req: Request, res: Response) {
  supabaseController.createInvoice(req, res);
});

router.patch('/invoices/:invoiceNumber/status', function(req: Request, res: Response) {
  supabaseController.updateInvoiceStatus(req, res);
});

// Payment processing
router.post('/payments/process', function(req: Request, res: Response) {
  supabaseController.processPayment(req, res);
});

// Material options for cascading dropdowns
router.get('/materials/options', function(req: Request, res: Response) {
  supabaseController.getMaterialOptions(req, res);
});

// Get all product descriptions for material dropdown
router.get('/products/descriptions', function(req: Request, res: Response) {
  supabaseController.getProductDescriptions(req, res);
});

export default router;
