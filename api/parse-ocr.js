// Direct serverless function for OCR parsing
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract text from request or use sample
  const text = req.body?.text || "2000x 460=2\n918x460=4\n360x140-8";

  // Parse OCR text to extract cutting list data
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
        }
      }

      if (matched && width > 0 && length > 0) {
        // If quantity is still not found, try to extract from remainder of line
        if (quantity === 0) {
          const remainder = line.substring(line.indexOf(length.toString()) + length.toString().length).trim();
          const quantityMatch = remainder.match(/([0-9]+)/);
          if (quantityMatch && quantityMatch[1]) {
            quantity = parseInt(quantityMatch[1]);
          }
        }

        // If still no quantity found, default to 1
        if (quantity === 0) {
          quantity = 1;
        }

        // Add to cut pieces
        result.cutPieces.push({
          width: Math.min(width, length), // Always put smaller dimension as width
          length: Math.max(width, length), // Always put larger dimension as length
          quantity: quantity,
          description: line.trim()
        });
      }
    });

    return result;
  }

  try {
    // Parse the OCR text
    const result = parseOCRText(text);
    
    // Return the parsed result
    return res.json({
      success: true,
      text,
      result,
      message: 'OCR text parsed successfully'
    });
  } catch (error) {
    console.error('Error parsing OCR text:', error);
    return res.status(500).json({
      success: false,
      message: 'Error parsing OCR text',
      error: error.message || String(error)
    });
  }
};
