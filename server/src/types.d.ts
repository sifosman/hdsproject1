import { Request, Response, NextFunction } from 'express';

declare global {
  type RequestHandler = (req: Request, res: Response, next?: NextFunction) => any;
}
