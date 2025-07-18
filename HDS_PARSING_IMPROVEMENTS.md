# HDS Cutting List Parsing Improvements

## Problem
The OCR parsing was only extracting 1 cut piece from HDS cutting lists that contain 24+ pieces in a structured table format. The existing parser was designed for simple formats like "1000x500=2" but failed on structured table data.

## Root Cause
The HDS cutting list has a table format with columns:
- No. (Row number)
- Height/Length 
- Width
- Qty (Quantity)
- Edging Length
- Edging Width  
- Pot Holes

The OCR text was being split into individual lines, making it difficult to parse the table structure with the existing regex patterns.

## Solution
Created an improved parsing system that:

1. **Detects HDS format** by looking for keywords "HDS", "Height/Length", and "Width"
2. **Parses table structure** by finding table start and extracting numbers from each row
3. **Maintains backward compatibility** with existing simple formats
4. **Provides re-parsing capability** for existing data

## Files Modified/Created

### Server-side Changes
1. **`server/src/services/botsailor.service.ts`** - Enhanced parseOCRText function
   - Added HDS format detection
   - Added parseHDSTableFormat function
   - Added parseSimpleFormat function (existing logic)
   - Maintains backward compatibility

### API Changes  
2. **`api/parse-ocr.js`** - Updated serverless parsing function
   - Added same HDS parsing logic as server
   - Ensures consistency across deployment environments

3. **`api/reparse-cutlist.js`** - New endpoint for re-parsing existing data
   - Fetches existing cutlist from database
   - Re-parses with improved logic
   - Updates database with new results

4. **`api/test-hds-parsing.js`** - Test script for validation
   - Tests parsing with actual HDS OCR text
   - Validates expected vs actual piece count

### Client-side Changes
5. **`client/src/utils/reparseUtils.ts`** - Utility functions
   - reparseCutlist() - calls reparse API
   - testOCRParsing() - tests parsing logic
   - shouldReparse() - detects parsing issues
   - estimateHDSPieceCount() - estimates expected pieces

6. **`client/src/components/ReparseButton.tsx`** - UI component
   - Shows warning for potential parsing issues
   - Provides button to re-parse existing data
   - Displays results and success/error messages

## How the HDS Parsing Works

### Detection
```javascript
const isHDSFormat = text.includes('HDS') && 
                   text.includes('Height/Length') && 
                   text.includes('Width');
```

### Table Parsing Logic
1. Find table start by looking for header keywords or first numeric row
2. For each table row:
   - Extract all numbers using regex `/\d+/g`
   - Identify pattern: [rowNum, height, width, qty, ...]
   - Validate dimensions and quantities
   - Filter out unrealistic values
   - Add to cut pieces array

### Example Row Processing
```
Input: "1 995 426 2 24 2"
Numbers: [1, 995, 426, 2, 24, 2]
Extracted: rowNum=1, height=995, width=426, qty=2
Result: {length: 995, width: 426, quantity: 2}
```

## Deployment Steps

1. **Commit all changes** to your repository
2. **Build the server** on your build machine:
   ```bash
   cd server
   npm run build
   ```
3. **Deploy to Vercel** - the API functions will be automatically deployed
4. **Test with existing data** using the reparse endpoint

## Testing the Fix

### For New Data
New HDS cutting lists will automatically use the improved parsing logic.

### For Existing Data
Use the reparse endpoint to fix existing cutlists:

```javascript
// Call the reparse API
fetch('/api/reparse-cutlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cutlistId: '1752827765532' })
})
```

Or use the ReparseButton component in your UI.

## Expected Results

For the HDS cutting list in question:
- **Before**: 1 cut piece (766x76)
- **After**: ~24 cut pieces with proper dimensions and quantities

The improved parser should extract pieces like:
- 995x426 (qty: 2)
- 775x475 (qty: 2) 
- 195x260 (qty: 1)
- 995x455 (qty: 1)
- etc.

## Backward Compatibility

The changes maintain full backward compatibility:
- Simple formats like "1000x500=2" still work
- Existing API endpoints unchanged
- No breaking changes to data structures
- Falls back to simple parsing if HDS detection fails

## Future Enhancements

1. **Support other table formats** by adding more detection patterns
2. **Improve error handling** for malformed table data
3. **Add confidence scoring** for parsing results
4. **Implement automatic re-parsing** for suspected issues
