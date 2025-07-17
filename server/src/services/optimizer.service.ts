import { IPiece } from '../models/project.model';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Interfaces for the optimizer
interface StockPiece {
  width: number;
  length: number;
  quantity: number;
  patternDirection: number;
}

interface CutPiece {
  width: number;
  length: number;
  quantity: number;
  patternDirection: number;
  externalId: number;
  canRotate: boolean;
}

interface PlacedPiece {
  x: number;
  y: number;
  width: number;
  length: number;
  externalId: number | string;
  canRotate?: boolean;
}

interface Solution {
  stockPieces: Array<{
    width: number;
    length: number;
    cutPieces: PlacedPiece[];
  }>;
}

// Convert units
const convertUnit = (value: number, fromUnit: number, toUnit: number): number => {
  // Units: 0 = mm, 1 = inch, 2 = foot
  const mmToInch = 0.0393701;
  const mmToFoot = 0.00328084;
  const inchToMm = 25.4;
  const inchToFoot = 0.0833333;
  const footToMm = 304.8;
  const footToInch = 12;

  if (fromUnit === toUnit) return value;

  if (fromUnit === 0) { // from mm
    if (toUnit === 1) return value * mmToInch;
    if (toUnit === 2) return value * mmToFoot;
  } else if (fromUnit === 1) { // from inch
    if (toUnit === 0) return value * inchToMm;
    if (toUnit === 2) return value * inchToFoot;
  } else if (fromUnit === 2) { // from foot
    if (toUnit === 0) return value * footToMm;
    if (toUnit === 1) return value * footToInch;
  }

  return value;
};

// Prepare data for optimization
export const prepareOptimizationData = (pieces: IPiece[], unit: number): { stockPieces: StockPiece[], cutPieces: CutPiece[] } => {
  const stockPieces: StockPiece[] = [];
  const cutPieces: CutPiece[] = [];
  let seq = 0;

  pieces.forEach(piece => {
    // Convert to mm for internal calculations
    const width = Math.round(convertUnit(piece.width, unit, 0));
    const length = Math.round(convertUnit(piece.length, unit, 0));
    const patternDirection = piece.pattern;

    if (piece.kind === 1) { // Stock piece
      for (let i = 0; i < piece.amount; i++) {
        stockPieces.push({
          width,
          length,
          quantity: 1,
          patternDirection
        });
      }
    } else { // Cut piece
      for (let i = 0; i < piece.amount; i++) {
        seq++;
        cutPieces.push({
          width,
          length,
          quantity: 1,
          patternDirection,
          externalId: seq,
          canRotate: patternDirection === 0 // Can only rotate if no pattern
        });
      }
    }
  });

  return { stockPieces, cutPieces };
};

