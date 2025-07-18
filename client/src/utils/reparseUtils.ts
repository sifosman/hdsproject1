// Utility functions for re-parsing existing cutlist data

/**
 * Re-parse an existing cutlist with improved parsing logic
 * @param cutlistId The ID of the cutlist to re-parse
 * @returns Promise with the re-parsing result
 */
export const reparseCutlist = async (cutlistId: string): Promise<{
  success: boolean;
  message: string;
  originalPieces?: number;
  newPieces?: number;
  cutlist?: any;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/reparse-cutlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cutlistId: cutlistId
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to re-parse cutlist');
    }

    return result;
  } catch (error) {
    console.error('Error re-parsing cutlist:', error);
    return {
      success: false,
      message: 'Failed to re-parse cutlist',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Test the OCR parsing logic with sample text
 * @param ocrText The OCR text to test
 * @returns Promise with the parsing result
 */
export const testOCRParsing = async (ocrText: string): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/parse-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: ocrText
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to parse OCR text');
    }

    return {
      success: true,
      result: result.result
    };
  } catch (error) {
    console.error('Error testing OCR parsing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Check if a cutlist appears to have parsing issues (too few pieces)
 * @param cutlist The cutlist data
 * @returns boolean indicating if re-parsing might be beneficial
 */
export const shouldReparse = (cutlist: any): boolean => {
  // Check if it's an HDS format with suspiciously few pieces
  if (cutlist.ocrText && cutlist.ocrText.includes('HDS')) {
    const cutPiecesCount = cutlist.cutPieces?.length || 0;
    // HDS cutting lists typically have many pieces, if we only have 1-2, likely parsing issue
    return cutPiecesCount < 5;
  }
  
  return false;
};

/**
 * Extract expected piece count from HDS OCR text (rough estimate)
 * @param ocrText The OCR text
 * @returns Estimated number of pieces that should be found
 */
export const estimateHDSPieceCount = (ocrText: string): number => {
  if (!ocrText.includes('HDS')) {
    return 0;
  }
  
  // Count lines that look like table rows (start with a number)
  const lines = ocrText.split('\n');
  let estimatedCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for lines that start with a number (likely row numbers)
    if (/^\d+$/.test(trimmed) && parseInt(trimmed) > 0 && parseInt(trimmed) < 100) {
      estimatedCount++;
    }
  }
  
  return estimatedCount;
};
