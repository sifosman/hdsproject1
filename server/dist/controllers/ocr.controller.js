"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.sendWhatsAppConfirmation = exports.updateCutlistData = exports.getProcessingStatus = exports.processCutlistImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ocrService = __importStar(require("../services/ocr.service"));
const whatsappService = __importStar(require("../services/whatsapp.service"));
// Configure multer for image uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, 'cutlist-' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept only image files
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});
/**
 * Process a cutting list image using OCR
 * This endpoint accepts an image file and extracts cutting list data using OCR
 */
const processCutlistImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Use multer middleware to handle the file upload
    const uploadMiddleware = upload.single('image');
    uploadMiddleware(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(400).json({
                success: false,
                message: 'Error uploading file',
                error: err.message
            });
        }
        try {
            // Check if file was uploaded
            const multerReq = req;
            if (!multerReq.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }
            // Get additional parameters
            const { phoneNumber, customerName, projectName } = req.body;
            // Process the image with OCR
            const filePath = multerReq.file.path;
            const ocrResults = yield ocrService.processImageWithOCR(filePath);
            // Convert OCR results to cutting list data
            const cutlistData = ocrService.convertOCRToCutlistData(ocrResults);
            // Send confirmation to WhatsApp if phone number is provided
            let whatsappResponse = null;
            if (phoneNumber) {
                whatsappResponse = yield whatsappService.sendWhatsAppConfirmation(phoneNumber, cutlistData, customerName || 'Customer', projectName || 'Cutting List Project');
            }
            // Return the extracted data
            res.status(200).json({
                success: true,
                message: 'Cutting list image processed successfully',
                data: cutlistData,
                rawText: ocrResults.rawText,
                whatsappSent: !!whatsappResponse,
                whatsappResponse,
                imagePath: multerReq.file.path
            });
        }
        catch (error) {
            console.error('Error processing cutting list image:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing cutting list image',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }));
});
exports.processCutlistImage = processCutlistImage;
/**
 * Get the status of a previously processed image
 */
const getProcessingStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // In a real implementation, you would check a database or cache for the status
        // For now, we'll just return a mock response
        res.status(200).json({
            success: true,
            id,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting processing status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting processing status',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.getProcessingStatus = getProcessingStatus;
/**
 * Update cutting list data after OCR processing
 */
const updateCutlistData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cutlistData } = req.body;
        if (!cutlistData) {
            return res.status(400).json({
                success: false,
                message: 'No cutlist data provided'
            });
        }
        // In a real implementation, you would save the updated data to a database
        // For now, we'll just return the data as received
        res.status(200).json({
            success: true,
            message: 'Cutlist data updated successfully',
            data: cutlistData
        });
    }
    catch (error) {
        console.error('Error updating cutlist data:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating cutlist data',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.updateCutlistData = updateCutlistData;
/**
 * Send WhatsApp confirmation for a cutting list
 */
const sendWhatsAppConfirmation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, cutlistData, customerName, projectName } = req.body;
        if (!phoneNumber || !cutlistData) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and cutlist data are required'
            });
        }
        // Send WhatsApp confirmation
        const whatsappResponse = yield whatsappService.sendWhatsAppConfirmation(phoneNumber, cutlistData, customerName || 'Customer', projectName || 'Cutting List Project');
        res.status(200).json({
            success: true,
            message: 'WhatsApp confirmation sent successfully',
            whatsappResponse
        });
    }
    catch (error) {
        console.error('Error sending WhatsApp confirmation:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending WhatsApp confirmation',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.sendWhatsAppConfirmation = sendWhatsAppConfirmation;