// Improved optimization function with better bin packing algorithm
export const optimizeCuttingLayout = (stockPieces: StockPiece[], cutPieces: CutPiece[], cutWidth: number, layout: number): Solution => {
  const solution: Solution = {
    stockPieces: []
  };

  // Sort cut pieces by area (largest first) for better packing
  const sortedCutPieces = [...cutPieces].sort((a, b) => {
    const areaA = a.width * a.length;
    const areaB = b.width * b.length;
    return areaB - areaA; // Descending order (largest first)
  });

  // Process each stock piece
  for (let stockPieceIndex = 0; stockPieceIndex < stockPieces.length; stockPieceIndex++) {
    const stockPiece = stockPieces[stockPieceIndex];

    // Skip if no more cut pieces to place
    if (sortedCutPieces.length === 0) break;

    const solutionStockPiece = {
      width: stockPiece.width,
      length: stockPiece.length,
      cutPieces: [] as PlacedPiece[]
    };

    // For guillotine layout, we'll use a simple shelf algorithm
    // For nested layout, we'll use a more complex bin packing approach
    if (layout === 0) { // Guillotine layout
      // Initialize free rectangles with the whole stock piece
      const freeRects = [{ x: 0, y: 0, width: stockPiece.width, height: stockPiece.length }];

      // Try to place each cut piece
      let i = 0;
      while (i < sortedCutPieces.length) {
        const cutPiece = sortedCutPieces[i];
        let placed = false;

        // Try to place in each free rectangle
        for (let j = 0; j < freeRects.length; j++) {
          const rect = freeRects[j];

          // Check if piece fits in this rectangle (considering cut width)
          const fitsWidth = cutPiece.width <= rect.width;
          const fitsHeight = cutPiece.length <= rect.height;

          // Try rotated if allowed and it fits better
          const canRotate = cutPiece.canRotate && cutPiece.patternDirection === 0;
          const fitsWidthRotated = canRotate && cutPiece.length <= rect.width;
          const fitsHeightRotated = canRotate && cutPiece.width <= rect.height;

          let useRotated = false;

          if (fitsWidth && fitsHeight) {
            // Check if rotation would be more efficient
            if (canRotate && fitsWidthRotated && fitsHeightRotated) {
              const normalWaste = (rect.width - cutPiece.width) * (rect.height - cutPiece.length);
              const rotatedWaste = (rect.width - cutPiece.length) * (rect.height - cutPiece.width);
              useRotated = rotatedWaste < normalWaste;
            }

            // Place the piece
            const placedPiece: PlacedPiece = {
              x: rect.x,
              y: rect.y,
              width: useRotated ? cutPiece.length : cutPiece.width,
              length: useRotated ? cutPiece.width : cutPiece.length,
              externalId: cutPiece.externalId
            };

            solutionStockPiece.cutPieces.push(placedPiece);

            // Split the free rectangle into two new free rectangles
            // Remove the current free rectangle
            freeRects.splice(j, 1);

            // Add new free rectangles (considering cut width)
            const usedWidth = placedPiece.width + cutWidth;
            const usedHeight = placedPiece.length + cutWidth;

            // Right rectangle
            if (rect.width - usedWidth > 0) {
              freeRects.push({
                x: rect.x + usedWidth,
                y: rect.y,
                width: rect.width - usedWidth,
                height: rect.height
              });
            }

            // Bottom rectangle
            if (rect.height - usedHeight > 0) {
              freeRects.push({
                x: rect.x,
                y: rect.y + usedHeight,
                width: usedWidth,
                height: rect.height - usedHeight
              });
            }

            // Remove the placed piece from the list
            sortedCutPieces.splice(i, 1);
            placed = true;
            break;
          }
        }

        // If the piece couldn't be placed, move to the next one
        if (!placed) {
          i++;
        }
      }
    } else { // Nested layout - more complex bin packing
      // Initialize a grid for the stock piece
      const gridSize = Math.min(cutWidth, 10); // Use cut width as grid size, but not smaller than 10
      const gridWidth = Math.ceil(stockPiece.width / gridSize);
      const gridHeight = Math.ceil(stockPiece.length / gridSize);
      const grid = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(false));

      // Try to place each cut piece
      let i = 0;
      while (i < sortedCutPieces.length) {
        const cutPiece = sortedCutPieces[i];
        let placed = false;

        // Calculate piece dimensions in grid units
        const pieceWidth = Math.ceil(cutPiece.width / gridSize);
        const pieceHeight = Math.ceil(cutPiece.length / gridSize);
        const cutWidthGrid = Math.ceil(cutWidth / gridSize);

        // Try all possible positions
        for (let y = 0; y <= gridHeight - pieceHeight; y++) {
          for (let x = 0; x <= gridWidth - pieceWidth; x++) {
            // Check if this position is free
            let canPlace = true;
            for (let py = 0; py < pieceHeight; py++) {
              for (let px = 0; px < pieceWidth; px++) {
                if (grid[y + py][x + px]) {
                  canPlace = false;
                  break;
                }
              }
              if (!canPlace) break;
            }

            // Also check if there's enough space for the cut width
            if (canPlace) {
              // Check right edge
              if (x + pieceWidth < gridWidth) {
                for (let py = 0; py < pieceHeight; py++) {
                  for (let c = 0; c < cutWidthGrid; c++) {
                    if (x + pieceWidth + c < gridWidth && grid[y + py][x + pieceWidth + c]) {
                      canPlace = false;
                      break;
                    }
                  }
                  if (!canPlace) break;
                }
              }

              // Check bottom edge
              if (canPlace && y + pieceHeight < gridHeight) {
                for (let px = 0; px < pieceWidth; px++) {
                  for (let c = 0; c < cutWidthGrid; c++) {
                    if (y + pieceHeight + c < gridHeight && grid[y + pieceHeight + c][x + px]) {
                      canPlace = false;
                      break;
                    }
                  }
                  if (!canPlace) break;
                }
              }
            }

            if (canPlace) {
              // Mark the grid as used
              for (let py = 0; py < pieceHeight; py++) {
                for (let px = 0; px < pieceWidth; px++) {
                  grid[y + py][x + px] = true;
                }
              }

              // Mark cut width areas as used
              if (x + pieceWidth < gridWidth) {
                for (let py = 0; py < pieceHeight; py++) {
                  for (let c = 0; c < cutWidthGrid; c++) {
                    if (x + pieceWidth + c < gridWidth) {
                      grid[y + py][x + pieceWidth + c] = true;
                    }
                  }
                }
              }

              if (y + pieceHeight < gridHeight) {
                for (let px = 0; px < pieceWidth; px++) {
                  for (let c = 0; c < cutWidthGrid; c++) {
                    if (y + pieceHeight + c < gridHeight) {
                      grid[y + pieceHeight + c][x + px] = true;
                    }
                  }
                }
              }

              // Add the placed piece
              solutionStockPiece.cutPieces.push({
                x: x * gridSize,
                y: y * gridSize,
                width: cutPiece.width,
                length: cutPiece.length,
                externalId: cutPiece.externalId
              });

              // Remove the placed piece from the list
              sortedCutPieces.splice(i, 1);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

        // If the piece couldn't be placed, move to the next one
        if (!placed) {
          i++;
        }
      }
    }

    // Only add stock pieces that have cut pieces placed on them
    if (solutionStockPiece.cutPieces.length > 0) {
      solution.stockPieces.push(solutionStockPiece);
    }
  }

  return solution;
};

// Generate PDF with the solution
export const generatePdf = (solution: Solution, unit: number, cutWidth: number = 3, layout: number = 0): string => {
  const pdfId = uuidv4();
  const pdfPath = path.join(__dirname, '../../pdfs', `solution_${pdfId}.pdf`);

  // Ensure directory exists
  const dir = path.dirname(pdfPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create PDF document
  const doc = new PDFDocument({ size: 'A4' });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Add title with a colored header box
  doc.rect(50, 50, doc.page.width - 100, 60)
     .fillAndStroke('#003366', '#000000');

  doc.fontSize(24)
     .fillColor('#FFFFFF')
     .text('HDS Group Cutlist', 50, 65, { align: 'center', width: doc.page.width - 100 });

  doc.fontSize(16)
     .fillColor('#FFFFFF')
     .text('2D CUTTING OPTIMIZER', 50, 95, { align: 'center', width: doc.page.width - 100 });

  // Add date and time
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.fontSize(10)
     .fillColor('#000000')
     .text(`Generated: ${dateString} ${timeString}`, 50, 120, { align: 'right', width: doc.page.width - 100 });

  doc.moveDown(3);

  // Add detailed summary information
  const totalStockPieces = solution.stockPieces.length;
  const totalCutPieces = solution.stockPieces.reduce((sum, sp) => sum + sp.cutPieces.length, 0);

  // Calculate basic solution properties
  
  // Calculate total edging required in mm
  let totalEdging = 0;
  solution.stockPieces.forEach((sp: any) => {
    sp.cutPieces.forEach((cp: any) => {
      // Count edges that need edging (L1, L2, W1, W2)
      const edgingNeeded = [
        cp.edgeL1 ? cp.length : 0,
        cp.edgeL2 ? cp.length : 0,
        cp.edgeW1 ? cp.width : 0,
        cp.edgeW2 ? cp.width : 0
      ].reduce((sum: number, val: number) => sum + val, 0);
      
      totalEdging += edgingNeeded;
    });
  });
  
  // Convert edging to meters and calculate cost
  const EDGING_PRICE_PER_METER = 14; // R14 per meter
  const totalEdgingMeters = totalEdging / 1000;
  const edgingCost = totalEdgingMeters * EDGING_PRICE_PER_METER;

  // Calculate total area and waste
  let totalStockArea = 0;
  let totalCutArea = 0;

  solution.stockPieces.forEach(stockPiece => {
    const stockArea = stockPiece.width * stockPiece.length;
    totalStockArea += stockArea;

    stockPiece.cutPieces.forEach(cutPiece => {
      totalCutArea += cutPiece.width * cutPiece.length;
    });
  });

  const wasteArea = totalStockArea - totalCutArea;
  const wastePercentage = ((wasteArea / totalStockArea) * 100).toFixed(2);

  // Create a detailed summary table
  doc.fontSize(14).text(`Optimization Summary`, { underline: true });
  doc.moveDown(0.5);

  // Draw summary table
  const summaryStartX = 50;
  const summaryStartY = doc.y;
  const summaryColWidths = [200, 100, 150];
  const summaryRowHeight = 25;

  // Draw table headers
  doc.rect(summaryStartX, summaryStartY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .fillAndStroke('#e0e0e0', '#000000');

  doc.fontSize(10).fillColor('#000000');
  doc.text('Parameter', summaryStartX + 5, summaryStartY + 8, { width: summaryColWidths[0] });
  doc.text('Value', summaryStartX + summaryColWidths[0] + 5, summaryStartY + 8, { width: summaryColWidths[1] });
  doc.text('Details', summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, summaryStartY + 8, { width: summaryColWidths[2] });

  // Draw rows
  let currentSummaryY = summaryStartY + summaryRowHeight;

  // Row 1: Stock Pieces
  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Stock Pieces Used', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${totalStockPieces}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Total sheets/panels`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 2: Cut Pieces
  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Cut Pieces Placed', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${totalCutPieces}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Total parts cut`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 3: Total Stock Area
  const unitLabel = unit === 0 ? 'mm²' : unit === 1 ? 'in²' : 'ft²';
  const totalStockAreaConverted = convertUnit(totalStockArea, 0, unit).toFixed(2);

  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Total Stock Area', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${totalStockAreaConverted} ${unitLabel}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Total material area`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 4: Total Cut Area
  const totalCutAreaConverted = convertUnit(totalCutArea, 0, unit).toFixed(2);

  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Total Cut Area', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${totalCutAreaConverted} ${unitLabel}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Total used material`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 5: Waste Area
  const wasteAreaConverted = convertUnit(wasteArea, 0, unit).toFixed(2);

  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .fillAndStroke('#fff0f0', '#000000');
  doc.text('Waste Area', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${wasteAreaConverted} ${unitLabel}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`${wastePercentage}% of total material`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 6: Edging Cost
  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Edging Cost', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`R ${edgingCost.toFixed(2)}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Total edging cost`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 7: Layout Type
  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Layout Type', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${layout === 0 ? 'Guillotine' : 'Nested'}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Cutting algorithm used`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });
  currentSummaryY += summaryRowHeight;

  // Row 8: Cut Width
  const cutWidthConverted = convertUnit(cutWidth, 0, unit).toFixed(2);
  const unitLabelSingle = unit === 0 ? 'mm' : unit === 1 ? 'in' : 'ft';

  doc.rect(summaryStartX, currentSummaryY, summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], summaryRowHeight)
     .stroke();
  doc.text('Cut Width', summaryStartX + 5, currentSummaryY + 8, { width: summaryColWidths[0] });
  doc.text(`${cutWidthConverted} ${unitLabelSingle}`, summaryStartX + summaryColWidths[0] + 5, currentSummaryY + 8, { width: summaryColWidths[1] });
  doc.text(`Saw blade thickness`, summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 5, currentSummaryY + 8, { width: summaryColWidths[2] });

  doc.moveDown(3);

  // Draw each stock piece and its cut pieces
  solution.stockPieces.forEach((stockPiece, index) => {
    // Add page for each stock piece except the first one
    if (index > 0) {
      doc.addPage();
    }

    // Stock piece title with colored box
    const unitLabel = unit === 0 ? 'mm' : unit === 1 ? 'in' : 'ft';

    // Create a colored header for the stock piece
    const stockTitleX = 50;
    const stockTitleY = doc.y + 10;
    const stockTitleWidth = doc.page.width - 100;
    const stockTitleHeight = 30;

    doc.rect(stockTitleX, stockTitleY, stockTitleWidth, stockTitleHeight)
       .fillAndStroke('#003366', '#000000');

    doc.fontSize(14)
       .fillColor('#FFFFFF')
       .text(`CASE ${index + 1}`, stockTitleX, stockTitleY + 8,
             { align: 'center', width: stockTitleWidth });

    // Add stock piece details in a table format
    const stockDetailsStartX = 50;
    const stockDetailsStartY = stockTitleY + stockTitleHeight + 10;
    const stockDetailsColWidths = [100, 100, 100, 100];
    const stockDetailsRowHeight = 25;

    // Draw header
    doc.rect(stockDetailsStartX, stockDetailsStartY,
             stockDetailsColWidths.reduce((a, b) => a + b, 0),
             stockDetailsRowHeight)
       .fillAndStroke('#e0e0e0', '#000000');

    doc.fontSize(10).fillColor('#000000');
    doc.text('Resource', stockDetailsStartX + 5, stockDetailsStartY + 8,
             { width: stockDetailsColWidths[0] });
    doc.text('Width', stockDetailsStartX + stockDetailsColWidths[0] + 5,
             stockDetailsStartY + 8, { width: stockDetailsColWidths[1] });
    doc.text('Length', stockDetailsStartX + stockDetailsColWidths[0] +
             stockDetailsColWidths[1] + 5, stockDetailsStartY + 8,
             { width: stockDetailsColWidths[2] });
    doc.text('Area', stockDetailsStartX + stockDetailsColWidths[0] +
             stockDetailsColWidths[1] + stockDetailsColWidths[2] + 5,
             stockDetailsStartY + 8, { width: stockDetailsColWidths[3] });

    // Draw data row
    const stockDetailsDataY = stockDetailsStartY + stockDetailsRowHeight;
    doc.rect(stockDetailsStartX, stockDetailsDataY,
             stockDetailsColWidths.reduce((a, b) => a + b, 0),
             stockDetailsRowHeight)
       .stroke();

    const stockWidth = convertUnit(stockPiece.width, 0, unit).toFixed(1);
    const stockLength = convertUnit(stockPiece.length, 0, unit).toFixed(1);
    const stockAreaFormatted = (parseFloat(stockWidth) * parseFloat(stockLength)).toFixed(2);

    doc.text(`Case ${index + 1}`, stockDetailsStartX + 5, stockDetailsDataY + 8,
             { width: stockDetailsColWidths[0] });
    doc.text(`${stockWidth} ${unitLabel}`, stockDetailsStartX + stockDetailsColWidths[0] + 5,
             stockDetailsDataY + 8, { width: stockDetailsColWidths[1] });
    doc.text(`${stockLength} ${unitLabel}`, stockDetailsStartX + stockDetailsColWidths[0] +
             stockDetailsColWidths[1] + 5, stockDetailsDataY + 8,
             { width: stockDetailsColWidths[2] });
    doc.text(`${stockAreaFormatted} ${unitLabel}²`, stockDetailsStartX + stockDetailsColWidths[0] +
             stockDetailsColWidths[1] + stockDetailsColWidths[2] + 5,
             stockDetailsDataY + 8, { width: stockDetailsColWidths[3] });

    doc.moveDown(3);

    // Calculate scale to fit on page
    const pageWidth = 500;
    const pageHeight = 700;
    const scale = Math.min(
      pageWidth / stockPiece.width,
      pageHeight / stockPiece.length
    ) * 0.8;

    // Draw stock piece
    const startX = 50;
    const startY = 120;

    // Draw stock piece outline
    doc.rect(
      startX,
      startY,
      stockPiece.width * scale,
      stockPiece.length * scale
    ).stroke('#000000');

    // Draw cut pieces
    stockPiece.cutPieces.forEach((cutPiece, pieceIndex) => {
      // Generate a color for this piece (pastel colors for better visibility)
      const colors = [
        '#FFD6D6', // light pink
        '#D6FFDB', // light green
        '#D6F0FF', // light blue
        '#FFF7D6', // light yellow
        '#EBD6FF', // light purple
        '#FFE4D6', // light orange
        '#D6FFFF'  // light cyan
      ];
      const fillColor = colors[pieceIndex % colors.length];

      // Draw cut piece
      doc.rect(
        startX + cutPiece.x * scale,
        startY + cutPiece.y * scale,
        cutPiece.width * scale,
        cutPiece.length * scale
      ).fillAndStroke(fillColor, '#000000');

      // Add ID label in the center
      const labelX = startX + cutPiece.x * scale + (cutPiece.width * scale / 2);
      const labelY = startY + cutPiece.y * scale + (cutPiece.length * scale / 2);

      // Draw the ID in the center with larger font
      doc.fontSize(14)
         .fillColor('#000000')
         .text(
           `${cutPiece.externalId}`,
           labelX - 10,
           labelY - 10,
           { width: 20, align: 'center' }
         );

      // Draw width dimension on top
      const widthLabel = convertUnit(cutPiece.width, 0, unit).toFixed(0);
      doc.fontSize(8)
         .fillColor('#000000')
         .text(
           widthLabel,
           startX + cutPiece.x * scale + (cutPiece.width * scale / 2) - 10,
           startY + cutPiece.y * scale - 12,
           { width: 20, align: 'center' }
         );

      // Draw length dimension on the left side
      const lengthLabel = convertUnit(cutPiece.length, 0, unit).toFixed(0);
      doc.fontSize(8)
         .fillColor('#000000')
         .text(
           lengthLabel,
           startX + cutPiece.x * scale - 20,
           startY + cutPiece.y * scale + (cutPiece.length * scale / 2) - 5,
           { width: 20, align: 'center' }
         );

      // Draw dimension lines
      // Top width line
      doc.moveTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 5)
         .lineTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 5)
         .stroke('#000000');

      // Left length line
      doc.moveTo(startX + cutPiece.x * scale - 5, startY + cutPiece.y * scale)
         .lineTo(startX + cutPiece.x * scale - 5, startY + cutPiece.y * scale + cutPiece.length * scale)
         .stroke('#000000');

      // Draw small ticks at the ends of dimension lines
      // Top width ticks
      doc.moveTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 3)
         .lineTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 7)
         .stroke('#000000');
      doc.moveTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 3)
         .lineTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 7)
         .stroke('#000000');

      // Left length ticks
      doc.moveTo(startX + cutPiece.x * scale - 3, startY + cutPiece.y * scale)
         .lineTo(startX + cutPiece.x * scale - 7, startY + cutPiece.y * scale)
         .stroke('#000000');
      doc.moveTo(startX + cutPiece.x * scale - 3, startY + cutPiece.y * scale + cutPiece.length * scale)
         .lineTo(startX + cutPiece.x * scale - 7, startY + cutPiece.y * scale + cutPiece.length * scale)
         .stroke('#000000');
    });

    // Add cut pieces table with colored header
    doc.moveDown(2);

    // Create a colored header for the cut pieces table
    const cutPiecesTitleX = 50;
    const cutPiecesTitleY = doc.y;
    const cutPiecesTitleWidth = doc.page.width - 100;
    const cutPiecesTitleHeight = 30;

    doc.rect(cutPiecesTitleX, cutPiecesTitleY, cutPiecesTitleWidth, cutPiecesTitleHeight)
       .fillAndStroke('#003366', '#000000');

    doc.fontSize(14)
       .fillColor('#FFFFFF')
       .text('CUTTED PARTS', cutPiecesTitleX, cutPiecesTitleY + 8,
             { align: 'center', width: cutPiecesTitleWidth });

    doc.moveDown(2);

    // Create a table-like structure for the cut pieces
    const tableTop = doc.y;
    const colWidths = [80, 80, 80, 60, 80, 80];
    const rowHeight = 25;

    // Draw table header
    doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), rowHeight)
       .fillAndStroke('#4682B4', '#000000'); // Steel blue header

    doc.fontSize(10).fillColor('#FFFFFF');
    doc.text('Part Name', startX + 5, tableTop + 8, { width: colWidths[0] });
    doc.text('X', startX + colWidths[0] + 5, tableTop + 8, { width: colWidths[1], align: 'center' });
    doc.text('Y', startX + colWidths[0] + colWidths[1] + 5, tableTop + 8, { width: colWidths[2], align: 'center' });
    doc.text('Count', startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, tableTop + 8, { width: colWidths[3], align: 'center' });
    doc.text('Width', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, tableTop + 8, { width: colWidths[4], align: 'center' });
    doc.text('Length', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, tableTop + 8, { width: colWidths[5], align: 'center' });

    // Group cut pieces by dimensions to count similar pieces
    const groupedPieces = new Map();

    stockPiece.cutPieces.forEach(cutPiece => {
      const key = `${cutPiece.width}-${cutPiece.length}`;
      if (!groupedPieces.has(key)) {
        groupedPieces.set(key, {
          width: cutPiece.width,
          length: cutPiece.length,
          count: 1,
          pieces: [cutPiece]
        });
      } else {
        const group = groupedPieces.get(key);
        group.count++;
        group.pieces.push(cutPiece);
      }
    });

    // Draw cut pieces in the table
    let currentY = tableTop + rowHeight;
    let partIndex = 0;

    Array.from(groupedPieces.values()).forEach((group, idx) => {
      partIndex++;
      const partName = String.fromCharCode(65 + (idx % 26)); // A, B, C, ...

      // Get the first piece in the group for position reference
      const firstPiece = group.pieces[0];

      // Unit is handled in the width/length conversion
      const width = convertUnit(group.width, 0, unit).toFixed(1);
      const length = convertUnit(group.length, 0, unit).toFixed(1);
      const x = convertUnit(firstPiece.x, 0, unit).toFixed(1);
      const y = convertUnit(firstPiece.y, 0, unit).toFixed(1);

      // Alternate row background for better readability
      if (idx % 2 === 1) {
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fillAndStroke('#F0F8FF', '#000000'); // Light blue background
      } else {
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fillAndStroke('#FFFFFF', '#000000'); // White background
      }

      doc.fillColor('#000000');
      doc.text(partName, startX + 5, currentY + 8, { width: colWidths[0] });
      doc.text(x, startX + colWidths[0] + 5, currentY + 8, { width: colWidths[1], align: 'center' });
      doc.text(y, startX + colWidths[0] + colWidths[1] + 5, currentY + 8, { width: colWidths[2], align: 'center' });
      doc.text(group.count.toString(), startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 8, { width: colWidths[3], align: 'center' });
      doc.text(width, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, currentY + 8, { width: colWidths[4], align: 'center' });
      doc.text(length, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, currentY + 8, { width: colWidths[5], align: 'center' });

      currentY += rowHeight;

      // Update the externalId of each piece in the group to use the part name
      group.pieces.forEach((piece: PlacedPiece) => {
        piece.externalId = partName;
      });
    });

    // Draw table border
    doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), currentY - tableTop)
       .stroke('#000000');

    // Add additional information table with colored header
    doc.moveDown(2);

    // Create a colored header for the info table
    const infoTitleX = 50;
    const infoTitleY = doc.y;
    const infoTitleWidth = doc.page.width - 100;
    const infoTitleHeight = 30;

    doc.rect(infoTitleX, infoTitleY, infoTitleWidth, infoTitleHeight)
       .fillAndStroke('#003366', '#000000');

    doc.fontSize(14)
       .fillColor('#FFFFFF')
       .text('CUTTING PARAMETERS', infoTitleX, infoTitleY + 8,
             { align: 'center', width: infoTitleWidth });

    doc.moveDown(2);

    const infoTableTop = doc.y;
    const infoColWidths = [150, 150];

    // Draw info table header
    doc.rect(startX, infoTableTop, infoColWidths[0] + infoColWidths[1], rowHeight)
       .fillAndStroke('#4682B4', '#000000');

    doc.fontSize(10).fillColor('#FFFFFF');
    doc.text('Parameter', startX + 5, infoTableTop + 8, { width: infoColWidths[0] });
    doc.text('Value', startX + infoColWidths[0] + 5, infoTableTop + 8, { width: infoColWidths[1] });

    let infoCurrentY = infoTableTop + rowHeight;

    // Row 1: Guillotine Cutting
    doc.rect(startX, infoCurrentY, infoColWidths[0] + infoColWidths[1], rowHeight)
       .fillAndStroke('#F0F8FF', '#000000'); // Light blue background
    doc.fillColor('#000000');
    doc.text('Guillotine Cutting', startX + 5, infoCurrentY + 8, { width: infoColWidths[0] });
    doc.text(layout === 0 ? 'Yes' : 'No', startX + infoColWidths[0] + 5, infoCurrentY + 8, { width: infoColWidths[1] });
    infoCurrentY += rowHeight;

    // Row 2: Rotating
    doc.rect(startX, infoCurrentY, infoColWidths[0] + infoColWidths[1], rowHeight)
       .fillAndStroke('#FFFFFF', '#000000'); // White background
    doc.text('Rotating', startX + 5, infoCurrentY + 8, { width: infoColWidths[0] });
    // Check if any pieces have canRotate=true
    const canRotate = stockPiece.cutPieces.some(p => p.canRotate);
    doc.text(canRotate ? 'Yes' : 'No', startX + infoColWidths[0] + 5, infoCurrentY + 8, { width: infoColWidths[1] });
    infoCurrentY += rowHeight;

    // Row 3: Waste
    const stockAreaValue = stockPiece.width * stockPiece.length;
    let usedAreaValue = 0;
    stockPiece.cutPieces.forEach(p => {
      usedAreaValue += p.width * p.length;
    });
    const wasteAreaValue = stockAreaValue - usedAreaValue;
    const wastePercentage = ((wasteAreaValue / stockAreaValue) * 100).toFixed(2);

    doc.rect(startX, infoCurrentY, infoColWidths[0] + infoColWidths[1], rowHeight)
       .fillAndStroke('#FFECEC', '#000000'); // Light red background for waste
    doc.text('Waste', startX + 5, infoCurrentY + 8, { width: infoColWidths[0] });
    doc.text(`${convertUnit(wasteAreaValue, 0, unit).toFixed(2)} ${unitLabel}² (${wastePercentage}%)`,
             startX + infoColWidths[0] + 5, infoCurrentY + 8, { width: infoColWidths[1] });

    // Row 4: Edging Cost
    doc.rect(startX, infoCurrentY + rowHeight, infoColWidths[0] + infoColWidths[1], rowHeight)
       .fillAndStroke('#F0F8FF', '#000000'); // Light blue background
    doc.fillColor('#000000');
    doc.text('Edging Cost', startX + 5, (infoCurrentY + rowHeight) + 8, { width: infoColWidths[0] });
    doc.text(`R ${edgingCost.toFixed(2)}`, startX + infoColWidths[0] + 5, (infoCurrentY + rowHeight) + 8, { width: infoColWidths[1] });
  });

  // Add footer to each page
  const totalPages = solution.stockPieces.length;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    // Add footer with date and page numbers
    doc.fontSize(8).fillColor('#666666');
    doc.text(
      `HDS Group Cutlist - Generated on ${dateString} - Page ${i + 1} of ${totalPages}`,
      50,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 100 }
    );
  }

  // Finalize PDF
  doc.end();

  return pdfId;
};

