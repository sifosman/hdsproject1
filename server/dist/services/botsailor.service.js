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
exports.sendWhatsAppConfirmation = exports.parseOCRText = exports.processImageWithOCR = exports.getAvailableStockPieces = exports.getAvailableMaterials = exports.syncProjectWithBotsailor = exports.sendDataToBotsailor = exports.processIncomingData = exports.checkConnectionStatus = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
// Get Botsailor API configuration from environment variables
const BOTSAILOR_API_URL = process.env.BOTSAILOR_API_URL || 'https://www.botsailor.com/api/v1';
const BOTSAILOR_API_KEY = process.env.BOTSAILOR_API_KEY || '';
// Create axios instance for Botsailor API
const botsailorApi = axios_1.default.create({
    baseURL: BOTSAILOR_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOTSAILOR_API_KEY}`
    }
});
/**
 * Check the connection status with Botsailor
 */
const checkConnectionStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield botsailorApi.get('/status');
        return {
            connected: response.status === 200,
            message: 'Connection to Botsailor established'
        };
    }
    catch (error) {
        console.error('Botsailor connection error:', error);
        return {
            connected: false,
            message: 'Failed to connect to Botsailor API'
        };
    }
});
exports.checkConnectionStatus = checkConnectionStatus;
/**
 * Process incoming data from Botsailor
 */
const processIncomingData = (data, type) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate and process incoming data based on type
    switch (type) {
        case 'project':
            return processProjectData(data);
        case 'material':
            return processMaterialData(data);
        case 'stock':
            return processStockData(data);
        case 'cutlist':
            return processCutlistData(data);
        default:
            throw new Error(`Unsupported data type: ${type}`);
    }
});
exports.processIncomingData = processIncomingData;
/**
 * Send data to Botsailor
 */
const sendDataToBotsailor = (data, type) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Transform data to Botsailor format if needed
        const transformedData = transformDataForBotsailor(data, type);
        // Send data to Botsailor API
        const response = yield botsailorApi.post(`/${type}`, transformedData);
        return {
            success: true,
            id: response.data.id,
            message: `Data sent to Botsailor successfully`
        };
    }
    catch (error) {
        console.error('Error sending data to Botsailor:', error);
        throw error;
    }
});
exports.sendDataToBotsailor = sendDataToBotsailor;
/**
 * Sync project with Botsailor
 */
const syncProjectWithBotsailor = (projectId_1, ...args_1) => __awaiter(void 0, [projectId_1, ...args_1], void 0, function* (projectId, direction = 'push') {
    try {
        if (direction === 'push') {
            // Get project data from our database
            // This is a placeholder - implement actual project retrieval
            const projectData = { id: projectId, name: 'Sample Project' };
            // Send to Botsailor
            return yield (0, exports.sendDataToBotsailor)(projectData, 'project');
        }
        else {
            // Pull from Botsailor
            const response = yield botsailorApi.get(`/project/${projectId}`);
            // Process and save to our database
            // This is a placeholder - implement actual project saving
            return {
                success: true,
                project: response.data,
                message: 'Project pulled from Botsailor successfully'
            };
        }
    }
    catch (error) {
        console.error('Error syncing project with Botsailor:', error);
        throw error;
    }
});
exports.syncProjectWithBotsailor = syncProjectWithBotsailor;
/**
 * Get available materials from Botsailor
 */
const getAvailableMaterials = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield botsailorApi.get('/materials');
        return response.data.materials || [];
    }
    catch (error) {
        console.error('Error fetching materials from Botsailor:', error);
        throw error;
    }
});
exports.getAvailableMaterials = getAvailableMaterials;
/**
 * Get available stock pieces from Botsailor
 */
const getAvailableStockPieces = (materialId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield botsailorApi.get(`/stock?materialId=${materialId}`);
        return response.data.stockPieces || [];
    }
    catch (error) {
        console.error('Error fetching stock pieces from Botsailor:', error);
        throw error;
    }
});
exports.getAvailableStockPieces = getAvailableStockPieces;
// Helper functions for data processing
const processProjectData = (data) => {
    // Process project data from Botsailor
    // This is a placeholder - implement actual processing
    return {
        id: data.id || (0, uuid_1.v4)(),
        name: data.name,
        description: data.description,
        materials: data.materials || [],
        cutPieces: data.cutPieces || [],
        stockPieces: data.stockPieces || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};
const processMaterialData = (data) => {
    // Process material data from Botsailor
    // This is a placeholder - implement actual processing
    return {
        id: data.id || (0, uuid_1.v4)(),
        name: data.name,
        type: data.type,
        thickness: data.thickness,
        properties: data.properties || {}
    };
};
const processStockData = (data) => {
    // Process stock data from Botsailor
    // This is a placeholder - implement actual processing
    return {
        id: data.id || (0, uuid_1.v4)(),
        materialId: data.materialId,
        width: data.width,
        length: data.length,
        quantity: data.quantity || 1,
        properties: data.properties || {}
    };
};
const processCutlistData = (data) => {
    // Process cutlist data from Botsailor
    // This is a placeholder - implement actual processing
    return {
        id: data.id || (0, uuid_1.v4)(),
        projectId: data.projectId,
        cutPieces: data.cutPieces || [],
        stockPieces: data.stockPieces || [],
        createdAt: new Date().toISOString()
    };
};
const transformDataForBotsailor = (data, type) => {
    // Transform data to Botsailor format based on type
    // This is a placeholder - implement actual transformation
    switch (type) {
        case 'project':
            return {
                id: data.id,
                name: data.name,
                description: data.description,
                materials: data.materials,
                cutPieces: data.cutPieces,
                stockPieces: data.stockPieces
            };
        case 'cutlist':
            return {
                projectId: data.projectId,
                cutPieces: data.cutPieces,
                stockPieces: data.stockPieces
            };
        default:
            return data;
    }
};
/**
 * Process an image with OCR to extract cutting list data
 * @param imagePath Path to the uploaded image
 * @returns Extracted cutting list data
 */
const processImageWithOCR = (imagePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // In a real implementation, we would use Google Cloud Vision API here
        // For now, we'll use a mock implementation that returns sample data
        // Read the image file to simulate processing
        if (!fs_1.default.existsSync(imagePath)) {
            throw new Error(`Image file not found at path: ${imagePath}`);
        }
        // Log that we're processing the image
        console.log(`Processing image: ${imagePath}`);
        // Simulate OCR text extraction
        // In a real implementation, this would be the result from Google Cloud Vision API
        const mockText = `Cutting List
      800 x 600 2pcs
      400 x 300 4pcs
      2440 x 1220 1pc
    `;
        // Process the extracted text to identify cutting list items
        const extractedData = (0, exports.parseOCRText)(mockText);
        return extractedData;
    }
    catch (error) {
        console.error('OCR processing error:', error);
        throw error;
    }
});
exports.processImageWithOCR = processImageWithOCR;
/**
 * Parse OCR text to extract cutting list data
 * @param text The OCR extracted text
 * @returns Structured cutting list data
 */
const parseOCRText = (text) => {
    console.log('Starting OCR text parsing...');
    console.log('Raw text received for parsing:\n', text);
    // Initialize result structure
    const result = {
        stockPieces: [],
        cutPieces: [],
        materials: [],
        unit: 'mm' // Default unit
    };
    const lines = text.split('\n').filter(line => line.trim() !== '');
    console.log(`Processing ${lines.length} lines of text...`);
    // More robust regex patterns to find dimensions and quantities
    const dimensionPatterns = [
        // Pattern 1: 1000x500=2, 1000 x 500 = 2, 1000*500=2, etc.
        /(\d+)\s*[xX×*]\s*(\d+)\s*[=\-\s]\s*(\d+)/,
        // Pattern 2: 1000x500 (2), 1000 x 500 (2)
        /(\d+)\s*[xX×*]\s*(\d+)\s*\((\d+)\)/,
        // Pattern 3: 1000x500 2pcs, 1000x500 2 pc, etc.
        /(\d+)\s*[xX×*]\s*(\d+)\s+(\d+)\s*(?:pcs?|pieces?|pce|szt|x)/i,
        // Pattern 4: 1000x500, quantity is on the same line but separated
        /(\d+)\s*[xX×*]\s*(\d+)/, // fallback no qty
    ];
    lines.forEach((line, index) => {
        var _a, _b;
        console.log(`Parsing line ${index + 1}: "${line}"`);
        let matched = false;
        let width = 0, length = 0, quantity = 0; // Initialize quantity to 0
        for (const pattern of dimensionPatterns) {
            const match = line.match(pattern);
            if (match) {
                width = parseInt(match[1]);
                length = parseInt(match[2]);
                // Use the third capturing group for quantity if it exists
                quantity = match[3] ? parseInt(match[3]) : 0;
                if (!isNaN(width) && !isNaN(length) && width > 0 && length > 0) {
                    console.log(`Pattern matched: ${pattern}. Width=${width}, Length=${length}, Quantity=${quantity}`);
                    // If quantity is still 0, try to find it in the rest of the string
                    if (quantity === 0) {
                        const remainder = line.substring(match[0].length).trim();
                        console.log(`No quantity in main pattern. Checking remainder: "${remainder}"`);
                        const quantityMatch = remainder.match(/([0-9]+)/);
                        if (quantityMatch && quantityMatch[1]) {
                            quantity = parseInt(quantityMatch[1]);
                            console.log(`Found quantity in remainder: ${quantity}`);
                        }
                    }
                    matched = true;
                    break; // Exit loop once a pattern matches
                }
            }
        }
        // If a dimension was found, add it to the cut pieces
        // Fallback: if no pattern matched, try simple numeric extraction
        if (!matched) {
            const nums = (_a = line.match(/\d+/g)) === null || _a === void 0 ? void 0 : _a.map(n => parseInt(n));
            if (nums && nums.length >= 2) {
                width = nums[0];
                length = nums[1];
                quantity = (_b = nums[2]) !== null && _b !== void 0 ? _b : 1;
                matched = true;
                console.log(`Fallback numeric parse -> width ${width}, length ${length}, quantity ${quantity}`);
            }
        }
        if (matched && width > 0 && length > 0) {
            // If quantity is still not found, default to 1 as a last resort.
            if (quantity === 0) {
                quantity = 1;
                console.log('Quantity not found, defaulting to 1.');
            }
            result.cutPieces.push({
                id: (0, uuid_1.v4)(),
                width,
                length,
                quantity,
                name: `Piece ${result.cutPieces.length + 1}`,
                description: line // Store the original line for reference
            });
            console.log(`Added cut piece: ${width}x${length}, Qty: ${quantity}`);
        }
        else {
            console.log(`No valid dimension found in line: "${line}"`);
        }
    });
    console.log('Finished OCR text parsing.');
    console.log('Final extracted data:', JSON.stringify(result, null, 2));
    return result;
};
exports.parseOCRText = parseOCRText;
/**
 * Send WhatsApp confirmation message with the extracted cutting list data
 * @param phoneNumber The customer's phone number
 * @param extractedData The extracted cutting list data
 * @param customerName The customer's name
 * @param projectName The project name
 * @returns WhatsApp message sending result
 */
const sendWhatsAppConfirmation = (phoneNumber, extractedData, customerName, projectName) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Format the message content (for both regular and template messages)
        const formattedMessage = formatWhatsAppMessage(extractedData, customerName, projectName);
        console.log(`Preparing to send WhatsApp message to ${phoneNumber}`);
        // Get WhatsApp phone number ID from environment variable
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'cutlist_results';
        if (!phoneNumberId) {
            console.warn('WHATSAPP_PHONE_NUMBER_ID environment variable is not set');
            console.warn('Using fallback message logging instead of sending via Botsailor API');
            console.log(formattedMessage);
            return {
                success: false,
                message: 'WhatsApp message not sent - missing phone_number_id',
                phoneNumber,
                timestamp: new Date().toISOString()
            };
        }
        // For debugging - always log the message we're trying to send
        console.log('Formatted WhatsApp message to send:', formattedMessage);
        // Get the number of dimensions found (if available)
        const dimensionsCount = extractedData.dimensionsCount ||
            (extractedData.dimensions ? extractedData.dimensions.length : 0);
        // Get the URL to the cutting list viewer (if available)
        const cutlistUrl = extractedData.cutlistUrl || '';
        // Create a simple template message structure with minimal content
        // This is much more likely to be approved by WhatsApp
        const templateMessage = {
            name: templateName,
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: customerName || 'Customer' },
                        { type: 'text', text: projectName || 'Cutting List Project' },
                        { type: 'text', text: dimensionsCount.toString() },
                        { type: 'text', text: cutlistUrl }
                    ]
                }
            ]
        };
        // Log template structure for debugging
        console.log('Template message structure:', JSON.stringify(templateMessage));
        // Try to send message - first attempt using template
        try {
            console.log('Attempting to send WhatsApp template message...');
            const templateResponse = yield axios_1.default.post(`${BOTSAILOR_API_URL}/whatsapp/send-template`, {
                apiToken: BOTSAILOR_API_KEY,
                phone_number_id: phoneNumberId,
                template: templateMessage,
                phone_number: phoneNumber.replace(/\+/g, '') // Remove + if present (API requires only numeric characters)
            });
            console.log('Botsailor WhatsApp template API response:', templateResponse.data);
            if (templateResponse.data && templateResponse.data.status === '1') {
                return {
                    success: true,
                    message: 'WhatsApp template message sent successfully via Botsailor API',
                    response: templateResponse.data,
                    phoneNumber,
                    timestamp: new Date().toISOString(),
                    method: 'template'
                };
            }
            else {
                console.warn('Template message failed, falling back to regular message...');
                // Continue to try regular message as fallback
            }
        }
        catch (templateError) {
            console.error('Error sending template message:', templateError);
            console.warn('Template message failed, falling back to regular message...');
            // Continue to try regular message as fallback
        }
        // Fallback: try to send as regular message
        console.log('Attempting to send regular WhatsApp message...');
        const response = yield axios_1.default.post(`${BOTSAILOR_API_URL}/whatsapp/send`, {
            apiToken: BOTSAILOR_API_KEY,
            phone_number_id: phoneNumberId,
            message: formattedMessage,
            phone_number: phoneNumber.replace(/\+/g, '') // Remove + if present
        });
        console.log('Botsailor WhatsApp API response:', response.data);
        if (response.data && response.data.status === '1') {
            return {
                success: true,
                message: 'WhatsApp message sent successfully via Botsailor API',
                response: response.data,
                phoneNumber,
                timestamp: new Date().toISOString(),
                method: 'regular'
            };
        }
        else {
            // Check for specific error conditions
            const errorMessage = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error';
            if (errorMessage.includes('24 hour window')) {
                console.log('WhatsApp 24-hour policy restriction encountered:');
                console.log('This is a WhatsApp Business API limitation. Outside the 24-hour window,');
                console.log('only template messages approved by WhatsApp/Meta can be sent.');
                console.log('Template message also failed. Please check:');
                console.log('1. That your template is approved in Botsailor');
                console.log('2. That WHATSAPP_TEMPLATE_NAME is set correctly in environment variables');
            }
            return {
                success: false,
                message: 'Failed to send WhatsApp message via Botsailor API',
                response: response.data,
                errorDetails: errorMessage,
                phoneNumber,
                timestamp: new Date().toISOString()
            };
        }
    }
    catch (error) {
        console.error('Error sending WhatsApp confirmation:', error);
        throw error;
    }
});
exports.sendWhatsAppConfirmation = sendWhatsAppConfirmation;
/**
 * Format a WhatsApp message with the extracted cutting list data
 * @param data The extracted cutting list data
 * @param customerName The customer's name
 * @param projectName The project name
 * @returns Formatted WhatsApp message
 */
const formatWhatsAppMessage = (data, customerName, projectName) => {
    // Log the incoming data structure
    console.log('Data structure received in formatWhatsAppMessage:', JSON.stringify(data));
    let message = `Hello`;
    // Check if we have a cutlist URL (new approach with web link)
    if (data.cutlistUrl) {
        const dimensionsCount = data.dimensionsCount || (data.dimensions ? data.dimensions.length : 0);
        message += `We've processed your cutting list for project "${projectName}".\n\n`;
        message += `We found ${dimensionsCount} dimension${dimensionsCount !== 1 ? 's' : ''} in your image.\n\n`;
        message += `View and edit your cutting list here:\n${data.cutlistUrl}\n\n`;
        message += `The link above will show all measurements and allow you to make changes if needed.\n\n`;
    }
    // Handle data structure with dimensions array (from OCR) - used as fallback
    else if (data.dimensions && Array.isArray(data.dimensions)) {
        message += `We've received your cutting list for project "${projectName}" and processed it.\n\n`;
        message += `*Dimensions (${data.dimensions.length}):*\n`;
        // Limit to first 5 dimensions to keep message short
        const displayCount = Math.min(data.dimensions.length, 5);
        for (let i = 0; i < displayCount; i++) {
            const piece = data.dimensions[i];
            const quantity = piece.quantity || 1;
            const desc = piece.description ? ` ${piece.description}` : '';
            message += `${i + 1}. ${piece.width} × ${piece.length} ${data.unit || 'mm'} (Qty: ${quantity})${desc}\n`;
        }
        // Show a message if there are more dimensions than displayed
        if (data.dimensions.length > displayCount) {
            message += `... and ${data.dimensions.length - displayCount} more\n`;
        }
    }
    // If no recognized structure, use a simple message
    else {
        message += `We've processed your cutting list for project "${projectName}".\n\n`;
        message += `*Your cutting list has been processed*\n\n`;
    }
    message += `Thank you,\nHDS Group Cutlist Team`;
    return message;
};
