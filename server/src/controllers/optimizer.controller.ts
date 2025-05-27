import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  prepareOptimizationData,
  optimizeCuttingLayout,
  generatePdf,
  generateIQExport,
  importFromIQ
} from '../services/optimizer.service';

// Optimize cutting layout
export const optimizeCutting = async (req: Request, res: Response) => {
  try {
    const { pieces, unit, width, layout } = req.body;

    // Validate input
    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return res.status(400).json({ message: 'Invalid pieces data' });
    }

    // Check if there are both stock pieces and cut pieces
    const hasStockPieces = pieces.some(piece => piece.kind === 1);
    const hasCutPieces = pieces.some(piece => piece.kind === 0);

    if (!hasStockPieces || !hasCutPieces) {
      return res.status(400).json({
        message: 'You need at least one stock piece and one cut piece'
      });
    }

    // Prepare data for optimization
    const { stockPieces, cutPieces } = prepareOptimizationData(pieces, unit || 0);

    // Run optimization
    const solution = optimizeCuttingLayout(stockPieces, cutPieces, width || 3, layout || 0);

    // Generate PDF
    const pdfId = generatePdf(solution, unit || 0, width || 3, layout || 0);

    // Generate IQ export data
    const iqData = generateIQExport(solution, unit || 0, width || 3, layout || 0);

    // Return result
    res.status(200).json({
      message: 'Optimization completed successfully',
      pdfId,
      solution,
      iqData
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ message: 'Error during optimization', error });
  }
};

// Download PDF result
export const downloadPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pdfPath = path.join(__dirname, '../../pdfs', `solution_${id}.pdf`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Send file
    res.download(pdfPath);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ message: 'Error downloading PDF', error });
  }
};

// Export IQ data for a specific optimization
export const exportIQData = async (req: Request, res: Response) => {
  try {
    const { solution, unit, width, layout } = req.body;

    // Validate input
    if (!solution || !solution.stockPieces) {
      return res.status(400).json({ message: 'Invalid solution data' });
    }

    // Generate IQ export data
    const iqData = generateIQExport(solution, unit || 0, width || 3, layout || 0);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=iq_export.json');

    // Send data
    res.status(200).json(iqData);
  } catch (error) {
    console.error('IQ export error:', error);
    res.status(500).json({ message: 'Error exporting IQ data', error });
  }
};

// Import data from IQ software
export const importIQData = async (req: Request, res: Response) => {
  try {
    const iqData = req.body;

    // Validate input
    if (!iqData) {
      return res.status(400).json({ message: 'Missing IQ data' });
    }

    // Process IQ data
    const { pieces, unit, width, layout } = importFromIQ(iqData);

    // Check if there are both stock pieces and cut pieces
    const hasStockPieces = pieces.some(piece => piece.kind === 1);
    const hasCutPieces = pieces.some(piece => piece.kind === 0);

    if (!hasStockPieces || !hasCutPieces) {
      return res.status(400).json({
        message: 'The imported data must contain at least one stock piece and one cut piece'
      });
    }

    // Prepare data for optimization
    const { stockPieces, cutPieces } = prepareOptimizationData(pieces, unit);

    // Run optimization
    const solution = optimizeCuttingLayout(stockPieces, cutPieces, width, layout);

    // Generate PDF
    const pdfId = generatePdf(solution, unit, width, layout);

    // Generate IQ export data for confirmation
    const exportData = generateIQExport(solution, unit, width, layout);

    // Return result
    res.status(200).json({
      message: 'IQ data imported and processed successfully',
      pdfId,
      solution,
      iqData: exportData,
      importedPieces: pieces
    });
  } catch (error) {
    console.error('IQ import error:', error);
    res.status(500).json({
      message: 'Error importing IQ data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
