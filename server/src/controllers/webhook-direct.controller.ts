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
      
      // Try four different webhook payload formats
      try {
        // Format 1: WhatsApp API compliant format
        const format1 = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            body: quoteId ? 
              `Your cutting list and quote #${quoteId} are ready! View your cutting list here: ${cutlistUrl}` : 
              `Your cutting list is ready! View it here: ${cutlistUrl}`
          },
          metadata: {
            quote_id: quoteId || undefined,
            quote_url: quoteUrl || undefined,
            pricing_found: pricingData.length > 0
          }
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
          // Format 2: WhatsApp API compliant format with phone_number field
          const format2 = {
            messaging_product: 'whatsapp',
            to: phoneNumber, // WhatsApp API uses 'to' not 'phone_number'
            type: 'text',
            text: {
              body: quoteId ? 
                `Your cutting list and quote #${quoteId} are ready! View your cutting list here: ${cutlistUrl}` : 
                `Your cutting list is ready! View it here: ${cutlistUrl}`
            },
            // Additional metadata parameters can be included in URL parameters or headers
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
              message: quoteId ? 
                `Your cutting list and quote #${quoteId} are ready! View your cutting list here: ${cutlistUrl}` : 
                `Your cutting list is ready! View it here: ${cutlistUrl}`,
              name: senderName,
              quote_id: quoteId || '',
              quote_url: quoteUrl || '',
              pricing_found: pricingData.length > 0 ? 'true' : 'false'
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
              // Format 4: Fully simplified WhatsApp API compliant format
              const format4 = {
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: {
                  body: quoteId ? 
                    `Your cutting list and quote #${quoteId} are ready! View your cutting list here: ${cutlistUrl}` : 
                    `Your cutting list is ready! View it here: ${cutlistUrl}`
                },
                // Other fields in a separate request if needed
                // or passed as URL parameters instead
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
