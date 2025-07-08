export interface StockPiece {
  id: string;
  width: number;
  length: number;
  quantity: number;
  material?: string;
}

export interface CutPiece {
  id: string;
  width?: number;
  length?: number;
  quantity?: number;
  name?: string;
  edging?: number;
  separator?: boolean;
  lengthTick1?: boolean;
  lengthTick2?: boolean;
  widthTick1?: boolean;
  widthTick2?: boolean;
  material?: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  thickness: number;
}

export interface CutlistData {
  stockPieces: StockPiece[];
  cutPieces: CutPiece[];
  materials: Material[];
  unit: string;
  customerName?: string;
  projectName?: string;
}

export interface EditableCutlistTableProps {
  initialData: CutlistData;
  onSave: (data: CutlistData) => void;
  onSendWhatsApp?: (phoneNumber: string, data: CutlistData, customerName?: string, projectName?: string) => void;
  isMobile?: boolean;
  isConfirmed?: boolean;
}
