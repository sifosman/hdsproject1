// Test script to verify HDS parsing logic with actual OCR text
const testOCRText = `Final Size:
(Subtract Imm)
No. Height/Length
HDS
WE CUT AND EDGE BOARDS TO YOUR REQUIREMENTS PROFESSIONALLY!!
16 Van Tonder Street, Sunderland Ridge, Centurion, Cell: 072 478 7862/010 822 2873, E-mail:sales@hdssunderland.co.za
Name: Willian
S
Phone No: 066229467
Board Name: Dessert sky.
Matt
Edging Colour:
Cut Size:
(Add Imm)
Edging Thickness: 0.4/Imm
Width
Qoy
1
995
Edging Length
Edging Width
426
Pot Holes
2
24
2
975
2 W
2
395
1
22
3
34
775
2
475
உ
24
2W
2
4
195
260
1
22
2W
2
5
995
455
22
2w
2
6
995
513
2
2 L
2W
2
7
795
278
24
2W
2
8
695
506
2
20
2w
2
9
2445
536
1
20
3w
4
10
695
400
4
24
3W
2
11
766
278
22
2W
2
12
766
476
2
24
2W
Z
13
766
4
24
2W
2
14
766
366
1
20
2w
2
15
766
426
2
24
32
2
16
128
375
4
20
3w
17
380
775
2
2F
18
766
335
1
22
2w
19
24
2W
766
330
1
20
766
336
2
20
2w
222
2222
21
770
676
l
2w
766
521
2
24
2
23
736
396
1
24
2w
2
24
26
2
24
766
315
766 X76
Date:
Client Signed:`;

// Improved OCR parsing function (same as in parse-ocr.js)
function parseOCRText(text) {
  console.log('Test: Running improved OCR parser logic');
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
  console.log('Test: Parsing HDS table format...');
  
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
  console.log('Test: Parsing simple format...');
  
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

// Run the test
console.log('=== Testing HDS OCR Parsing ===');
const result = parseOCRText(testOCRText);

console.log('\n=== RESULTS ===');
console.log(`Total cut pieces found: ${result.cutPieces.length}`);
console.log('\nCut pieces:');
result.cutPieces.forEach((piece, index) => {
  console.log(`${index + 1}. ${piece.length}x${piece.width} (qty: ${piece.quantity}) - "${piece.description}"`);
});

console.log('\n=== SUMMARY ===');
console.log(`Expected: ~24 pieces`);
console.log(`Found: ${result.cutPieces.length} pieces`);
console.log(`Success: ${result.cutPieces.length > 10 ? 'YES' : 'NO'}`);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseOCRText, testOCRText };
}