// Generate IQ software compatible export data
export const generateIQExport = (solution: Solution, unit: number, cutWidth: number = 3, layout: number = 0): any => {
  // Create an object structure that matches the IQ software import format
  const iqData: any = {
    version: "1.0",
    title: "HDS Group Cutlist Export",
    date: new Date().toISOString(),
    unit: unit === 0 ? "mm" : unit === 1 ? "in" : "ft",
    layout: layout === 0 ? "guillotine" : "nested",
    cutWidth: convertUnit(cutWidth, 0, unit),
    stockPieces: [],
    metadata: {
      source: "HDS Group Cutlist",
      exportType: "optimization",
      optimizationId: uuidv4(),
      settings: {
        allowRotation: true,
        cutWidth: convertUnit(cutWidth, 0, unit),
        algorithm: layout === 0 ? "guillotine" : "nested"
      }
    },
    summary: {
      totalStockPieces: solution.stockPieces.length,
      totalCutPieces: 0,
      totalStockArea: 0,
      totalCutArea: 0,
      totalWaste: 0,
      wastePercentage: 0
    }
  };

  // Process each stock piece
  solution.stockPieces.forEach((stockPiece, stockIndex) => {
    const stockWidth = convertUnit(stockPiece.width, 0, unit);
    const stockLength = convertUnit(stockPiece.length, 0, unit);
    const stockArea = stockWidth * stockLength;

    // Group cut pieces by dimensions
    const groupedPieces = new Map();

    stockPiece.cutPieces.forEach(cutPiece => {
      const key = `${cutPiece.width}-${cutPiece.length}`;
      if (!groupedPieces.has(key)) {
        groupedPieces.set(key, {
          width: cutPiece.width,
          length: cutPiece.length,
          count: 1,
          pieces: [cutPiece]
        });
      } else {
        const group = groupedPieces.get(key);
        group.count++;
        group.pieces.push(cutPiece);
      }
    });

    // Calculate used area and waste
    let usedArea = 0;
    stockPiece.cutPieces.forEach(p => {
      usedArea += p.width * p.length;
    });

    const wasteArea = stockPiece.width * stockPiece.length - usedArea;
    const wastePercentage = (wasteArea / (stockPiece.width * stockPiece.length)) * 100;

    // Convert grouped pieces to array with part names
    const parts = Array.from(groupedPieces.entries()).map(([_, group], index) => {
      const partName = String.fromCharCode(65 + (index % 26)); // A, B, C, ...
      const firstPiece = group.pieces[0];

      return {
        name: partName,
        width: convertUnit(group.width, 0, unit),
        length: convertUnit(group.length, 0, unit),
        count: group.count,
        x: convertUnit(firstPiece.x, 0, unit),
        y: convertUnit(firstPiece.y, 0, unit)
      };
    });

    // Add stock piece to IQ data
    iqData.stockPieces.push({
      id: `Case${stockIndex + 1}`,
      width: stockWidth,
      length: stockLength,
      area: stockArea,
      usedArea: convertUnit(usedArea, 0, unit),
      waste: convertUnit(wasteArea, 0, unit),
      wastePercentage: wastePercentage.toFixed(2),
      parts: parts
    });

    // Update summary data
    iqData.summary.totalCutPieces += stockPiece.cutPieces.length;
    iqData.summary.totalStockArea += stockArea;
    iqData.summary.totalCutArea += convertUnit(usedArea, 0, unit);
  });

  // Calculate total waste
  iqData.summary.totalWaste = iqData.summary.totalStockArea - iqData.summary.totalCutArea;
  iqData.summary.wastePercentage = ((iqData.summary.totalWaste / iqData.summary.totalStockArea) * 100).toFixed(2);

  return iqData;
};

