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
exports.iqRetailController = void 0;
const iqretail_service_1 = __importDefault(require("../services/iqretail.service"));
/**
 * Controller for handling IQ Retail API related requests
 */
exports.iqRetailController = {
    /**
     * Test the connection to IQ Retail API
     */
    testConnection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connected = yield iqretail_service_1.default.checkConnection();
                if (connected) {
                    return res.status(200).json({ success: true, message: 'Successfully connected to IQ Retail API' });
                }
                else {
                    return res.status(500).json({ success: false, message: 'Failed to connect to IQ Retail API' });
                }
            }
            catch (error) {
                console.error('Error testing IQ Retail connection:', error);
                return res.status(500).json({ success: false, message: 'Error connecting to IQ Retail API' });
            }
        });
    },
    /**
     * Get product attributes from IQ Retail
     */
    getProductAttributes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stockCode } = req.params;
                const stockData = yield iqretail_service_1.default.getStockAttributes(stockCode);
                return res.status(200).json({ success: true, data: stockData });
            }
            catch (error) {
                console.error('Error fetching stock data:', error);
                return res.status(500).json({ success: false, message: 'Failed to fetch stock data' });
            }
        });
    },
    /**
     * Get product pricing from IQ Retail
     */
    getProductPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stockCode } = req.params;
                const pricingData = yield iqretail_service_1.default.getStockPricing(stockCode);
                return res.status(200).json({ success: true, data: pricingData });
            }
            catch (error) {
                console.error('Error fetching pricing data:', error);
                return res.status(500).json({ success: false, message: 'Failed to fetch pricing data' });
            }
        });
    },
    /**
     * Create a quote in IQ Retail
     */
    createQuote(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const quoteData = req.body;
                const quote = yield iqretail_service_1.default.createQuote(quoteData);
                return res.status(200).json({ success: true, data: quote });
            }
            catch (error) {
                console.error('Error creating quote:', error);
                return res.status(500).json({ success: false, message: 'Failed to create quote' });
            }
        });
    },
    /**
     * Create a sales order in IQ Retail
     */
    createSalesOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const orderData = req.body;
                const order = yield iqretail_service_1.default.createSalesOrder(orderData);
                return res.status(200).json({ success: true, data: order });
            }
            catch (error) {
                console.error('Error creating sales order:', error);
                return res.status(500).json({ success: false, message: 'Failed to create sales order' });
            }
        });
    },
    /**
     * Create an invoice in IQ Retail
     */
    createInvoice(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const invoiceData = req.body;
                const invoice = yield iqretail_service_1.default.createInvoice(invoiceData);
                return res.status(200).json({ success: true, data: invoice });
            }
            catch (error) {
                console.error('Error creating invoice:', error);
                return res.status(500).json({ success: false, message: 'Failed to create invoice' });
            }
        });
    },
    /**
     * Process payment and create invoice
     * This endpoint handles the full payment confirmation workflow:
     * 1. Creates a sales order from the quote
     * 2. Creates an invoice from the sales order
     * 3. Updates the order status to paid
     */
    processPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { quoteId, paymentDetails } = req.body;
                if (!quoteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Quote ID is required'
                    });
                }
                // Step 1: Create sales order from quote
                const orderData = {
                    quoteId,
                    customerName: req.body.customerName,
                    customerEmail: req.body.customerEmail,
                    items: req.body.items || []
                };
                const orderResult = yield iqretail_service_1.default.createSalesOrder(orderData);
                if (!orderResult || !orderResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create sales order from quote'
                    });
                }
                const orderId = (_a = orderResult.data) === null || _a === void 0 ? void 0 : _a.orderNumber;
                // Step 2: Create invoice from sales order
                const invoiceData = {
                    orderId,
                    paymentMethod: (paymentDetails === null || paymentDetails === void 0 ? void 0 : paymentDetails.method) || 'Credit Card',
                    paymentReference: (paymentDetails === null || paymentDetails === void 0 ? void 0 : paymentDetails.reference) || `Ref-${Date.now()}`,
                    items: req.body.items || []
                };
                const invoiceResult = yield iqretail_service_1.default.createInvoice(invoiceData);
                if (!invoiceResult || !invoiceResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create invoice from sales order'
                    });
                }
                const invoiceId = (_b = invoiceResult.data) === null || _b === void 0 ? void 0 : _b.invoiceNumber;
                return res.status(200).json({
                    success: true,
                    message: 'Payment processed and invoice created successfully',
                    data: {
                        orderId,
                        invoiceId,
                        status: 'PAID',
                        timestamp: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                console.error('Error processing payment:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to process payment and create invoice'
                });
            }
        });
    }
};
exports.default = exports.iqRetailController;
