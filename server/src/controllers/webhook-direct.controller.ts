import { Request, Response } from 'express';
import axios from 'axios';

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
      
      // Send a very simple test payload
      const response = await axios.post(WEBHOOK_URL, {
        recipient: '+27822222222', // Use a test phone number
        message: 'Test message from Freecut API to Botsailor webhook',
        timestamp: new Date().toISOString()
      }, {
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
      
      console.log('Sending webhook with data:', {
        phoneNumber,
        cutlistUrl,
        dimensionsCount,
        senderName
      });
      
      // Try four different webhook payload formats
      try {
        // Format 1: Standard webhook format with recipient field
        const format1 = {
          recipient: phoneNumber,
          message: `Your cutting list is ready! View it here: ${cutlistUrl}`,
          customer_name: senderName,
          dimensions_count: dimensionsCount,
          url: cutlistUrl
        };
        
        console.log('Trying format 1...');
        const response1 = await axios.post(WEBHOOK_URL, format1, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log('Format 1 succeeded!', response1.status);
        return res.status(200).json({
          success: true,
          message: 'Webhook sent successfully using format 1',
          format: format1,
          response: {
            status: response1.status,
            data: response1.data
          }
        });
      } catch (error1) {
        console.log('Format 1 failed, trying format 2...');
        
        try {
          // Format 2: phone_number field instead of recipient
          const format2 = {
            phone_number: phoneNumber,
            message: `Your cutting list is ready! View it here: ${cutlistUrl}`,
            customer_name: senderName,
            dimensions_count: dimensionsCount,
            url: cutlistUrl
          };
          
          const response2 = await axios.post(WEBHOOK_URL, format2, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          console.log('Format 2 succeeded!', response2.status);
          return res.status(200).json({
            success: true,
            message: 'Webhook sent successfully using format 2',
            format: format2,
            response: {
              status: response2.status,
              data: response2.data
            }
          });
        } catch (error2) {
          console.log('Format 2 failed, trying format 3...');
          
          try {
            // Format 3: Using query parameters
            const params = new URLSearchParams({
              phone: phoneNumber.replace(/[^0-9]/g, ''),
              message: `Your cutting list is ready! View it here: ${cutlistUrl}`,
              name: senderName
            });
            
            const response3 = await axios.get(`${WEBHOOK_URL}?${params.toString()}`, {
              timeout: 10000
            });
            
            console.log('Format 3 succeeded!', response3.status);
            return res.status(200).json({
              success: true,
              message: 'Webhook sent successfully using format 3 (GET)',
              format: { url: `${WEBHOOK_URL}?${params.toString()}` },
              response: {
                status: response3.status,
                data: response3.data
              }
            });
          } catch (error3) {
            console.log('Format 3 failed, trying format 4...');
            
            try {
              // Format 4: Simplified JSON
              const format4 = {
                to: phoneNumber,
                body: `Your cutting list is ready! View it here: ${cutlistUrl}`,
                from: "Freecut"
              };
              
              const response4 = await axios.post(WEBHOOK_URL, format4, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
              });
              
              console.log('Format 4 succeeded!', response4.status);
              return res.status(200).json({
                success: true,
                message: 'Webhook sent successfully using format 4',
                format: format4,
                response: {
                  status: response4.status,
                  data: response4.data
                }
              });
            } catch (error4) {
              // All formats failed
              console.error('All webhook formats failed');
              
              return res.status(500).json({
                success: false,
                message: 'All webhook formats failed',
                errors: {
                  format1: (error1 as Error).message,
                  format2: (error2 as Error).message,
                  format3: (error3 as Error).message,
                  format4: (error4 as Error).message
                }
              });
            }
          }
        }
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
