const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
// Use our custom bin packing implementation
const { SimpleBinPacking } = require('./bin-packing');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Import our OCR parser module
const ocrParser = require('./ocr-parser');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for PDFs (in production, use a proper storage solution)
const pdfs = {};

// Test endpoint to check if API is working
app.get('/api/test', (req, res) => {
  return res.json({ success: true, message: 'API is working' });
});

// Optimizer endpoint
app.post('/api/optimizer/optimize', (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Request body:', JSON.stringify(req.body));

    const { pieces, width, unit, layout } = req.body;

    // Validate input with detailed error messages
    if (!pieces) {
      return res.status(400).json({ success: false, message: 'Pieces data is missing' });
    }

    if (!Array.isArray(pieces)) {
      return res.status(400).json({ success: false, message: 'Pieces data must be an array' });
    }

    if (pieces.length === 0) {
      return res.status(400).json({ success: false, message: 'Pieces array is empty' });
    }

    if (width === undefined || width === null) {
      return res.status(400).json({ success: false, message: 'Width is missing' });
    }

    if (typeof width !== 'number') {
      return res.status(400).json({ success: false, message: 'Width must be a number' });
    }

    if (width <= 0) {
      return res.status(400).json({ success: false, message: 'Width must be greater than 0' });
    }

    // Process stock pieces and cut pieces
    const stockPieces = pieces.filter(p => p.kind === 1);
    const cutPieces = pieces.filter(p => p.kind === 0);

    console.log(`Stock pieces: ${stockPieces.length}, Cut pieces: ${cutPieces.length}`);

    if (stockPieces.length === 0) {
      return res.status(400).json({ success: false, message: 'No stock pieces provided' });
    }

    if (cutPieces.length === 0) {
      return res.status(400).json({ success: false, message: 'No cut pieces provided' });
    }

    // Expand pieces based on amount
    const expandedStockPieces = [];
    stockPieces.forEach(piece => {
      for (let i = 0; i < piece.amount; i++) {
        expandedStockPieces.push({
          id: expandedStockPieces.length,
          width: piece.width,
          length: piece.length,
          cutPieces: []
        });
      }
    });

    const expandedCutPieces = [];
    cutPieces.forEach(piece => {
      for (let i = 0; i < piece.amount; i++) {
        expandedCutPieces.push({
          id: expandedCutPieces.length,
          width: piece.width,
          length: piece.length,
          canRotate: piece.pattern === 0, // Can rotate if pattern is 'none'
          externalId: `${piece.width}x${piece.length}`
        });
      }
    });

    console.log(`Expanded stock pieces: ${expandedStockPieces.length}, Expanded cut pieces: ${expandedCutPieces.length}`);

    // Create bin packing input
    const bins = expandedStockPieces.map(sp => ({
      width: sp.width,
      height: sp.length,
      id: sp.id
    }));

    const items = expandedCutPieces.map(cp => ({
      width: cp.width,
      height: cp.length,
      id: cp.id,
      canRotate: cp.canRotate
    }));

    const algorithm = layout === 0 ? 'guillotine' : 'maxrects';

    console.log(`Using algorithm: ${algorithm}`);
    console.log(`First bin: ${JSON.stringify(bins[0])}`);
    console.log(`First item: ${JSON.stringify(items[0])}`);

    // Run optimization algorithm
    try {
      // Use our custom bin packing implementation
      const binPacking = new SimpleBinPacking(bins, items, true);

      const result = binPacking.solve();
      console.log('Optimization completed successfully');

      // Process results
      const usedBins = result.bins.filter(bin => bin.items.length > 0);
      console.log(`Used bins: ${usedBins.length}`);

      // Map back to our data structure
      const solution = {
        stockPieces: usedBins.map(bin => {
          const stockPiece = expandedStockPieces.find(sp => sp.id === bin.id);
          return {
            id: stockPiece.id,
            width: stockPiece.width,
            length: stockPiece.length,
            cutPieces: bin.items.map(item => {
              const cutPiece = expandedCutPieces.find(cp => cp.id === item.id);
              return {
                id: cutPiece.id,
                width: item.width,
                length: item.height,
                x: item.x,
                y: item.y,
                canRotate: cutPiece.canRotate,
                externalId: cutPiece.externalId
              };
            })
          };
        }),
        wastePercentage: 0,
        totalArea: 0,
        usedArea: 0,
        wasteArea: 0
      };

      // Calculate waste
      let totalStockArea = 0;
      let totalUsedArea = 0;

      solution.stockPieces.forEach(stockPiece => {
        const stockArea = stockPiece.width * stockPiece.length;
        totalStockArea += stockArea;

        stockPiece.cutPieces.forEach(cutPiece => {
          totalUsedArea += cutPiece.width * cutPiece.length;
        });
      });

      const totalWasteArea = totalStockArea - totalUsedArea;
      const wastePercentage = (totalWasteArea / totalStockArea) * 100;

      solution.wastePercentage = wastePercentage;
      solution.totalArea = totalStockArea;
      solution.usedArea = totalUsedArea;
      solution.wasteArea = totalWasteArea;

      // Generate a unique ID for the PDF
      const pdfId = uuidv4();

      // Store the solution for PDF generation
      pdfs[pdfId] = {
        solution,
        unit,
        layout
      };

      // Return the solution
      return res.json({
        success: true,
        solution,
        pdfId
      });
    } catch (optimizationError) {
      console.error('Bin packing error:', optimizationError);
      return res.status(500).json({
        success: false,
        message: 'Error during bin packing algorithm',
        error: optimizationError.message
      });
    }
  } catch (error) {
    console.error('Optimization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during optimization',
      error: error.message,
      stack: error.stack
    });
  }
});

