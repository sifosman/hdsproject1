import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Get WhatsApp API configuration from environment variables
// This could be Botsailor's API or any other WhatsApp Business API provider
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';

// Create axios instance for WhatsApp API
const whatsappApi = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WHATSAPP_API_KEY}`
  }
});

/**
 * Interface for cutlist data
 */
interface CutlistData {
  stockPieces: Array<{
    id: string;
    width: number;
    length: number;
    quantity: number;
    material?: string;
  }>;
  cutPieces: Array<{
    id: string;
    width: number;
    length: number;
    quantity: number;
    name?: string;
  }>;
  materials: Array<{
    id: string;
    name: string;
    type: string;
    thickness: number;
  }>;
  unit: string;
}

/**
 * Send a WhatsApp message with the extracted cutting list data
 * @param phoneNumber The customer's phone number
 * @param cutlistData The extracted cutting list data
 * @param customerName The customer's name
 * @param projectName The project name
 * @returns Response from the WhatsApp API
 */
export const sendWhatsAppConfirmation = async (
  phoneNumber: string,
  cutlistData: CutlistData,
  customerName: string = 'Customer',
  projectName: string = 'Cutting List Project'
): Promise<any> => {
  try {
    // Format the message
    const message = formatWhatsAppMessage(cutlistData, customerName, projectName);
    
    // Prepare the request payload
    const payload = {
      recipient_type: 'individual',
      to: formatPhoneNumber(phoneNumber),
      type: 'text',
      text: {
        body: message
      }
    };
    
    // Send the message via WhatsApp API
    const response = await whatsappApi.post('/messages', payload);
    
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id || uuidv4(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending WhatsApp confirmation:', error);
    
    // If we're in development or testing, simulate a successful response
    if (process.env.NODE_ENV !== 'production' || !WHATSAPP_API_KEY) {
      console.log('Simulating WhatsApp message in development mode');
      console.log('Message would be sent to:', phoneNumber);
      console.log('Message content:', formatWhatsAppMessage(cutlistData, customerName, projectName));
      
      return {
        success: true,
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        simulated: true
      };
    }
    
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
const formatWhatsAppMessage = (data: CutlistData, customerName: string, projectName: string): string => {
  let message = `Hello ${customerName},\n\n`;
  message += `We've received your cutting list for project "${projectName}" and processed it. Please confirm if the following details are correct:\n\n`;
  
  // Add stock pieces
  message += `*Stock Pieces:*\n`;
  data.stockPieces.forEach((piece, index) => {
    message += `${index + 1}. ${piece.width} × ${piece.length} ${data.unit} (Quantity: ${piece.quantity})\n`;
  });
  
  message += `\n*Cut Pieces:*\n`;
  data.cutPieces.forEach((piece, index) => {
    const pieceName = piece.name ? `${piece.name}: ` : '';
    message += `${index + 1}. ${pieceName}${piece.width} × ${piece.length} ${data.unit} (Quantity: ${piece.quantity})\n`;
  });
  
  message += `\nTotal Stock Pieces: ${data.stockPieces.reduce((sum, p) => sum + p.quantity, 0)}\n`;
  message += `Total Cut Pieces: ${data.cutPieces.reduce((sum, p) => sum + p.quantity, 0)}\n\n`;
  
  message += `Please reply with "YES" to confirm or "NO" if any changes are needed.\n\n`;
  message += `Thank you,\nHDS Group Cutlist Team`;
  
  return message;
};

/**
 * Format a phone number to the international format required by WhatsApp API
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number starts with a country code
  if (!cleaned.startsWith('1') && !cleaned.startsWith('+')) {
    // Default to US country code if none is provided
    cleaned = '1' + cleaned;
  }
  
  // Ensure the number starts with a plus sign
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};
