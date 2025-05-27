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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importIQData = exports.exportIQData = exports.downloadPdf = exports.optimizeCutting = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const optimizer_service_1 = require("../services/optimizer.service");
// Optimize cutting layout
const optimizeCutting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const { stockPieces, cutPieces } = (0, optimizer_service_1.prepareOptimizationData)(pieces, unit || 0);
        // Run optimization
        const solution = (0, optimizer_service_1.optimizeCuttingLayout)(stockPieces, cutPieces, width || 3, layout || 0);
        // Generate PDF
        const pdfId = (0, optimizer_service_1.generatePdf)(solution, unit || 0, width || 3, layout || 0);
        // Generate IQ export data
        const iqData = (0, optimizer_service_1.generateIQExport)(solution, unit || 0, width || 3, layout || 0);
        // Return result
        res.status(200).json({
            message: 'Optimization completed successfully',
            pdfId,
            solution,
            iqData
        });
    }
    catch (error) {
        console.error('Optimization error:', error);
        res.status(500).json({ message: 'Error during optimization', error });
    }
});
exports.optimizeCutting = optimizeCutting;
// Download PDF result
const downloadPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const pdfPath = path_1.default.join(__dirname, '../../pdfs', `solution_${id}.pdf`);
        // Check if file exists
        if (!fs_1.default.existsSync(pdfPath)) {
            return res.status(404).json({ message: 'PDF not found' });
        }
        // Send file
        res.download(pdfPath);
    }
    catch (error) {
        console.error('PDF download error:', error);
        res.status(500).json({ message: 'Error downloading PDF', error });
    }
});
exports.downloadPdf = downloadPdf;
// Export IQ data for a specific optimization
const exportIQData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { solution, unit, width, layout } = req.body;
        // Validate input
        if (!solution || !solution.stockPieces) {
            return res.status(400).json({ message: 'Invalid solution data' });
        }
        // Generate IQ export data
        const iqData = (0, optimizer_service_1.generateIQExport)(solution, unit || 0, width || 3, layout || 0);
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=iq_export.json');
        // Send data
        res.status(200).json(iqData);
    }
    catch (error) {
        console.error('IQ export error:', error);
        res.status(500).json({ message: 'Error exporting IQ data', error });
    }
});
exports.exportIQData = exportIQData;
// Import data from IQ software
const importIQData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const iqData = req.body;
        // Validate input
        if (!iqData) {
            return res.status(400).json({ message: 'Missing IQ data' });
        }
        // Process IQ data
        const { pieces, unit, width, layout } = (0, optimizer_service_1.importFromIQ)(iqData);
        // Check if there are both stock pieces and cut pieces
        const hasStockPieces = pieces.some(piece => piece.kind === 1);
        const hasCutPieces = pieces.some(piece => piece.kind === 0);
        if (!hasStockPieces || !hasCutPieces) {
            return res.status(400).json({
                message: 'The imported data must contain at least one stock piece and one cut piece'
            });
        }
        // Prepare data for optimization
        const { stockPieces, cutPieces } = (0, optimizer_service_1.prepareOptimizationData)(pieces, unit);
        // Run optimization
        const solution = (0, optimizer_service_1.optimizeCuttingLayout)(stockPieces, cutPieces, width, layout);
        // Generate PDF
        const pdfId = (0, optimizer_service_1.generatePdf)(solution, unit, width, layout);
        // Generate IQ export data for confirmation
        const exportData = (0, optimizer_service_1.generateIQExport)(solution, unit, width, layout);
        // Return result
        res.status(200).json({
            message: 'IQ data imported and processed successfully',
            pdfId,
            solution,
            iqData: exportData,
            importedPieces: pieces
        });
    }
    catch (error) {
        console.error('IQ import error:', error);
        res.status(500).json({
            message: 'Error importing IQ data',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.importIQData = importIQData;
