import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Get Botsailor API configuration from environment variables
const BOTSAILOR_API_URL = process.env.BOTSAILOR_API_URL || 'https://www.botsailor.com/api/v1';
const BOTSAILOR_API_KEY = process.env.BOTSAILOR_API_KEY || '';

// Create axios instance for Botsailor API
const botsailorApi = axios.create({
  baseURL: BOTSAILOR_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${BOTSAILOR_API_KEY}`
  }
});

/**
 * Check the connection status with Botsailor
 */
export const checkConnectionStatus = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    const response = await botsailorApi.get('/status');
    return {
      connected: response.status === 200,
      message: 'Connection to Botsailor established'
    };
  } catch (error) {
    console.error('Botsailor connection error:', error);
    return {
      connected: false,
      message: 'Failed to connect to Botsailor API'
    };
  }
};

/**
 * Process incoming data from Botsailor
 */
export const processIncomingData = async (data: any, type: string): Promise<any> => {
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
};

/**
 * Send data to Botsailor
 */
export const sendDataToBotsailor = async (data: any, type: string): Promise<any> => {
  try {
    // Transform data to Botsailor format if needed
    const transformedData = transformDataForBotsailor(data, type);

    // Send data to Botsailor API
    const response = await botsailorApi.post(`/${type}`, transformedData);

    return {
      success: true,
      id: response.data.id,
      message: `Data sent to Botsailor successfully`
    };
  } catch (error) {
    console.error('Error sending data to Botsailor:', error);
    throw error;
  }
};

/**
 * Sync project with Botsailor
 */
export const syncProjectWithBotsailor = async (projectId: string, direction: 'push' | 'pull' = 'push'): Promise<any> => {
  try {
    if (direction === 'push') {
      // Get project data from our database
      // This is a placeholder - implement actual project retrieval
      const projectData = { id: projectId, name: 'Sample Project' };

      // Send to Botsailor
      return await sendDataToBotsailor(projectData, 'project');
    } else {
      // Pull from Botsailor
      const response = await botsailorApi.get(`/project/${projectId}`);

      // Process and save to our database
      // This is a placeholder - implement actual project saving
      return {
        success: true,
        project: response.data,
        message: 'Project pulled from Botsailor successfully'
      };
    }
  } catch (error) {
    console.error('Error syncing project with Botsailor:', error);
    throw error;
  }
};

/**
 * Get available materials from Botsailor
 */
export const getAvailableMaterials = async (): Promise<any[]> => {
  try {
    const response = await botsailorApi.get('/materials');
    return response.data.materials || [];
  } catch (error) {
    console.error('Error fetching materials from Botsailor:', error);
    throw error;
  }
};

/**
 * Get available stock pieces from Botsailor
 */
export const getAvailableStockPieces = async (materialId: string): Promise<any[]> => {
  try {
    const response = await botsailorApi.get(`/stock?materialId=${materialId}`);
    return response.data.stockPieces || [];
  } catch (error) {
    console.error('Error fetching stock pieces from Botsailor:', error);
    throw error;
  }
};

// Helper functions for data processing

const processProjectData = (data: any): any => {
  // Process project data from Botsailor
  // This is a placeholder - implement actual processing
  return {
    id: data.id || uuidv4(),
    name: data.name,
    description: data.description,
    materials: data.materials || [],
    cutPieces: data.cutPieces || [],
    stockPieces: data.stockPieces || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const processMaterialData = (data: any): any => {
  // Process material data from Botsailor
  // This is a placeholder - implement actual processing
  return {
    id: data.id || uuidv4(),
    name: data.name,
    type: data.type,
    thickness: data.thickness,
    properties: data.properties || {}
  };
};

const processStockData = (data: any): any => {
  // Process stock data from Botsailor
  // This is a placeholder - implement actual processing
  return {
    id: data.id || uuidv4(),
    materialId: data.materialId,
    width: data.width,
    length: data.length,
    quantity: data.quantity || 1,
    properties: data.properties || {}
  };
};

const processCutlistData = (data: any): any => {
  // Process cutlist data from Botsailor
  // This is a placeholder - implement actual processing
  return {
    id: data.id || uuidv4(),
    projectId: data.projectId,
    cutPieces: data.cutPieces || [],
    stockPieces: data.stockPieces || [],
    createdAt: new Date().toISOString()
  };
};

const transformDataForBotsailor = (data: any, type: string): any => {
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
export const processImageWithOCR = async (imagePath: string): Promise<any> => {
  try {
    // In a real implementation, we would use Google Cloud Vision API here
    // For now, we'll use a mock implementation that returns sample data

    // Read the image file to simulate processing
    if (!fs.existsSync(imagePath)) {
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
    const extractedData = parseOCRText(mockText);

    return extractedData;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};

/**
 * Parse OCR text to extract cutting list data
 * @param text The OCR extracted text
 * @returns Structured cutting list data
 */
const parseOCRText = (text: string): any => {
  // Define types for our result structure
  interface StockPiece {
    id: string;
    width: number;
    length: number;
    quantity: number;
    material: string;
  }

  interface CutPiece {
    id: string;
    width: number;
    length: number;
    quantity: number;
    name: string;
  }

  interface Material {
    id: string;
    name: string;
    type: string;
    thickness: number;
  }

  interface ResultData {
    stockPieces: StockPiece[];
    cutPieces: CutPiece[];
    materials: Material[];
    unit: string;
  }

  // Initialize result structure
  const result: ResultData = {
    stockPieces: [],
    cutPieces: [],
    materials: [],
    unit: 'mm' // Default unit
  };

  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // Try to identify the unit of measurement
  if (text.toLowerCase().includes('inch') || text.includes('"')) {
    result.unit = 'in';
  }

  // Regular expressions for matching dimensions
  const dimensionRegex = /(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/;
  const quantityRegex = /(\d+)\s*(?:pcs|pieces|pc|piece)/i;

  // Process each line
  lines.forEach(line => {
    // Skip header lines or empty lines
    if (line.toLowerCase().includes('cutting list') ||
        line.toLowerCase().includes('header') ||
        line.trim() === '') {
      return;
    }

    // Try to extract dimensions
    const dimensionMatch = line.match(dimensionRegex);
    if (dimensionMatch) {
      const width = parseFloat(dimensionMatch[1]);
      const length = parseFloat(dimensionMatch[2]);

      // Try to extract quantity
      let quantity = 1;
      const quantityMatch = line.match(quantityRegex);
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[1]);
      }

      // Determine if it's a stock piece or cut piece
      // Typically, larger dimensions are stock pieces
      if (width > 1000 || length > 1000) {
        result.stockPieces.push({
          width,
          length,
          quantity,
          id: `sp-${result.stockPieces.length + 1}`,
          material: 'default'
        });
      } else {
        result.cutPieces.push({
          width,
          length,
          quantity,
          id: `cp-${result.cutPieces.length + 1}`,
          name: `Part ${result.cutPieces.length + 1}`
        });
      }
    }
  });

  // If no stock pieces were found but cut pieces were, add a default stock piece
  if (result.stockPieces.length === 0 && result.cutPieces.length > 0) {
    result.stockPieces.push({
      width: 2440,
      length: 1220,
      quantity: 1,
      id: 'sp-default',
      material: 'default'
    });
  }

  // Add a default material
  result.materials.push({
    id: 'default',
    name: 'Default Material',
    type: 'board',
    thickness: 18
  });

  return result;
};

/**
 * Send WhatsApp confirmation message with the extracted cutting list data
 * @param phoneNumber The customer's phone number
 * @param extractedData The extracted cutting list data
 * @param customerName The customer's name
 * @param projectName The project name
 */
export const sendWhatsAppConfirmation = async (
  phoneNumber: string,
  extractedData: any,
  customerName: string,
  projectName: string
): Promise<any> => {
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
      
      const templateResponse = await axios.post(`${BOTSAILOR_API_URL}/whatsapp/send-template`, {
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
      } else {
        console.warn('Template message failed, falling back to regular message...');
        // Continue to try regular message as fallback
      }
    } catch (templateError) {
      console.error('Error sending template message:', templateError);
      console.warn('Template message failed, falling back to regular message...');
      // Continue to try regular message as fallback
    }
    
    // Fallback: try to send as regular message
    console.log('Attempting to send regular WhatsApp message...');
    const response = await axios.post(`${BOTSAILOR_API_URL}/whatsapp/send`, {
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
    } else {
      // Check for specific error conditions
      const errorMessage = response.data?.message || 'Unknown error';
      
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
  } catch (error) {
    console.error('Error sending WhatsApp confirmation:', error);
    throw error;
  }
};

/**
 * Format a WhatsApp message with the extracted cutting list data
 * @param data The extracted cutting list data
 * @param customerName The customer's name
 * @param projectName The project name
 * @returns Formatted WhatsApp message
 */
const formatWhatsAppMessage = (data: any, customerName: string, projectName: string): string => {
  // Log the incoming data structure
  console.log('Data structure received in formatWhatsAppMessage:', JSON.stringify(data));
  
  let message = `Hello ${customerName},\n\n`;
  
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
