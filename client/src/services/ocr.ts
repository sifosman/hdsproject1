import api from './api';

interface StockPiece {
  id: string;
  width: number;
  length: number;
  quantity: number;
  material?: string;
}

interface CutPiece {
  id: string;
  width: number;
  length: number;
  quantity: number;
  name?: string;
}

interface Material {
  id: string;
  name: string;
  type: string;
  thickness: number;
}

interface CutlistData {
  stockPieces: StockPiece[];
  cutPieces: CutPiece[];
  materials: Material[];
  unit: string;
}

/**
 * Process a cutting list image with OCR
 * @param imageFile The image file to process
 * @param phoneNumber Optional phone number for WhatsApp confirmation
 * @param customerName Optional customer name
 * @param projectName Optional project name
 */
export const processCutlistImage = async (
  imageFile: File,
  phoneNumber?: string,
  customerName?: string,
  projectName?: string
): Promise<any> => {
  // Create form data
  const formData = new FormData();
  formData.append('image', imageFile);
  
  if (phoneNumber) {
    formData.append('phoneNumber', phoneNumber);
  }
  
  if (customerName) {
    formData.append('customerName', customerName);
  }
  
  if (projectName) {
    formData.append('projectName', projectName);
  }
  
  // Use fetch API directly for multipart form data
  const response = await fetch(`${api.defaults.baseURL}/ocr/process-image`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Update cutting list data
 * @param cutlistData The cutting list data to update
 */
export const updateCutlistData = async (cutlistData: CutlistData): Promise<any> => {
  const response = await api.put('/ocr/update', { cutlistData });
  return response.data;
};

/**
 * Send WhatsApp confirmation for a cutting list
 * @param phoneNumber The phone number to send the confirmation to
 * @param cutlistData The cutting list data
 * @param customerName Optional customer name
 * @param projectName Optional project name
 */
export const sendWhatsAppConfirmation = async (
  phoneNumber: string,
  cutlistData: CutlistData,
  customerName?: string,
  projectName?: string
): Promise<any> => {
  const response = await api.post('/ocr/send-whatsapp', {
    phoneNumber,
    cutlistData,
    customerName,
    projectName
  });
  return response.data;
};

export default {
  processCutlistImage,
  updateCutlistData,
  sendWhatsAppConfirmation
};