// Import data from IQ software
export const importFromIQ = (iqData: any): { pieces: IPiece[], unit: number, width: number, layout: number } => {
  if (!iqData || typeof iqData !== 'object') {
    throw new Error('Invalid IQ data format');
  }

  // Determine unit from IQ data
  let unit = 0; // Default to mm
  if (iqData.unit) {
    if (iqData.unit === 'in') unit = 1;
    else if (iqData.unit === 'ft') unit = 2;
  }

  // Determine cut width and layout
  const cutWidth = iqData.cutWidth ? convertUnit(iqData.cutWidth, unit, 0) : 3;
  const layout = iqData.layout === 'nested' ? 1 : 0;

  // Process stock pieces
  const pieces: IPiece[] = [];

  // Add stock pieces
  if (Array.isArray(iqData.stockPieces)) {
    iqData.stockPieces.forEach((stockPiece: any) => {
      if (stockPiece.width && stockPiece.length) {
        pieces.push({
          width: convertUnit(stockPiece.width, unit, 0),
          length: convertUnit(stockPiece.length, unit, 0),
          amount: stockPiece.quantity || 1,
          kind: 1, // Stock piece
          pattern: 0 // No pattern by default
        });
      }
    });
  }

  // Add cut pieces
  if (iqData.parts) {
    iqData.parts.forEach((part: any) => {
      if (part.width && part.length) {
        pieces.push({
          width: convertUnit(part.width, unit, 0),
          length: convertUnit(part.length, unit, 0),
          amount: part.quantity || 1,
          kind: 0, // Cut piece
          pattern: 0 // No pattern by default
        });
      }
    });
  } else if (iqData.stockPieces) {
    // Try to extract parts from stock pieces if they exist
    iqData.stockPieces.forEach((stockPiece: any) => {
      if (Array.isArray(stockPiece.parts)) {
        stockPiece.parts.forEach((part: any) => {
          if (part.width && part.length) {
            pieces.push({
              width: convertUnit(part.width, unit, 0),
              length: convertUnit(part.length, unit, 0),
              amount: part.count || 1,
              kind: 0, // Cut piece
              pattern: 0 // No pattern by default
            });
          }
        });
      }
    });
  }

  return {
    pieces,
    unit,
    width: cutWidth,
    layout
  };
};

