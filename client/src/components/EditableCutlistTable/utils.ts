// Utility functions for EditableCutlistTable
import type { CutPiece } from './types';

export function parseOcrText(ocrText: string, materialCategories: string[]): { dimensions: any[], materials: string[] } {
  if (!ocrText) return { dimensions: [], materials: [] };
  
  const dimensions: any[] = [];
  const materials: string[] = [];
  let currentMaterial = materialCategories[0];
  
  // Split OCR text into lines
  const lines = ocrText.split('\n').filter(line => line.trim() !== '');
  console.log(`Parsing ${lines.length} lines of OCR text`);
  
  // Look for material headings and dimensions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    console.log(`Processing line: "${line}"`);
    
    // Check if this line is a material heading
    let isMaterialHeading = false;
    for (const material of materialCategories) {
      if (line.toLowerCase().includes(material.toLowerCase())) {
        currentMaterial = material;
        materials.push(material);
        isMaterialHeading = true;
        console.log(`Found material heading: ${material}`);
        break;
      }
    }
    
    if (isMaterialHeading) {
      continue;
    }
    
    // Try to extract dimensions: format like '460x2000'
    const dimensionMatch = line.match(/(\d+)\s*[xX×*]\s*(\d+)(?:\s*[xX×*]\s*(\d+))?/);
    if (dimensionMatch) {
      const width = parseInt(dimensionMatch[1], 10);
      const length = parseInt(dimensionMatch[2], 10);
      const quantity = dimensionMatch[3] ? parseInt(dimensionMatch[3], 10) : 1;
      
      if (!isNaN(width) && !isNaN(length) && width > 0 && length > 0) {
        dimensions.push({
          id: `dim-${Date.now()}-${dimensions.length}`,
          width,
          length,
          quantity,
          material: currentMaterial,
          description: line // Store the original line for reference
        });
        
        console.log(`Added dimension: ${width}x${length}, qty=${quantity}, material=${currentMaterial}`);
      }
    }
  }
  
  // Make sure we have at least one material
  if (materials.length === 0) {
    materials.push(materialCategories[0]);
  }
  
  return { dimensions, materials };
}

export function extractQuantityFromDescription(description: string | undefined): number | null {
  if (!description) return 1; // Default to 1 if no description
  
  // Array of regex patterns to extract quantity from description, in order of priority
  const patterns = [
    // Format: "900x600x2" or "900X600X 2" (third dimension as quantity)
    /(?:^|\s|[xX×*])(\d+)\s*[xX×*]\s*\d+\s*[xX×*]\s*(\d+)/,
    
    // Format: "900x600 x2" (quantity after dimensions with 'x')
    /(?:^|\s|[xX×*])(\d+)\s*[xX×*]\s*\d+\s+[xX]\s*(\d+)/,
    
    // Format: "2000x460=2" or "918x460=4" (with equals sign)
    /(?:^|\s|[xX×*])(\d+)\s*[xX×*]\s*\d+\s*=\s*(\d+)/,
    
    // Format: "360x140-8" (with dash)
    /(?:^|\s|[xX×*])(\d+)\s*[xX×*]\s*\d+\s*-\s*(\d+)/,
    
    // Format: "X2" or "x 2" at the end of the string
    /[xX]\s*(\d+)\s*$/,
    
    // Format: at the end of string after dimensions
    /(?:^|\s|[xX×*])(\d+)\s*[xX×*]\s*\d+\s+(\d+)$/,
    
    // Format: parentheses (3)
    /\(\s*(\d+)\s*\)/,
    
    // Last resort: any number at the end
    /(\d+)$/
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      // For patterns with two capture groups, the quantity is the second one
      const qtyStr = match[2] || match[1];
      const qty = parseInt(qtyStr, 10);
      if (!isNaN(qty) && qty > 0) {
        console.log(`Extracted quantity ${qty} from description: "${description}"`);
        return qty;
      }
    }
  }
  
  console.log(`No quantity found in description: "${description}", defaulting to 1`);
  return 1; // Default to 1 if no quantity found
}

