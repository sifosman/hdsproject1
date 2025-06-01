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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOCRToCutlistData = exports.processImageWithOCR = exports.processOcrText = exports.saveImageFile = exports.extractDimensionsFromText = void 0;
/**
 * Extract dimensions from OCR text
 * This is used when we already have OCR text from n8n
 */
const extractDimensionsFromText = (ocrText) => {
    // Create an array for dimensions
    const dimensions = [];
    // Split OCR text into lines
    const lines = ocrText.split('\n');
    console.log('Total lines in OCR text:', lines.length);
    // Set default unit
    let unit = 'mm';
    // Log the full OCR text for debugging
    console.log('Full OCR text:', ocrText);
    // Simplified regex patterns focused on common dimension formats
    const dimensionPatterns = [
        /(\d+)\s*[xX]\s*(\d+)\s*=\s*(\d+)/, // 1000x500=2
        /(\d+)\s*[xX]\s*(\d+)\s+(\d+)/, // 1000x500 2
        /(\d+)\s*[xX×-]\s*(\d+)\s*=?\s*(\d+)?/, // General pattern with optional quantity
    ];
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines or header/category lines
        if (!line ||
            line.toLowerCase() === 'doors' ||
            line.toLowerCase().includes('white') && line.length < 15) {
            continue;
        }
        console.log(`Processing line ${i + 1}:`, line);
        // Try to extract dimensions using our patterns
        let matched = false;
        // First, try the specific patterns
        for (const pattern of dimensionPatterns) {
            const match = line.match(pattern);
            if (match) {
                const width = parseInt(match[1]);
                const length = parseInt(match[2]);
                let quantity = match[3] ? parseInt(match[3]) : 1;
                // Ensure width, length, and quantity are valid numbers
                if (!isNaN(width) && !isNaN(length) && width > 0 && length > 0) {
                    console.log(`  Found dimension: ${width}x${length}, qty=${quantity}`);
                    dimensions.push({
                        id: `dim-${Date.now()}-${dimensions.length}`,
                        width,
                        length,
                        quantity: isNaN(quantity) ? 1 : quantity
                    });
                    matched = true;
                    break;
                }
            }
        }
        // If not matched with specific patterns, try a more general approach
        if (!matched) {
            // Look for any pattern of numbers with x between them
            const generalMatch = line.match(/(\d+)\s*[xX×-]\s*(\d+)/);
            if (generalMatch) {
                const width = parseInt(generalMatch[1]);
                const length = parseInt(generalMatch[2]);
                // Look for a quantity at the end of the line
                let quantity = 1;
                const quantityMatch = line.match(/=\s*(\d+)\s*$/) || line.match(/\s(\d+)\s*$/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1]);
                }
                // Add the dimension
                console.log(`  Found dimension (general): ${width}x${length}, qty=${quantity}`);
                dimensions.push({
                    id: `dim-${Date.now()}-${dimensions.length}`,
                    width,
                    length,
                    quantity
                });
                matched = true;
            }
        }
        if (!matched) {
            console.log(`  No dimension found in line: ${line}`);
        }
    }
    // Log the total number of dimensions found
    console.log(`Total dimensions extracted: ${dimensions.length}`);
    return { dimensions, unit };
};
exports.extractDimensionsFromText = extractDimensionsFromText;
/**
 * Save an image file locally (stub implementation for compatibility)
 */
const saveImageFile = (fileBuffer, filename) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('saveImageFile called - this is a stub implementation since OCR is handled by n8n');
    return 'file-path-placeholder';
});
exports.saveImageFile = saveImageFile;
/**
 * Process OCR results from text (use this for data from n8n)
 */
const processOcrText = (ocrText) => {
    console.log('Processing OCR text from n8n');
    const { dimensions, unit } = (0, exports.extractDimensionsFromText)(ocrText);
    return { dimensions, unit, rawText: ocrText };
};
exports.processOcrText = processOcrText;
/**
 * Process image with OCR (stub for compatibility)
 */
const processImageWithOCR = (imagePath) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('processImageWithOCR called - this is a stub implementation since OCR is handled by n8n');
    return {
        dimensions: [],
        unit: 'mm',
        rawText: 'OCR processing is now handled by n8n'
    };
});
exports.processImageWithOCR = processImageWithOCR;
/**
 * Convert OCR results to cutlist data format (stub for compatibility)
 */
const convertOCRToCutlistData = (ocrResults) => {
    console.log('convertOCRToCutlistData called - this is a stub implementation since OCR is handled by n8n');
    // Extract dimensions from OCR text if available
    if (ocrResults && ocrResults.rawText) {
        const { dimensions, unit } = (0, exports.extractDimensionsFromText)(ocrResults.rawText);
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
exports.convertOCRToCutlistData = convertOCRToCutlistData;
