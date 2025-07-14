// ocr-parser.js - Serverless API endpoint for OCR parsing
// This file provides direct access to the improved OCR parser logic

const express = require('express');
const cors = require('cors');

// Create the router
const router = express.Router();
router.use(cors());
router.use(express.json());

// Import our custom parser logic directly
// Define the OCR parser directly in this file to ensure it's available in the serverless function
function parseOCRText(text) {
  console.log('API: Running improved OCR parser logic');
  const result = {
    stockPieces: [],
    cutPieces: [],
    materials: [],
    unit: 'mm' // Default unit
  };

  const lines = text.split('\n').filter(line => line.trim() !== '');
  console.log(`Processing ${lines.length} lines of text...`);

  // More robust regex patterns to find dimensions and quantities
  const dimensionPatterns = [
    // Pattern 1: 1000x500=2, 1000 x 500 = 2, 1000*500=2, etc.
    /(\d+)\s*[xX×*]\s*(\d+)\s*[=\-\s]\s*(\d+)/,
    // Pattern 2: 1000x500 (2), 1000 x 500 (2)
    /(\d+)\s*[xX×*]\s*(\d+)\s*\((\d+)\)/,
    // Pattern 3: 1000x500 2pcs, 1000x500 2 pc, etc.
    /(\d+)\s*[xX×*]\s*(\d+)\s+(\d+)\s*(?:pcs?|pieces?|pce|szt|x)/i,
    // Pattern 4: 1000x500, quantity is on the same line but separated
    /(\d+)\s*[xX×*]\s*(\d+)/, // fallback no qty
  ];

  lines.forEach((line, index) => {
    console.log(`Line ${index + 1}: "${line}"`);
    let matched = false;
    let width = 0;
    let length = 0;
    let quantity = 0;

    // Try each pattern until one matches
    for (const pattern of dimensionPatterns) {
      const match = line.match(pattern);
      if (match) {
        width = parseInt(match[1]);
        length = parseInt(match[2]);
        quantity = match[3] ? parseInt(match[3]) : 0;
        matched = true;
        console.log(`  Pattern matched: width=${width}, length=${length}, quantity=${quantity}`);
        break;
      }
    }

    // Fallback: if no pattern matched, try simple numeric extraction
    if (!matched) {
      const nums = line.match(/\d+/g)?.map(n => parseInt(n));
      if (nums && nums.length >= 2) {
        width = nums[0];
        length = nums[1];
        quantity = nums[2] ?? 1;
        matched = true;
        console.log(`Fallback numeric parse -> width ${width}, length ${length}, quantity ${quantity}`);
      }
    }

    if (matched && width > 0 && length > 0) {
      // If quantity is still not found, try to extract from remainder of line
      if (quantity === 0) {
        const remainder = line.substring(line.indexOf(length.toString()) + length.toString().length).trim();
        console.log(`No quantity in main pattern. Checking remainder: "${remainder}"`);
        const quantityMatch = remainder.match(/([0-9]+)/);
        if (quantityMatch && quantityMatch[1]) {
          quantity = parseInt(quantityMatch[1]);
          console.log(`Found quantity in remainder: ${quantity}`);
        }
      }

      // If still no quantity found, default to 1
      if (quantity === 0) {
        quantity = 1;
        console.log('No quantity found, defaulting to 1');
      }

      // Add to cut pieces
      result.cutPieces.push({
        width: Math.min(width, length), // Always put smaller dimension as width
        length: Math.max(width, length), // Always put larger dimension as length
        quantity: quantity,
        description: line.trim()
      });

      console.log(`  Added: ${width}x${length}, quantity=${quantity}`);
    } else {
      console.log('  No dimension pattern matched');
    }
  });

  return result;
}

// Define the API endpoint
router.post('/parse', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OCR text provided' 
      });
    }
    
    console.log('Received OCR text for parsing:', text);
    const result = parseOCRText(text);
    
    return res.json({
      success: true,
      result: result,
      message: 'OCR text parsed successfully'
    });
  } catch (error) {
    console.error('Error parsing OCR text:', error);
    return res.status(500).json({
      success: false,
      message: 'Error parsing OCR text',
      error: error.message
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  const testText = "2000x 460=2\n918x460=4\n360x140-8";
  const result = parseOCRText(testText);
  return res.json({
    success: true,
    message: 'OCR parser test',
    testText,
    result
  });
});

module.exports = router;
