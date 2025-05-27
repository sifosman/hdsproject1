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
exports.cutlistController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const template_service_1 = require("../services/template.service");
// Import the Cutlist model with CommonJS require to avoid TypeScript module resolution issues
const Cutlist = require('../models/cutlist.model').default;
// Prepare cutlist data for template rendering
const prepareCutlistData = (cutlistData) => {
    return {
        dimensions: cutlistData.dimensions || [],
        unit: cutlistData.unit || 'mm',
        rawText: cutlistData.rawText || '',
        customerName: cutlistData.customerName || 'Customer',
        projectName: cutlistData.projectName || 'Cutting List Project',
        id: cutlistData._id
    };
};
// View cutlist by ID
const viewCutlistById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cutlistId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(cutlistId)) {
            return res.status(400).send('Invalid cutting list ID');
        }
        const cutlist = yield Cutlist.findById(cutlistId);
        if (!cutlist) {
            return res.status(404).send('Cutting list not found');
        }
        // Prepare data for template
        const templateData = prepareCutlistData(cutlist);
        // Render the template
        const htmlContent = yield (0, template_service_1.renderTemplate)('cutlist-template', templateData);
        // Return HTML page
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    }
    catch (error) {
        console.error('Error viewing cutting list:', error);
        res.status(500).send('Server error');
    }
});
// Update cutting list by ID
const updateCutlistById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cutlistId = req.params.id;
        const { dimensions } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(cutlistId)) {
            return res.status(400).json({ success: false, message: 'Invalid cutting list ID' });
        }
        const cutlist = yield Cutlist.findById(cutlistId);
        if (!cutlist) {
            return res.status(404).json({ success: false, message: 'Cutting list not found' });
        }
        // Update dimensions
        cutlist.dimensions = dimensions;
        yield cutlist.save();
        res.json({
            success: true,
            message: 'Cutting list updated successfully',
            cutlist
        });
    }
    catch (error) {
        console.error('Error updating cutting list:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Get cutlist data as JSON
const getCutlistData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cutlistId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(cutlistId)) {
            return res.status(400).json({ success: false, message: 'Invalid cutting list ID' });
        }
        const cutlist = yield Cutlist.findById(cutlistId);
        if (!cutlist) {
            return res.status(404).json({ success: false, message: 'Cutting list not found' });
        }
        res.json({
            success: true,
            cutlist
        });
    }
    catch (error) {
        console.error('Error getting cutlist data:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Get all cutlists
const getAllCutlists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cutlists = yield Cutlist.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            cutlists
        });
    }
    catch (error) {
        console.error('Error getting all cutlists:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Export controller as an object with methods
exports.cutlistController = {
    viewCutlistById,
    updateCutlistById,
    getCutlistData,
    getAllCutlists
};
