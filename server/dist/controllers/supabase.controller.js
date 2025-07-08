"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_service_1 = __importDefault(require("../services/supabase.service"));
/**
 * Controller for handling Supabase database operations
 */
const supabaseController = {
    /**
     * Test connection to Supabase
     */
    testConnection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connected = yield supabase_service_1.default.checkConnection();
                if (connected) {
                    return res.status(200).json({ success: true, message: 'Successfully connected to Supabase' });
                }
                else {
                    return res.status(500).json({ success: false, message: 'Failed to connect to Supabase' });
                }
            }
            catch (error) {
                console.error('Error testing Supabase connection:', error);
                return res.status(500).json({ success: false, message: 'Error connecting to Supabase' });
            }
        });
    },
    /**
     * Get product details from Supabase
     */
    getProductDetails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productCode } = req.params;
                if (!productCode) {
                    return res.status(400).json({ success: false, message: 'Product code is required' });
                }
                const result = yield supabase_service_1.default.getProductDetails(productCode);
                if (!result.success) {
                    return res.status(404).json({ success: false, message: result.error || 'Product not found' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error fetching product details:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Get product pricing from Supabase
     */
    getProductPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productCode } = req.params;
                if (!productCode) {
                    return res.status(400).json({ success: false, message: 'Product code is required' });
                }
                const result = yield supabase_service_1.default.getProductPricing(productCode);
                if (!result.success) {
                    return res.status(404).json({ success: false, message: result.error || 'Product pricing not found' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error fetching product pricing:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Create a quote in Supabase
     */
    createQuote(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const quoteData = req.body;
                // Validate required fields
                if (!quoteData.customerName || !quoteData.customerTelephone || !quoteData.items || quoteData.items.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Missing required fields: customerName, customerTelephone, items'
                    });
                }
                const result = yield supabase_service_1.default.createQuote(quoteData);
                if (!result.success) {
                    return res.status(500).json({ success: false, message: result.error || 'Failed to create quote' });
                }
                return res.status(201).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error creating quote:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Update quote status
     */
    updateQuoteStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { quoteNumber } = req.params;
                const { status } = req.body;
                if (!quoteNumber) {
                    return res.status(400).json({ success: false, message: 'Quote number is required' });
                }
                if (!status || !['sent', 'pending', 'approved', 'rejected'].includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Valid status is required: sent, pending, approved, rejected'
                    });
                }
                const result = yield supabase_service_1.default.updateQuoteStatus(quoteNumber, status);
                if (!result.success) {
                    return res.status(500).json({ success: false, message: result.error || 'Failed to update quote status' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error updating quote status:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Create an invoice from a quote
     */
    createInvoice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { quoteNumber } = req.params;
                const paymentDetails = req.body;
                if (!quoteNumber) {
                    return res.status(400).json({ success: false, message: 'Quote number is required' });
                }
                const result = yield supabase_service_1.default.createInvoice(quoteNumber, paymentDetails);
                if (!result.success) {
                    return res.status(500).json({ success: false, message: result.error || 'Failed to create invoice' });
                }
                return res.status(201).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error creating invoice:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Update invoice status
     */
    updateInvoiceStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { invoiceNumber } = req.params;
                const { status } = req.body;
                if (!invoiceNumber) {
                    return res.status(400).json({ success: false, message: 'Invoice number is required' });
                }
                if (!status || !['pending', 'paid', 'overdue', 'cancelled'].includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Valid status is required: pending, paid, overdue, cancelled'
                    });
                }
                const result = yield supabase_service_1.default.updateInvoiceStatus(invoiceNumber, status);
                if (!result.success) {
                    return res.status(500).json({ success: false, message: result.error || 'Failed to update invoice status' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error updating invoice status:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Process payment and create invoice
     */
    processPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { quoteNumber, paymentDetails } = req.body;
                if (!quoteNumber) {
                    return res.status(400).json({ success: false, message: 'Quote number is required' });
                }
                // Create invoice from quote
                const result = yield supabase_service_1.default.createInvoice(quoteNumber, paymentDetails || {});
                if (!result.success) {
                    return res.status(500).json({ success: false, message: result.error || 'Failed to create invoice' });
                }
                // Mark invoice as paid if payment was successful
                const invoiceNumber = result.data.invoiceNumber;
                yield supabase_service_1.default.updateInvoiceStatus(invoiceNumber, 'paid');
                return res.status(200).json({
                    success: true,
                    message: 'Payment processed and invoice created successfully',
                    data: {
                        invoiceNumber,
                        status: 'paid',
                        timestamp: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                console.error('Error processing payment:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    },
    /**
     * Get material options for cascading dropdowns
     */
    getMaterialOptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_service_1.default.getMaterialOptions();
                if (!result.success) {
                    return res.status(404).json({ success: false, message: result.error || 'Material options not found' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error fetching material options:', error);
                return res.status(500).json({ success: false, message: error.message || 'Server error' });
            }
        });
    },
    /**
     * Get all product descriptions
     */
    getProductDescriptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_service_1.default.getProductDescriptions();
                if (!result.success) {
                    return res.status(404).json({ success: false, message: result.error || 'Product descriptions not found' });
                }
                return res.status(200).json({ success: true, data: result.data });
            }
            catch (error) {
                console.error('Error fetching product descriptions:', error);
                return res.status(500).json({ success: false, message: error.message });
            }
        });
    }
};
exports.default = supabaseController;