// PDF endpoint
app.get('/api/optimizer/pdf/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if PDF data exists
    if (!pdfs[id]) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }

    const { solution, unit } = pdfs[id];

    // Create a PDF document
    const doc = new PDFDocument({ autoFirstPage: false });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cutlist-${id}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    solution.stockPieces.forEach((stockPiece, index) => {
      // Add a new page for each stock piece
      doc.addPage({ size: 'A4', layout: 'landscape' });

      // Add title
      doc.fontSize(18).text(`Stock Piece ${index + 1}`, { align: 'center' });
      doc.moveDown();

      // Add stock piece info
      doc.fontSize(12).text(`Dimensions: ${stockPiece.width} x ${stockPiece.length} ${unit === 0 ? 'mm' : unit === 1 ? 'inches' : 'feet'}`);
      doc.moveDown();

      // Draw stock piece
      const margin = 50;
      const pageWidth = doc.page.width - (margin * 2);
      const pageHeight = doc.page.height - (margin * 2);

      const scale = Math.min(
        pageWidth / stockPiece.width,
        pageHeight / stockPiece.length
      );

      // Draw stock piece outline
      doc.rect(margin, margin, stockPiece.width * scale, stockPiece.length * scale)
         .stroke();

      // Draw cut pieces
      stockPiece.cutPieces.forEach((cutPiece, pieceIndex) => {
        // Draw cut piece
        doc.rect(
          margin + cutPiece.x * scale,
          margin + cutPiece.y * scale,
          cutPiece.width * scale,
          cutPiece.length * scale
        )
        .fillAndStroke('#f0f0f0', '#000000');

        // Add label
        doc.fontSize(10).text(
          `${cutPiece.width} x ${cutPiece.length}`,
          margin + cutPiece.x * scale + 5,
          margin + cutPiece.y * scale + 5
        );
      });
    });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ success: false, message: 'Server error during PDF generation' });
  }
});

// Projects endpoints (simplified for serverless)
const projects = [];

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(project);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const index = projects.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Project not found' });
  }
  projects[index] = {
    ...projects[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  res.json(projects[index]);
});

app.delete('/api/projects/:id', (req, res) => {
  const index = projects.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Project not found' });
  }
  const project = projects[index];
  projects.splice(index, 1);
  res.json(project);
});

// Use the OCR parser router for /api/ocr-parser endpoints
app.use('/api/ocr-parser', ocrParser);

// Export the Express API for Vercel
module.exports = app;
