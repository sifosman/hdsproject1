import { Request, Response } from 'express';
import Branch from '../models/branch.model';

// GET /api/branches/by-trading-as/:tradingAs
export const getBranchByTradingAs = async (req: Request, res: Response) => {
  try {
    const { tradingAs } = req.params;
    if (!tradingAs) {
      return res.status(400).json({ success: false, message: 'Missing tradingAs parameter' });
    }
    const branch = await Branch.findOne({ trading_as: tradingAs });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    return res.json({ success: true, branch });
  } catch (error) {
    console.error('Error fetching branch by trading_as:', error);
    return res.status(500).json({ success: false, message: 'Server error', error });
  }
};
