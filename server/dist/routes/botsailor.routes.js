"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const botsailor_controller_1 = require("../controllers/botsailor.controller");
const router = express_1.default.Router();
// GET status of Botsailor connection
router.get('/status', botsailor_controller_1.botsailorController.getConnectionStatus);
// POST receive data from Botsailor
router.post('/receive', botsailor_controller_1.botsailorController.receiveData);
// POST send data to Botsailor
router.post('/send', botsailor_controller_1.botsailorController.sendData);
// POST sync project data with Botsailor
router.post('/sync/:projectId', botsailor_controller_1.botsailorController.syncProject);
// GET available materials from Botsailor
router.get('/materials', botsailor_controller_1.botsailorController.getMaterials);
// GET available stock pieces from Botsailor
router.get('/stock', botsailor_controller_1.botsailorController.getStockPieces);
// POST process cutting list image with OCR
router.post('/process-image', botsailor_controller_1.botsailorController.processCutlistImage);
// POST receive WhatsApp image webhook from Botsailor
router.post('/whatsapp/inbound', botsailor_controller_1.botsailorController.receiveWhatsAppWebhook);
exports.default = router;
