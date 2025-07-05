import { Request, Response } from 'express';
import axios from 'axios';
import SupabaseService from '../services/supabase.service';

// Hard-coded webhook URL for direct testing
const WEBHOOK_URL = 'https://www.botsailor.com/webhook/whatsapp-workflow/145613.157394.183999.1748553417';

/**
 * A simplified controller that contains only what's needed to 
 * directly test webhook communication, without any OCR or database dependencies
 */
export const webhookDirectController = {
  /**
   * Test the webhook with a direct payload
   */
  async testWebhook(req: Request, res: Response) {
    try {
      console.log('==== WEBHOOK DIRECT TEST ====');
      console.log('Testing webhook with direct payload to URL:', WEBHOOK_URL);
      
      // Send the exact WhatsApp API format required by Botsailor
      const testPayload = {
        to: '+27822222222', // Use a test phone number with + prefix
        type: 'text',
        text: {
          body: 'Test message from Freecut API to Botsailor webhook'
        }
      };
      
      console.log('Sending test webhook with exact format:', testPayload);
      const response = await axios.post(WEBHOOK_URL, testPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('Webhook test response:', response.status, response.statusText);
      console.log('Response data:', response.data);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook test succeeded',
        response: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        }
      });
    } catch (error: any) {
      console.error('Webhook test error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Webhook test failed',
        error: error.message
      });
    }
  },
  
  /**
   * Process n8n data with a super simplified approach
   */
  async processN8n(req: Request, res: Response) {
    try {
      console.log('==== DIRECT N8N PROCESSING ====');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Parse data from n8n
      let ocrText, phoneNumber, senderName;
      
      // Try to parse the cutlist JSON
      if (req.body.cutlist) {
        try {
          const cutlistData = JSON.parse(req.body.cutlist);
          ocrText = cutlistData.ocrText;
          phoneNumber = cutlistData.phoneNumber;
          senderName = cutlistData.senderName;
          console.log('Successfully parsed cutlist JSON');
        } catch (e) {
          console.error('Error parsing cutlist JSON, using raw value');
          ocrText = req.body.cutlist;
          phoneNumber = req.body.phoneNumber || '+27822222222';
          senderName = req.body.senderName || 'Test User';
        }
      } else {
        ocrText = req.body.ocrText;
        phoneNumber = req.body.phoneNumber || '+27822222222';
        senderName = req.body.senderName || 'Test User';
      }
      
      // Sanitize phone number
      if (phoneNumber) {
        // Remove any trailing newline characters
        phoneNumber = phoneNumber.replace(/\r?\n/g, '');
        
        // Ensure phone number starts with + for international format
        if (!phoneNumber.startsWith('+')) {
          phoneNumber = '+' + phoneNumber;
        }
        
        // Trim any whitespace
        phoneNumber = phoneNumber.trim();
        
        console.log(`Sanitized phone number: ${phoneNumber}`);
      }
      
      // Use a test phone number if the one provided is a placeholder
      if (phoneNumber === 'your_phone_number') {
        phoneNumber = '+27822222222';
      }
      
      // Generate a unique ID for this cutlist
      const uniqueId = new Date().getTime().toString();
      const baseUrl = process.env.BASE_URL || 'https://hds-sifosmans-projects.vercel.app';
      
      // Use the cutlist-edit URL with the unique ID
      const cutlistUrl = `${baseUrl}/cutlist-edit/${uniqueId}`;
      
      // Simple way to extract dimensions count
      const dimensionsCount = ocrText ? 
        ocrText.split('\n').filter((line: string) => /\d+\s*[xX]\s*\d+/.test(line)).length : 0;
      
      // Extract potential product codes from OCR text
      // This is a simplified example - in production you'd need proper parsing based on your specific format
      const productCodesRegex = /(?:product|item)\s*(?:code|id)?[:\s]*(\w+)/gi;
      const productCodes: string[] = [];
      let match;
      
      while ((match = productCodesRegex.exec(ocrText)) !== null) {
        productCodes.push(match[1]);
      }
      
      // If no product codes found from regex, use some default test codes
      if (productCodes.length === 0) {
        // Add some sample product codes for testing
        productCodes.push('BOARD001');
        productCodes.push('EDGE002');
      }
      
      console.log('Extracted product codes:', productCodes);
      
      // Attempt to get pricing from Supabase
      let pricingData = [];
      let quoteUrl = '';
      let quoteId = '';
      
      try {
        // Get pricing for each product code
        for (const code of productCodes) {
          try {
            const pricing = await SupabaseService.getProductPricing(code);
            if (pricing && pricing.success) {
              pricingData.push({
                productCode: code,
                price: pricing.data, // This would need parsing based on the actual response structure
              });
            }
          } catch (pricingError) {
            console.error(`Error getting pricing for product ${code}:`, pricingError);
          }
        }
        
        // If pricing data was successfully retrieved, create a quote
        if (pricingData.length > 0) {
          try {
            // Sample quote creation - in production, you'd construct this from the actual data
            const quoteData = {
              customerName: senderName,
              customerEmail: req.body.email || 'customer@example.com',
              customerTelephone: phoneNumber,
              cutlistUrl: cutlistUrl,
              items: pricingData.map(item => ({
                stockCode: item.price.productCode,
                description: item.price.description || `Product ${item.productCode}`,
                quantity: 1,
                priceExclusive: item.price?.price || 100, // Default price if not found
                lineTotal: item.price?.price || 100,
              })),
              total: pricingData.reduce((sum, item) => sum + (item.price?.price || 100), 0),
            };
            
            const quoteResult = await SupabaseService.createQuote(quoteData);
            if (quoteResult && quoteResult.success) {
              quoteId = quoteResult.data?.quoteNumber || 'Q' + uniqueId;
              quoteUrl = `${baseUrl}/quote/${quoteId}`;
              console.log('Quote created successfully:', quoteId);
            }
          } catch (quoteError) {
            console.error('Error creating quote:', quoteError);
          }
        }
      } catch (supabaseError) {
        console.error('Error interacting with Supabase:', supabaseError);
      }
      
      console.log('Sending webhook with data:', {
        phoneNumber,
        cutlistUrl,
        dimensionsCount,
        senderName,
        pricingFound: pricingData.length > 0,
        quoteCreated: !!quoteId
      });
      
      // Use only the exact WhatsApp API format required by Botsailor
      try {
        // Create the message body
        const messageBody = quoteId ? 
          `Your cutting list and quote #${quoteId} are ready! View your cutting list here: ${cutlistUrl}` : 
          `Your cutting list is ready! View it here: ${cutlistUrl}`;
        
        // Exact format as specified by WhatsApp API
        const payload = {
          to: phoneNumber,
          type: 'text',
          text: {
            body: messageBody
          }
        };
        
        console.log('WEBHOOK DEBUG: Sending with exact WhatsApp API format:', payload);
        
        const response = await axios.post(WEBHOOK_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log('Webhook sent successfully:', response.status);
        return res.status(200).json({
          success: true,
          message: 'Webhook sent successfully',
          payload: payload,
          response: {
            status: response.status,
            data: response.data
          },
          additionalData: {
            quoteId: quoteId || null,
            quoteUrl: quoteUrl || null,
            customerName: senderName,
            dimensionsCount: dimensionsCount,
            pricingFound: pricingData.length > 0
          }
        });
      } catch (error: any) {
        console.error('Webhook sending failed:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Webhook sending failed',
          error: error.message,
          errorResponse: error.response?.data
        });
      }
    } catch (error: any) {
      console.error('Error processing n8n data:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Error processing n8n data',
        error: error.message
      });
    }
  }
};
