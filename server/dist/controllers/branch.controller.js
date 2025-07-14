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
exports.getBranchByTradingAs = void 0;
const branch_model_1 = __importDefault(require("../models/branch.model"));
// GET /api/branches/by-trading-as/:tradingAs
const getBranchByTradingAs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tradingAs } = req.params;
        if (!tradingAs) {
            return res.status(400).json({ success: false, message: 'Missing tradingAs parameter' });
        }
        const branch = yield branch_model_1.default.findOne({ trading_as: tradingAs });
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        return res.json({ success: true, branch });
    }
    catch (error) {
        console.error('Error fetching branch by trading_as:', error);
        return res.status(500).json({ success: false, message: 'Server error', error });
    }
});
exports.getBranchByTradingAs = getBranchByTradingAs;
