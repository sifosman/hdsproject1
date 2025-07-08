"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_controller_1 = __importDefault(require("../controllers/supabase.controller"));
const router = express_1.default.Router();
// Test connection to Supabase
router.get('/test', function (req, res) {
    supabase_controller_1.default.testConnection(req, res);
});
// Product routes
router.get('/products/:productCode', function (req, res) {
    supabase_controller_1.default.getProductDetails(req, res);
});
router.get('/products/:productCode/pricing', function (req, res) {
    supabase_controller_1.default.getProductPricing(req, res);
});
// Quote routes
router.post('/quotes', function (req, res) {
    supabase_controller_1.default.createQuote(req, res);
});
router.patch('/quotes/:quoteNumber/status', function (req, res) {
    supabase_controller_1.default.updateQuoteStatus(req, res);
});
// Invoice routes
router.post('/invoices/from-quote/:quoteNumber', function (req, res) {
    supabase_controller_1.default.createInvoice(req, res);
});
router.patch('/invoices/:invoiceNumber/status', function (req, res) {
    supabase_controller_1.default.updateInvoiceStatus(req, res);
});
// Payment processing
router.post('/payments/process', function (req, res) {
    supabase_controller_1.default.processPayment(req, res);
});
// Material options for cascading dropdowns
router.get('/materials/options', function (req, res) {
    supabase_controller_1.default.getMaterialOptions(req, res);
});
// Get all product descriptions for material dropdown
router.get('/products/descriptions', function (req, res) {
    supabase_controller_1.default.getProductDescriptions(req, res);
});
exports.default = router;
