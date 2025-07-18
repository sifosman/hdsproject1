// API endpoint to re-parse existing cutlist data with improved parsing logic
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
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

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        message: 'Supabase configuration missing'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get cutlist ID from request
    const { cutlistId } = req.body;
    
    if (!cutlistId) {
      return res.status(400).json({
        success: false,
        message: 'Cutlist ID is required'
      });
    }

    // Fetch the existing cutlist data
    const { data: cutlist, error: fetchError } = await supabase
      .from('cutlists')
      .select('*')
      .eq('_id', cutlistId)
      .single();

    if (fetchError || !cutlist) {
      return res.status(404).json({
        success: false,
        message: 'Cutlist not found',
        error: fetchError?.message
      });
    }

    // Re-parse the OCR text with improved logic
    const reparsedData = parseOCRText(cutlist.ocrText);

    // Update the cutlist with new parsed data
    const { data: updatedCutlist, error: updateError } = await supabase
      .from('cutlists')
      .update({
        cutPieces: reparsedData.cutPieces,
        stockPieces: reparsedData.stockPieces,
        materials: reparsedData.materials,
        updatedAt: new Date().toISOString()
      })
      .eq('_id', cutlistId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update cutlist',
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      message: 'Cutlist re-parsed successfully',
      originalPieces: cutlist.cutPieces?.length || 0,
      newPieces: reparsedData.cutPieces?.length || 0,
      cutlist: updatedCutlist
    });

  } catch (error) {
    console.error('Error re-parsing cutlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Error re-parsing cutlist',
      error: error.message || String(error)
    });
  }
};

// Improved OCR parsing function (same as in parse-ocr.js)
function parseOCRText(text) {
  console.log('Re-parsing: Running improved OCR parser logic');
  const result = {
    stockPieces: [],
    cutPieces: [],
    materials: [],
    unit: 'mm' // Default unit
  };

  const lines = text.split('\n').filter(line => line.trim() !== '');
  console.log(`Processing ${lines.length} lines of text...`);

  // Check if this is an HDS cutting list format
  const isHDSFormat = text.includes('HDS') && text.includes('Height/Length') && text.includes('Width');
  console.log(`Detected HDS format: ${isHDSFormat}`);

  if (isHDSFormat) {
    // Parse HDS table format
    return parseHDSTableFormat(text, result);
  } else {
    // Use existing parsing logic for simple formats
    return parseSimpleFormat(text, result);
  }
}

// Parse HDS cutting list table format
function parseHDSTableFormat(text, result) {
  console.log('Re-parsing: Parsing HDS table format...');
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let tableStartIndex = -1;
  
  // Find where the table data starts (after headers)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for the header row or first data row
    if (line.includes('Height/Length') || line.includes('Width') || line.includes('Qty')) {
      tableStartIndex = i + 1; // Start after header
      break;
    }
    // Alternative: look for first row with number pattern
    if (/^\d+\s+/.test(line)) {
      tableStartIndex = i;
      break;
    }
  }
  
  console.log(`Table data starts at line ${tableStartIndex}`);
  
  if (tableStartIndex === -1) {
    console.log('Could not find table start, falling back to simple parsing');
    return parseSimpleFormat(text, result);
  }
  
  // Parse each table row
  for (let i = tableStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and footer lines
    if (!line || line.includes('Date:') || line.includes('Client Signed:') || line.includes('X76')) {
      continue;
    }
    
    console.log(`Parsing table row ${i}: "${line}"`);
    
    // Extract numbers from the line - HDS format typically has:
    // No. | Height/Length | Width | Qty | Edging Length | Edging Width | Pot Holes
    const numbers = line.match(/\d+/g);
    
    if (numbers && numbers.length >= 3) {
      // Skip the row number (first number) and extract dimensions
      let rowNum, height, width, qty;
      
      // Try to identify the pattern
      if (numbers.length >= 4) {
        rowNum = parseInt(numbers[0]);
        height = parseInt(numbers[1]);
        width = parseInt(numbers[2]);
        qty = parseInt(numbers[3]);
      } else if (numbers.length === 3) {
        // Sometimes row number might be missing
        height = parseInt(numbers[0]);
        width = parseInt(numbers[1]);
        qty = parseInt(numbers[2]);
      }
      
      // Validate the extracted values
      if (height && width && qty && height > 0 && width > 0 && qty > 0) {
        // Filter out unrealistic values (likely parsing errors)
        if (height > 10000 || width > 10000 || qty > 100) {
          console.log(`Skipping unrealistic values: ${height}x${width}, qty: ${qty}`);
          continue;
        }
        
        result.cutPieces.push({
          length: Math.max(height, width), // Larger dimension as length
          width: Math.min(height, width),  // Smaller dimension as width
          quantity: qty,
          description: line.trim()
        });
        
        console.log(`Added HDS cut piece: ${Math.max(height, width)}x${Math.min(height, width)}, Qty: ${qty}`);
      } else {
        console.log(`Invalid dimensions found in line: "${line}"`);
      }
    } else {
      console.log(`Not enough numbers found in line: "${line}"`);
    }
  }
  
  console.log(`HDS parsing complete. Found ${result.cutPieces.length} cut pieces.`);
  return result;
}

// Parse simple format (existing logic)
function parseSimpleFormat(text, result) {
  console.log('Re-parsing: Parsing simple format...');
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
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