// Helper to safely format numbers. Returns '-' if value is null/undefined/NaN
const safeFixed = (value: any, digits = 2): string => {
  const num = Number(value);
  return isFinite(num) ? num.toFixed(digits) : '-';
};

// Generate a PDF for quotations
export const generateQuotePdf = (quoteData: any): Promise<{ buffer: Buffer, id: string }> => {
  const {
    quoteId,
    customerName,
    projectName,
    date,
    sections,
    grandTotal,
    branchData,
    bankingDetails,
    edgingLength,
    edgingCost
  } = quoteData;

  // Create PDF document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // (Removed branch header from top)
  
  // Generate a unique ID for this PDF
  const pdfId = quoteId || `Q-${Date.now()}`;
  
  // Setup buffer to store PDF content
  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // We'll store the final buffer here
  let pdfBuffer: Buffer | null = null;
  doc.on('end', () => {
    pdfBuffer = Buffer.concat(buffers);
  });
  
  // Add HDS branding header
  doc.rect(50, 50, doc.page.width - 100, 60)
     .fillAndStroke('#003366', '#000000');
     
  doc.fontSize(24)
     .fillColor('#FFFFFF')
     .text('HDS Group Quotation', 50, 65, { align: 'center', width: doc.page.width - 100 });
  
  // Set default text color to solid black for all content
  doc.fillColor('#000000');
  
  // Add quote details
  doc.moveDown(1.5);
  doc.fontSize(12).fillColor('#000000');
  
  // Create a two-column layout for quote details
  const detailsStartY = doc.y;
  const detailsLeftWidth = 250;
  const detailsRightX = 300;
  
  // Left column: Quote details
  doc.text(`Quote Reference: ${pdfId}`, 50, detailsStartY);
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`, 50, detailsStartY + 20);
  doc.text(`Customer: ${customerName}`, 50, detailsStartY + 40);
  doc.text(`Project: ${projectName}`, 50, detailsStartY + 60);
  
  // Calculate grand total and edging costs first so we can display on first page
  const EDGING_PRICE_PER_METER = 14; // R14 per meter
  let totalEdgingMeters = 0;
  let totalEdgingCost = 0;
  
  // Calculate initial grand total from board costs
  let boardTotal = sections.reduce((sum: number, section: any) => sum + (section.sectionTotal || 0), 0);
  boardTotal = parseFloat(boardTotal.toFixed(2));

  // Calculate edging costs for each section
  sections.forEach((section: any) => {
    if (section.edging && section.edging.totalEdging > 0) {
      // Convert from mm to meters
      const edgingMeters = section.edging.totalEdging / 1000;
      totalEdgingMeters += edgingMeters;
      
      // Calculate edging cost
      const edgingCost = section.edgingCost !== undefined 
        ? section.edgingCost.toFixed(2) 
        : (edgingMeters * EDGING_PRICE_PER_METER).toFixed(2);
      // Store edging cost in section for display
      section.edgingCost = parseFloat(edgingCost);
    } else {
      section.edgingCost = 0;
    }
  });
  
  totalEdgingCost = parseFloat((totalEdgingMeters * EDGING_PRICE_PER_METER).toFixed(2));
  
  // Calculate final grand total with edging included
  const finalTotal = boardTotal + totalEdgingCost;
  
  // Right column: Project information only (grand total will be moved to the bottom)
  const infoWidth = 200;
  const infoHeight = 80;
  
  doc.rect(detailsRightX, detailsStartY, infoWidth, infoHeight)
     .fillAndStroke('#e6e6e6', '#000000');
  
  doc.fontSize(14).fillColor('#000000');
  doc.text('PROJECT DETAILS', detailsRightX + 10, detailsStartY + 10, { align: 'center', width: infoWidth - 20 });
  doc.fontSize(12).fillColor('#000000');
  doc.text(`Customer: ${customerName}`, detailsRightX + 10, detailsStartY + 30, { width: infoWidth - 20 });
  doc.text(`Project: ${projectName}`, detailsRightX + 10, detailsStartY + 50, { width: infoWidth - 20 });
  
  // Continue with main content
  doc.y = Math.max(doc.y, detailsStartY + infoHeight + 50); // Ensure we're past the details section
  
  // For each material section
  sections.forEach((section: any, index: number) => {
    const { material, boardSize, boardsNeeded, pricePerBoard, sectionTotal, cutPieces, wastage, edging } = section;
    
    // Material header with clearer styling
    doc.rect(50, doc.y, doc.page.width - 100, 30)
       .fillAndStroke('#e6e6e6', '#000000');
    
    doc.fontSize(12).fillColor('#000000')
       .text(`Material ${index + 1}: ${material} - ${boardSize}`, 60, doc.y - 22, { align: 'left' });
    
    doc.moveDown(1.5);
    
    // Create a table for this section's details
    const startY = doc.y;
    const colWidths = [200, 100, 100, 100];
    const rowHeight = 25;
    
    // Header row
    doc.rect(50, startY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight)
       .fillAndStroke('#cccccc', '#000000');
    
    doc.fontSize(10).fillColor('#000000');
    doc.text('Description', 55, startY + 8, { width: colWidths[0] - 10 });
    doc.text('Board Size', 55 + colWidths[0], startY + 8, { width: colWidths[1] - 10 });
    doc.text('Quantity', 55 + colWidths[0] + colWidths[1], startY + 8, { width: colWidths[2] - 10 });
    doc.text('Price', 55 + colWidths[0] + colWidths[1] + colWidths[2], startY + 8, { width: colWidths[3] - 10 });
    
    // Data row
    let currentY = startY + rowHeight;
    
    // Safely render values even if some fields are missing in the API payload
    doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight)
       .stroke();
    doc.text(material ?? '-', 55, currentY + 8, { width: colWidths[0] - 10 });
    doc.text(boardSize ?? '-', 55 + colWidths[0], currentY + 8, { width: colWidths[1] - 10 });
    
    const boardsNeededDisplay = boardsNeeded !== undefined && boardsNeeded !== null ? boardsNeeded.toString() : '-';
    doc.text(boardsNeededDisplay, 55 + colWidths[0] + colWidths[1], currentY + 8, { width: colWidths[2] - 10 });
    
    const priceDisplay = pricePerBoard !== undefined && pricePerBoard !== null ? `R ${safeFixed(pricePerBoard)}` : '-';
    doc.text(priceDisplay, 55 + colWidths[0] + colWidths[1] + colWidths[2], currentY + 8, { width: colWidths[3] - 10 });
    
    currentY += rowHeight;
    
    // Section total
    doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight)
       .stroke();
    
    doc.fontSize(10).fillColor('#000000');
    doc.text('Board Total:', 55, currentY + 8, { width: colWidths[0] + colWidths[1] + colWidths[2] - 10 });
    const sectionTotalDisplay = sectionTotal !== undefined && sectionTotal !== null ? `R ${safeFixed(sectionTotal)}` : '-';
    doc.text(sectionTotalDisplay, 55 + colWidths[0] + colWidths[1] + colWidths[2], currentY + 8, { width: colWidths[3] - 10 });
    
    currentY += rowHeight;
    
    // Add edging information in the same section as boards (if available)
    if (edging && edging.totalEdging > 0) {
      // Edging row
      doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight)
         .stroke();
      
      const edgingMeters = (edging.totalEdging / 1000).toFixed(2);
      const edgingCost = section.edgingCost !== undefined 
        ? section.edgingCost.toFixed(2) 
        : (parseFloat(edgingMeters) * EDGING_PRICE_PER_METER).toFixed(2);
      
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Edging (${edgingMeters}m @ R${EDGING_PRICE_PER_METER}/m):`, 55, currentY + 8, { width: colWidths[0] + colWidths[1] + colWidths[2] - 10 });
      doc.text(`R ${edgingCost}`, 55 + colWidths[0] + colWidths[1] + colWidths[2], currentY + 8, { width: colWidths[3] - 10 });
      
      currentY += rowHeight;
      
      // Combined section total (boards + edging)
      doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight)
         .fillAndStroke('#e6e6e6', '#000000');
         
      doc.fontSize(10).fillColor('#000000');
      doc.text('Section Total:', 55, currentY + 8, { width: colWidths[0] + colWidths[1] + colWidths[2] - 10 });
      
      const combinedTotal = (parseFloat(sectionTotal || '0') + parseFloat(edgingCost)).toFixed(2);
      doc.text(`R ${combinedTotal}`, 55 + colWidths[0] + colWidths[1] + colWidths[2], currentY + 8, { width: colWidths[3] - 10 });
    }
    
    // Optimization statistics section has been removed as requested
    
    // We've already included edging in the board section, so we don't need a separate edging summary
    
    doc.moveDown(2);
    
    // Cutting diagrams section has been removed as requested
    
    doc.moveDown(2);
  });
  
  // Add quote summary (moved up as requested, no longer on a separate page)
  doc.moveDown(2);
  
  // Center the Quote Summary headline properly
  const pageWidth = doc.page.width - 100; // Account for margins
  doc.fontSize(14).fillColor('#000000');
  doc.text('Quote Summary', 50, doc.y, { align: 'center', width: pageWidth });
  doc.moveDown(1);
  
  // Create a summary table
  const summaryStartY = doc.y;
  const summaryColWidth = (doc.page.width - 100) / 2;
  const summaryRowHeight = 25;
  
  // Table header
  doc.rect(50, summaryStartY, summaryColWidth * 2, summaryRowHeight)
     .fillAndStroke('#cccccc', '#000000');
  
  doc.fontSize(12).fillColor('#000000');
  doc.text('Description', 60, summaryStartY + 8);
  doc.text('Amount', 60 + summaryColWidth, summaryStartY + 8);
  
  let summaryY = summaryStartY + summaryRowHeight;
  
  // Board costs row
  doc.rect(50, summaryY, summaryColWidth * 2, summaryRowHeight).stroke();
  doc.text('Total Board Cost', 60, summaryY + 8);
  doc.text(`R ${boardTotal.toFixed(2)}`, 60 + summaryColWidth, summaryY + 8);
  
  summaryY += summaryRowHeight;
  
  // Edging costs row
  doc.rect(50, summaryY, summaryColWidth * 2, summaryRowHeight).stroke();
  doc.text(`Total Edging Cost (${totalEdgingMeters.toFixed(2)}m @ R${EDGING_PRICE_PER_METER}/m)`, 60, summaryY + 8);
  doc.text(`R ${totalEdgingCost.toFixed(2)}`, 60 + summaryColWidth, summaryY + 8);
  
  summaryY += summaryRowHeight;
  
  // Grand total row - highlighted
  doc.rect(50, summaryY, summaryColWidth * 2, summaryRowHeight + 10)
     .fillAndStroke('#003366', '#000000');
  
  // Ensure the total text is visible with proper positioning
  doc.fontSize(14).fillColor('#FFFFFF');
  doc.text('GRAND TOTAL', 60, summaryY + 12, { continued: false });
  doc.text(`R ${finalTotal.toFixed(2)}`, 60 + summaryColWidth, summaryY + 12, { continued: false });
  
  // Calculate how much space we need for branch and banking details combined
  const branchInfoHeight = branchData ? 100 : 0; // Approximate height for branch info box
  const bankingDetailsCount = bankingDetails ? Object.keys(bankingDetails).filter(k => {
    const excludeKeys = ['id', 'created_at', 'updated_at', 'uuid', 'fx_branch'];
    return !excludeKeys.includes(k) && bankingDetails[k]; 
  }).length : 1;
  
  const bankingDetailsHeight = 50 + (bankingDetailsCount * 18); // Header + lines
  const footerHeight = 50; // Space for footer
  const minimumSpaceNeeded = branchInfoHeight + bankingDetailsHeight + footerHeight;
  
  // Check available space
  const remainingSpace = doc.page.height - doc.y - 50; // 50 is bottom margin
  
  // Only add a page break if we absolutely need it AND we're not at the top of a page
  if (remainingSpace < minimumSpaceNeeded && doc.y > 100) {
    doc.addPage();
  }
  
  // Proceed directly to branch details without extra spacing to avoid blank pages
  let branchBlockY = doc.y + 10;
  if (branchData) {
    // Draw a light box for branch info
    doc.rect(50, branchBlockY, doc.page.width - 100, 70).fillAndStroke('#f5f5f5', '#003366');
    doc.fontSize(12).fillColor('#003366').font('Helvetica-Bold');
    doc.text(branchData.trading_as || branchData.name || 'Branch', 60, branchBlockY + 10, { width: doc.page.width - 120 });
    doc.fontSize(9).fillColor('#333333').font('Helvetica');
    let y = branchBlockY + 28;

    // List of keys to exclude from rendering (internal IDs, metadata, etc.)
    const excludeKeys = ['id', 'created_at', 'updated_at', 'uuid', 'branch_id', 'branch_number'];
    // Define pretty labels for known fields
    const prettyLabels: Record<string, string> = {
      trading_as: 'Trading As',
      name: 'Name',
      address1: 'Address 1',
      address2: 'Address 2',
      city: 'City',
      state: 'State',
      zip: 'ZIP',
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      vat: 'VAT Number',
      registration: 'Company Registration',
      notes: 'Notes',
      whatsapp: 'WhatsApp',
      // Add more known fields as needed
    };
    // Render all key/value pairs except excluded ones and name/trading_as (already shown)
    Object.keys(branchData).forEach((key) => {
      if (excludeKeys.includes(key) || key === 'trading_as' || key === 'name') return;
      const value = branchData[key];
      if (!value) return;
      const label = prettyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.text(`${label}: ${value}`, 60, y, { width: doc.page.width - 120 });
      y += 12;
    });
    branchBlockY = y + 12;
  }

  // Add payment details and terms - all together to prevent pagination issues
  doc.fontSize(12).fillColor('#000000');
  doc.text('Banking Details', 50, branchBlockY + 10);
  doc.fontSize(10);
  
  // First collect all banking detail lines
  const bankingLines: string[] = [];
  if (bankingDetails) {
    const excludeKeys = ['id', 'created_at', 'updated_at', 'uuid', 'fx_branch'];
    const prettyLabels: Record<string, string> = {
      account_holder: 'Account Holder',
      bank: 'Bank',
      account_number: 'Account Number',
      branch_code: 'Branch Code',
      account_type: 'Account Type',
      reference: 'Reference',
      swift_code: 'SWIFT Code',
      iban: 'IBAN',
      notes: 'Notes',
      // Add more as needed
    };
    Object.keys(bankingDetails).forEach((key) => {
      if (excludeKeys.includes(key)) return;
      const value = bankingDetails[key];
      if (!value) return;
      const label = prettyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      bankingLines.push(`${label}: ${value}`);
    });
  } else {
    bankingLines.push('No banking details available for this branch. Please contact us for payment information.');
  }
  
  // Now render all banking details as a single text block with line breaks
  const bankingText = bankingLines.join('\n');
  doc.text(bankingText, 50, branchBlockY + 35, { width: doc.page.width - 100 });

  // Add footer
  const footerY = doc.page.height - 50;
  doc.fontSize(8).fillColor('#000000');
  doc.text('This is a computer-generated quote and does not require a signature. Valid for 30 days.', 50, footerY, { align: 'center', width: doc.page.width - 100 });
  
  // Finalize PDF
  doc.end();
  
  // We need to wait for the PDF to be fully generated
  return new Promise<{ buffer: Buffer, id: string }>((resolve) => {
    // Wait for the PDF to be fully generated
    doc.on('end', () => {
      // Return the buffer and ID
      resolve({
        buffer: Buffer.concat(buffers),
        id: pdfId
      });
    });
  });
};
