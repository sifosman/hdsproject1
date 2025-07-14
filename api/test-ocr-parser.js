// Direct serverless function to test OCR parsing with the updated logic
// This file bypasses the main server routing to test if our parser is working in production

const { parseOCRText } = require('../server/dist/services/botsailor.service');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the OCR text from the request
    const { ocrText } = req.body || {};
    
    if (!ocrText) {
      // Use test data if no input provided
      const testText = "2000x460=2\n918x460=4\n360x140-8";
      console.log('Using test OCR text:', testText);
      
      const result = parseOCRText(testText);
      
      return res.status(200).json({
        success: true,
        message: 'Parser test successful with test data',
        input: testText,
        output: result,
        parser: 'Updated parser from botsailor.service',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('Testing OCR parser with provided text:', ocrText);
    const result = parseOCRText(ocrText);
    
    return res.status(200).json({
      success: true,
      message: 'OCR text parsed successfully',
      input: ocrText,
      output: result,
      parser: 'Updated parser from botsailor.service',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in OCR parser test:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error testing OCR parser',
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
};
