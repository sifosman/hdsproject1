import api from './api';

/**
 * Get the status of the Botsailor connection
 */
export const getConnectionStatus = async (): Promise<any> => {
  const response = await api.get('/botsailor/status');
  return response.data;
};

/**
 * Receive data from Botsailor
 */
export const receiveData = async (data: any, type: string): Promise<any> => {
  const response = await api.post('/botsailor/receive', { data, type });
  return response.data;
};

/**
 * Send data to Botsailor
 */
export const sendData = async (data: any, type: string): Promise<any> => {
  const response = await api.post('/botsailor/send', { data, type });
  return response.data;
};

/**
 * Sync project with Botsailor
 */
export const syncProject = async (projectId: string, direction: 'push' | 'pull'): Promise<any> => {
  const response = await api.post(`/botsailor/sync/${projectId}`, { direction });
  return response.data;
};

/**
 * Get available materials from Botsailor
 */
export const getMaterials = async (): Promise<any> => {
  const response = await api.get('/botsailor/materials');
  return response.data;
};

/**
 * Get available stock pieces from Botsailor
 */
export const getStockPieces = async (materialId: string): Promise<any> => {
  const response = await api.get(`/botsailor/stock?materialId=${materialId}`);
  return response.data;
};

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
  const response = await fetch(`${api.defaults.baseURL}/botsailor/process-image`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Send WhatsApp confirmation message
 * @param phoneNumber The customer's phone number
 * @param data The cutlist data
 * @param customerName Optional customer name
 * @param projectName Optional project name
 */
export const sendWhatsAppConfirmation = async (
  phoneNumber: string,
  data: any,
  customerName?: string,
  projectName?: string
): Promise<any> => {
  const response = await api.post('/botsailor/send', {
    data: {
      phoneNumber,
      customerName: customerName || 'Customer',
      projectName: projectName || 'Cutting List Project',
      cutlistData: data
    },
    type: 'whatsapp'
  });

  return response.data;
};

export default {
  getConnectionStatus,
  receiveData,
  sendData,
  syncProject,
  getMaterials,
  getStockPieces,
  processCutlistImage,
  sendWhatsAppConfirmation
};
