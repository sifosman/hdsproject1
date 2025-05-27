// Piece interface
export interface Piece {
  width: number;
  length: number;
  amount: number;
  pattern: number; // 0: none, 1: parallel to width, 2: parallel to length
  kind: number;    // 0: cutpiece, 1: stockpiece
}

// Project interface
export interface Project {
  _id?: string;
  name: string;
  description?: string;
  unit: number;    // 0: mm, 1: inch, 2: foot
  layout: number;  // 0: guillotine, 1: nested
  width: number;   // cut width
  pieces: Piece[];
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Optimization result
export interface OptimizationResult {
  message: string;
  pdfId: string;
  solution: {
    stockPieces: Array<{
      width: number;
      length: number;
      cutPieces: Array<{
        x: number;
        y: number;
        width: number;
        length: number;
        externalId: number;
      }>;
    }>;
  };
}
