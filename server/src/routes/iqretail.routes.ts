import { Router } from 'express';
import IQRetailService from '../services/iqretail.service';

const router = Router();

/**
 * @route   GET /api/iqretail/test
 * @desc    Test IQ Retail API connection
 * @access  Private
 */
router.get('/test', async (req, res) => {
  try {
    const connected = await IQRetailService.checkConnection();
    if (connected) {
      return res.status(200).json({ success: true, message: 'Successfully connected to IQ Retail API' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to connect to IQ Retail API' });
    }
  } catch (error) {
    console.error('Error testing IQ Retail connection:', error);
    return res.status(500).json({ success: false, message: 'Error connecting to IQ Retail API' });
  }
});

/**
 * @route   GET /api/iqretail/stock/:stockCode
 * @desc    Get stock attributes by stock code
 * @access  Private
 */
router.get('/stock/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    const stockData = await IQRetailService.getStockAttributes(stockCode);
    return res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stock data' });
  }
});

/**
 * @route   GET /api/iqretail/pricing/:stockCode
 * @desc    Get stock pricing by stock code
 * @access  Private
 */
router.get('/pricing/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    const pricingData = await IQRetailService.getStockPricing(stockCode);
    return res.status(200).json({ success: true, data: pricingData });
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pricing data' });
  }
});

/**
 * @route   POST /api/iqretail/quote
 * @desc    Create a quote in IQ Retail
 * @access  Private
 */
router.post('/quote', async (req, res) => {
  try {
    const quoteData = req.body;
    const quote = await IQRetailService.createQuote(quoteData);
    return res.status(200).json({ success: true, data: quote });
  } catch (error) {
    console.error('Error creating quote:', error);
    return res.status(500).json({ success: false, message: 'Failed to create quote' });
  }
});

/**
 * @route   POST /api/iqretail/order
 * @desc    Create a sales order in IQ Retail
 * @access  Private
 */
router.post('/order', async (req, res) => {
  try {
    const orderData = req.body;
    const order = await IQRetailService.createSalesOrder(orderData);
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Error creating sales order:', error);
    return res.status(500).json({ success: false, message: 'Failed to create sales order' });
  }
});

/**
 * @route   POST /api/iqretail/invoice
 * @desc    Create an invoice in IQ Retail
 * @access  Private
 */
router.post('/invoice', async (req, res) => {
  try {
    const invoiceData = req.body;
    const invoice = await IQRetailService.createInvoice(invoiceData);
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
});

export default router;
