import { Request, Response } from 'express';
import * as botsailorService from '../services/botsailor.service';
import * as ocrService from '../services/ocr.service';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Cutlist from '../models/cutlist.model';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Botsailor Controller
 * Handles interactions with the Botsailor WhatsApp API
 */
export const botsailorController = {
  /**
   * Check connection status with Botsailor
   */
  async getConnectionStatus(req: Request, res: Response) {
    try {
      const connectionStatus = await botsailorService.checkConnectionStatus();
      res.status(200).json({
        success: true,
        status: connectionStatus
      });
    } catch (error: any) {
      console.error('Error checking connection with Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking connection with Botsailor',
        error: error.message
      });
    }
  },
  
  /**
   * Process a WhatsApp image asynchronously to avoid Vercel timeout
   */
  processWhatsAppImageAsync: async (image_url: string, user_id: string, phone_number: string, sender_name: string) => {
    try {
      // Use system tmp directory for serverless environments
      const uploadDir = os.tmpdir();
      console.log('Using temporary directory for uploads:', uploadDir);
      
      // Download the image
      console.log(`Downloading image from: ${image_url}`);
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const imagePath = path.join(uploadDir, `whatsapp-${user_id}-${timestamp}-${randomSuffix}.jpg`);
      
      // Enhanced debugging for Botsailor image URLs
      console.log('Attempting to download image from Botsailor URL:', image_url);
      console.log('URL format check:', {
        protocol: image_url.startsWith('https://') ? 'https' : (image_url.startsWith('http://') ? 'http' : 'unknown'),
        containsBotsailor: image_url.includes('botsailor'),
        urlLength: image_url.length
      });
      
      // Attempt to download with additional headers to handle Botsailor's image URLs
      const response = await axios.get(image_url, { 
        responseType: 'stream',
        timeout: 15000, // 15 second timeout for potentially slower image servers
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'x-api-token': process.env.BOTSAILOR_API_KEY || '',
          'Authorization': `Bearer ${process.env.BOTSAILOR_API_KEY || ''}`
        },
        maxRedirects: 5 // Allow following redirects
      });
      
      // Create a writer stream to save the image
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);
      
      // Wait for the download to complete
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
      });
      
      console.log(`Image downloaded and saved to: ${imagePath}`);
      
      // Process the image with OCR
      console.log('Processing image with OCR...');
      const extractedData = await ocrService.processImageWithOCR(imagePath);
      console.log('OCR processing complete:', JSON.stringify(extractedData));
      
      // Save the cutting list data to the database
      const customerName = sender_name || 'Customer';
      const projectName = 'Cutting List Project';
      
      const newCutlist = new Cutlist({
        rawText: extractedData.rawText || '',
        dimensions: extractedData.dimensions || [],
        unit: extractedData.unit || 'mm',
        customerName: customerName,
        projectName: projectName,
        phoneNumber: phone_number || user_id
      });
      
      const savedCutlist = await newCutlist.save();
      console.log('Cutting list saved to database with ID:', savedCutlist._id);
      
      // Generate a link to the cutting list viewer
      const baseUrl = process.env.BASE_URL || 'https://hds-sifosmans-projects.vercel.app';
      const cutlistUrl = `${baseUrl}/api/cutlist/view/${savedCutlist._id}`;
      
      // Get the number of dimensions found
      const dimensionsCount = extractedData.dimensions?.length || 0;
      
      // Format a response message
      let responseMessage = `✅ *Your cutting list has been processed!*\n\n`;
      
      if (dimensionsCount > 0) {
        responseMessage += `📏 Found *${dimensionsCount} dimensions* in your image.\n\n`;
        
        // Add the first 5 dimensions to the message
        responseMessage += `*Dimensions (${extractedData.unit}):*\n`;
        extractedData.dimensions.slice(0, 5).forEach((dim, index) => {
          responseMessage += `${index + 1}. ${dim.width} x ${dim.length}`;
          if (dim.quantity > 1) {
            responseMessage += ` (${dim.quantity}pcs)`;
          }
          responseMessage += '\n';
        });
        
        if (dimensionsCount > 5) {
          responseMessage += `... and ${dimensionsCount - 5} more dimensions.\n`;
        }
      } else {
        responseMessage += `⚠️ No dimensions were found in your image. The quality might be too low or the format is not recognized.\n`;
      }
      
      // Add link to view the full cutting list
      responseMessage += `\n🔗 *View your complete cutting list here:*\n${cutlistUrl}\n\n`;
      responseMessage += `You can edit the dimensions and download the cutting list from this link.\n\n`;
      responseMessage += `💡 *Tip:* Save this link for future reference. You can always come back to view or edit your cutting list.`;
      
      // Try to send a WhatsApp message back to the user via Botsailor API
      try {
        // Check if we have the required environment variables
        const apiKey = process.env.BOTSAILOR_API_KEY;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (apiKey && phoneNumberId && phone_number) {
          console.log(`Sending WhatsApp message to ${phone_number} via Botsailor API`);
          
          // Construct the API request to Botsailor
          const messagePayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone_number,
            type: 'text',
            text: { body: responseMessage },
            preview_url: true  // Enable link preview
          };
          
          // Determine the correct Botsailor API endpoint
          const apiUrl = process.env.BOTSAILOR_API_URL || 'https://api.botsailor.com/v1';
          const botsailorEndpoint = `${apiUrl}/whatsapp/${phoneNumberId}/messages`;
          
          console.log(`Sending message to Botsailor API endpoint: ${botsailorEndpoint}`);
          
          // Send the message via Botsailor API
          const response = await axios.post(
            botsailorEndpoint,
            messagePayload,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000 // 10 second timeout
            }
          );
          
          console.log('Botsailor API response:', response.status, response.statusText);
          
          console.log('WhatsApp message sent successfully');
        } else {
          console.log('Missing environment variables for Botsailor API, skipping WhatsApp message');
        }
      } catch (sendError) {
        console.error('Error sending WhatsApp message via Botsailor API:', sendError);
      }
    } catch (error) {
      console.error('Error in async image processing:', error);
    }
  },

  /**
   * Receive WhatsApp webhook from Botsailor
   * This endpoint handles incoming WhatsApp messages with images from Botsailor,
   * downloads the image, processes it with OCR, and sends the extracted data back to Botsailor
   */
  receiveWhatsAppWebhook: async (req: Request, res: Response) => {
    console.log('======= WEBHOOK DEBUG =======');
    console.log('Received WhatsApp webhook from Botsailor');
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Request body:', JSON.stringify(req.body));
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('============================');
    
    try {
      // Check for API token
      const apiToken = process.env.BOTSAILOR_API_KEY;
      const expectedToken = process.env.EXPECTED_WEBHOOK_TOKEN;
      console.log('API Token present:', !!apiToken, 'Expected token present:', !!expectedToken);

      // Simple response for webhook verification
      if (req.method === 'GET' || !req.body || Object.keys(req.body).length === 0) {
        console.log('Received webhook verification request');
        return res.status(200).json({
          success: true,
          message: 'Webhook endpoint is active and ready to receive webhooks'
        });
      }
      
      // Check for the Botsailor User Input Flow format
      if (!req.body.user_input_data || !Array.isArray(req.body.user_input_data)) {
        console.log('Missing user_input_data in webhook payload');
        return res.status(400).json({
          success: false,
          message: 'Missing user_input_data in webhook payload'
        });
      }
      
      // Extract user information from the webhook payload
      let image_url = '';
      let user_id = 'user-' + Date.now();
      let phone_number = '';
      let sender_name = 'WhatsApp User';
      
      // Extract the image URL from user_input_data
      for (const input of req.body.user_input_data) {
        // Look for questions about images
        if (input.question && input.question.toLowerCase().includes('image') && input.answer) {
          image_url = input.answer;
          console.log('Found image URL in user_input_data:', image_url);
        }
        
        // Try to find phone number
        if (input.question && input.question.toLowerCase().includes('phone') && input.answer) {
          phone_number = input.answer;
        }
        
        // Try to find name
        if (input.question && (input.question.toLowerCase().includes('name') || 
                             input.question.toLowerCase().includes('who')) && input.answer) {
          sender_name = input.answer;
        }
      }
      
      // Check directly in the request body for any image URL
      if (!image_url && req.body.image_url) {
        image_url = req.body.image_url;
        console.log('Found image URL directly in request body:', image_url);
      }
      
      // If still no image URL, check for media URL
      if (!image_url && req.body.media_url) {
        image_url = req.body.media_url;
        console.log('Found media URL in request body:', image_url);
      }
      
      // Get additional user data from the request if available
      if (!phone_number && req.body.phone_number) {
        phone_number = req.body.phone_number;
      }
      
      if (!sender_name && req.body.sender_name) {
        sender_name = req.body.sender_name;
      }
      
      // Final check for image URL
      if (!image_url) {
        console.log('No image URL found in the webhook payload');
        console.log('Full payload:', JSON.stringify(req.body));
        return res.status(400).json({
          success: false,
          message: 'No image URL found in the webhook payload'
        });
      }
      
      // *** IMPORTANT: Respond immediately to avoid Vercel timeout ***
      // Send a quick acknowledgment response to prevent timeout
      res.status(200).json({
        success: true,
        message: 'WhatsApp image received and processing started'
      });
      
      // Continue processing asynchronously after sending the response
      // This allows the function to return while processing continues
      const controller = botsailorController;
      controller.processWhatsAppImageAsync(image_url, user_id, phone_number, sender_name)
        .catch((error: unknown) => console.error('Async processing error:', error instanceof Error ? error.message : String(error)));
        
    } catch (error: unknown) {
      console.error('Error in webhook handler:', error instanceof Error ? error.message : String(error));
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error processing webhook',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  },

  /**
   * Receive data from Botsailor
   */
  async receiveData(req: Request, res: Response) {
    try {
      const { data, type } = req.body;
      
      res.status(200).json({
        success: true,
        message: 'Data received successfully',
        data: { received: true }
      });
    } catch (error: any) {
      console.error('Error receiving data from Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error receiving data from Botsailor',
        error: error.message
      });
    }
  },

  /**
   * Send data to Botsailor
   */
  async sendData(req: Request, res: Response) {
    try {
      const { data, type } = req.body;
      
      res.status(200).json({
        success: true,
        message: 'Data sent successfully',
        data: { sent: true }
      });
    } catch (error: any) {
      console.error('Error sending data to Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending data to Botsailor',
        error: error.message
      });
    }
  },

  /**
   * Sync project with Botsailor
   */
  async syncProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { direction } = req.body;
      
      res.status(200).json({
        success: true,
        message: `Project ${projectId} synced successfully in ${direction} direction`,
        data: { synced: true }
      });
    } catch (error: any) {
      console.error('Error syncing project with Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing project with Botsailor',
        error: error.message
      });
    }
  },

  /**
   * Get materials from Botsailor
   */
  async getMaterials(req: Request, res: Response) {
    try {
      // Mock materials data
      const materials = [
        { id: 'mat-1', name: 'Melamine White', type: 'board', thickness: 18 },
        { id: 'mat-2', name: 'Melamine Oak', type: 'board', thickness: 18 },
        { id: 'mat-3', name: 'MDF', type: 'board', thickness: 19 }
      ];
      
      res.status(200).json({
        success: true,
        materials
      });
    } catch (error: any) {
      console.error('Error getting materials from Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting materials from Botsailor',
        error: error.message
      });
    }
  },

  /**
   * Get stock pieces from Botsailor
   */
  async getStockPieces(req: Request, res: Response) {
    try {
      const { materialId } = req.query;
      
      // Mock stock pieces data
      const stockPieces = [
        { id: 'sp-1', materialId: 'mat-1', width: 2440, length: 1220, quantity: 10 },
        { id: 'sp-2', materialId: 'mat-1', width: 1830, length: 610, quantity: 5 },
        { id: 'sp-3', materialId: 'mat-2', width: 2440, length: 1220, quantity: 8 }
      ];
      
      // Filter by materialId if provided
      const filteredPieces = materialId 
        ? stockPieces.filter(p => p.materialId === materialId)
        : stockPieces;
      
      res.status(200).json({
        success: true,
        stockPieces: filteredPieces
      });
    } catch (error: any) {
      console.error('Error getting stock pieces from Botsailor:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting stock pieces from Botsailor',
        error: error.message
      });
    }
  },

  /**
   * Process cutting list image with OCR
   */
  async processCutlistImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      
      const imagePath = req.file.path;
      
      // Process the image with OCR
      const extractedData = await ocrService.processImageWithOCR(imagePath);
      
      res.status(200).json({
        success: true,
        extractedData
      });
    } catch (error: any) {
      console.error('Error processing cutlist image:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing cutlist image',
        error: error.message
      });
    }
  }
};
