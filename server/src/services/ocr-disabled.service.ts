/**
 * OCR Service - Disabled Version
 * 
 * This version is designed to work with n8n integration where OCR is handled externally.
 * It provides minimal stubs for compatibility with existing code.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simple interface for dimension data
interface Dimension {
  id: string;   // Unique identifier for the dimension
  width: number;
  length: number;
  quantity: number;
  material?: string; // Optional reference to a material
}

/**
 * Extract dimensions from OCR text
 * This is used when we already have OCR text from n8n
 */
export const extractDimensionsFromText = (ocrText: string): { dimensions: Dimension[], unit: string } => {
  // Create an array for dimensions
  const dimensions: Dimension[] = [];
  
  // Split OCR text into lines
  const lines = ocrText.split('\n');
  console.log('Total lines in OCR text:', lines.length);
  
  // Set default unit
  let unit = 'mm';
  
  // Log the full OCR text for debugging
  console.log('Full OCR text:', ocrText);
  
  // Enhanced regex patterns focused on real-world OCR text formats
  const dimensionPatterns = [
    // Format: "2000x 460=2" or "918x460=4" (with equals sign, allows for noise)
    /(\d+)\s*[xX×*]\s*(\d+)[^\d\r\n]*?=\s*(\d+)/,

    // Format: "360x140-8" (with dash)
    /(\d+)\s*[xX×*]\s*(\d+)\s*-\s*(\d+)/,

    // Format: "1000x500 2" (space then quantity)
    /(\d+)\s*[xX×*]\s*(\d+)\s+(\d+)\b/,

    // Format: "500x200 (3)" (quantity in parentheses)
    /(\d+)\s*[xX×*]\s*(\d+)\s*\(\s*(\d+)\s*\)/,

    // Format: "500x200x4" (quantity after second x)
    /(\d+)\s*[xX×*]\s*(\d+)\s*[xX×*]\s*(\d+)/,
  ];
  
  console.log('Using enhanced dimension patterns for extraction');
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or header/category lines
    if (!line || 
        line.toLowerCase() === 'doors' ||
        line.toLowerCase().includes('white') && line.length < 15) {
      continue;
    }
    
    console.log(`Processing line ${i+1}:`, line);
    
    // Try to extract dimensions using our patterns
    let matched = false;
    let width = 0, length = 0, quantity = 0; // Initialize quantity to 0
    
    console.log(`Line format analysis for "${line}"`);
    
    // First, try the specific patterns
    for (const pattern of dimensionPatterns) {
      const match = line.match(pattern);
      if (match) {
        width = parseInt(match[1]);
        length = parseInt(match[2]);
        quantity = match[3] ? parseInt(match[3]) : 0;
        
        // Ensure width, length, and quantity are valid numbers
        if (!isNaN(width) && !isNaN(length) && width > 0 && length > 0) {
          console.log(`PATTERN MATCH FOUND: ${width}x${length}, qty=${quantity} using pattern ${pattern}`);
          matched = true;
          break;
        }
      }
    }
    
    // If not matched with specific patterns, try more targeted approaches
    if (!matched) {
      // 1. Extract dimensions first
      const dimensionMatch = line.match(/(\d+)\s*[xX×*-]\s*(\d+)/);
      
      if (dimensionMatch) {
        width = parseInt(dimensionMatch[1]);
        length = parseInt(dimensionMatch[2]);
        
        console.log(`  Basic dimension found: ${width}x${length}`);
        
        // Get the remainder of the string after the dimension match
        const remainder = line.substring(dimensionMatch[0].length).trim();
        console.log(`  Remainder for quantity search: "${remainder}"`);

        // 2. Now try to extract quantity from the remainder
        const quantityPatterns = [
          // Format: "=2" or "= 2" at any position
          /=\s*(\d+)/,
          
          // Format: "-2" or "- 2" at any position
          /-\s*(\d+)/,
          
          // Format: a number at the end of line
          /^(\d+)\s*$/,
          
          // Format: "(2)" or "[2]" (quantity in brackets)
          /[\(\[]\s*(\d+)\s*[\)\]]/,
          
          // Format: "2pcs" or "2 pcs" or similar
          /\b(\d+)\s*(?:pc|pcs|x|ea|each|unit|units|pieces|piece)/i,
        ];
        
        for (const qPattern of quantityPatterns) {
          const qMatch = remainder.match(qPattern);
          if (qMatch && qMatch[1]) {
            quantity = parseInt(qMatch[1]);
            console.log(`  Quantity found: ${quantity} using pattern ${qPattern}`);
            matched = true;
            break;
          }
        }
        
        // If no quantity pattern matched but we have dimensions, still consider it matched
        if (!matched && width > 0 && length > 0) {
          console.log(`  No quantity pattern matched, skipping dimension`);
          continue;
        }
      }
    }
    
    // If we have valid dimensions and a valid quantity, add them to our collection
    if (matched && width > 0 && length > 0 && quantity > 0) {
      // Ensure quantity is a valid number
      if (isNaN(quantity)) {
        console.log(`  Invalid quantity detected (${quantity}), skipping dimension`);
        continue; // Skip if quantity is not a number
      }
      
      // Extra logging to confirm what's being added
      console.log(`ADDING DIMENSION: ${width}x${length}, qty=${quantity}`);
      
      dimensions.push({
        id: `dim-${Date.now()}-${dimensions.length}`,
        width,
        length,
        quantity
      });
    }
    
    if (!matched) {
      console.log(`  No dimension found in line: ${line}`);
    }
  }
  
  // Log the total number of dimensions found
  console.log(`Total dimensions extracted: ${dimensions.length}`);
  
  return { dimensions, unit };
};

/**
 * Save an image file locally (stub implementation for compatibility)
 */
export const saveImageFile = async (fileBuffer: Buffer, filename: string): Promise<string> => {
  console.log('saveImageFile called - this is a stub implementation since OCR is handled by n8n');
  return 'file-path-placeholder';
};

/**
 * Process OCR results from text (use this for data from n8n)
 */
export const processOcrText = (ocrText: string): { dimensions: Dimension[], unit: string, rawText: string } => {
  console.log('Processing OCR text from n8n');
  const { dimensions, unit } = extractDimensionsFromText(ocrText);
  return { dimensions, unit, rawText: ocrText };
};

/**
 * Process image with OCR (stub for compatibility)
 */
export const processImageWithOCR = async (imagePath: string): Promise<{ dimensions: Dimension[], unit: string, rawText: string }> => {
  console.log('processImageWithOCR called - this is a stub implementation since OCR is handled by n8n');
  return { 
    dimensions: [], 
    unit: 'mm', 
    rawText: 'OCR processing is now handled by n8n' 
  };
};

/**
 * Convert OCR results to cutlist data format (stub for compatibility)
 */
export const convertOCRToCutlistData = (ocrResults: any): any => {
  console.log('convertOCRToCutlistData called - this is a stub implementation since OCR is handled by n8n');
  // Extract dimensions from OCR text if available
  if (ocrResults && ocrResults.rawText) {
    const { dimensions, unit } = extractDimensionsFromText(ocrResults.rawText);
    return {
      dimensions,
      unit,
      rawText: ocrResults.rawText
    };
  }
  
  return {
    dimensions: [],
    unit: 'mm',
    rawText: ''
  };
};