export function normalizeCutPieces(rawPieces: any[], DEFAULT_MATERIAL_CATEGORIES: string[] = []): CutPiece[] {
  // If DEFAULT_MATERIAL_CATEGORIES is not provided or empty, use a default
  const materialCategories = DEFAULT_MATERIAL_CATEGORIES?.length > 0 ? DEFAULT_MATERIAL_CATEGORIES : ["Default Material"];
  
  console.log('materialCategories:', materialCategories);
  console.log('materialCategories[0]:', materialCategories[0]);
  console.log('rawPieces:', rawPieces);
  
  if (!rawPieces || rawPieces.length === 0) return [];

  const materialHeadings: { key: string; value: string }[] = [];
  for (const piece of rawPieces) {
    const text = piece.description || piece.name;
    if (text) {
      for (const material of materialCategories) {
        if (text.toLowerCase().includes(material.toLowerCase())) {
          materialHeadings.push({
            key: text,
            value: material
          });
          break;
        }
      }
    }
  }

  console.log('materialHeadings:', materialHeadings);

  const normalizedPieces: CutPiece[] = [];
  let currentMaterial = materialCategories[0];

  for (const piece of rawPieces) {
    if (!piece) continue;

    const text = piece.description || piece.name;
    console.log('Processing piece:', piece);
    
    // Check if this piece is a material heading
    const isMaterialHeading = materialHeadings.some(
      heading => heading.key === text
    );

    if (isMaterialHeading) {
      const heading = materialHeadings.find(h => h.key === text);
      if (heading) {
        currentMaterial = heading.value;
      }
      // Push a separator piece
      normalizedPieces.push({
        id: `separator-${Date.now()}-${normalizedPieces.length}`,
        separator: true,
        material: currentMaterial
      });
    } else {
      // Normal cut piece - extract quantity from description if not explicitly provided
      const description = piece.description || piece.name || '';
      
      // First, check if quantity is already set in the piece data
      // If not, extract it from the description
      let quantity = piece.quantity;
      if (quantity === undefined || quantity === null || quantity === 1) {
        const extractedQty = extractQuantityFromDescription(description);
        if (extractedQty !== null && extractedQty > 1) {
          quantity = extractedQty;
          console.log(`Extracted quantity ${quantity} from description: "${description}"`);
        } else {
          quantity = 1; // Default to 1 if no quantity found
        }
      }
      
      // Create the normalized piece with the correct quantity
      const normalizedPiece: CutPiece = {
        id: piece.id || `piece-${Date.now()}-${normalizedPieces.length}`,
        width: piece.width,
        length: piece.length,
        quantity: quantity,
        name: description,
        description: description, // Keep the original description
        edging: piece.edging,
        material: currentMaterial
      };
      
      normalizedPieces.push(normalizedPiece);
      console.log(`Normalized piece: ${piece.width}x${piece.length} x${quantity} (${currentMaterial}) - "${description}"`);
    }
  }

  console.log('normalizedPieces:', normalizedPieces);
  return normalizedPieces;
}

export function calculateEdging(piece: CutPiece): string {
  if (!piece) return '';
  
  const edgingSides: string[] = [];
  
  // Check each tick box and add the corresponding side
  if (piece.lengthTick1) edgingSides.push('L1');
  if (piece.lengthTick2) edgingSides.push('L2');
  if (piece.widthTick1) edgingSides.push('W1');
  if (piece.widthTick2) edgingSides.push('W2');
  
  // Return comma-separated string of sides that need edging
  return edgingSides.join(',');
}

export function calculateEdgingLength(piece: CutPiece): number {
  if (!piece) return 0;
  
  let totalEdging = 0;
  
  // Calculate edging length based on tick boxes
  // L1 and L2 = length of the piece
  if (piece.lengthTick1) totalEdging += (piece.length || 0);
  if (piece.lengthTick2) totalEdging += (piece.length || 0);
  
  // W1 and W2 = width of the piece  
  if (piece.widthTick1) totalEdging += (piece.width || 0);
  if (piece.widthTick2) totalEdging += (piece.width || 0);
  
  // Multiply by quantity
  totalEdging *= (piece.quantity || 1);
  
  return totalEdging;
}

export function downloadPdf(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function extractDimensions(productData: any): { width: number; length: number; thickness: number } {
  if (!productData) return { width: 0, length: 0, thickness: 0 };
  
  // Extract dimensions from the product data
  const width = productData.width || 0;
  const length = productData.length || 0;
  const thickness = productData.thickness || 0;
  
  return { width, length, thickness };
}
