import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase service for database operations
 */
const SupabaseService = {
  /**
   * Test connection to Supabase
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase connection error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking Supabase connection:', error);
      return false;
    }
  },

  /**
   * Get product details by product code
   */
  async getProductDetails(productCode: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', productCode)
        .single();
      
      if (error) {
        console.error(`Error fetching product details for ${productCode}:`, error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Product not found' };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in getProductDetails for ${productCode}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get product pricing by product code
   */
  async getProductPricing(productCode: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('product_code, description, price, unit')
        .eq('product_code', productCode)
        .single();
      
      if (error) {
        console.error(`Error fetching product pricing for ${productCode}:`, error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Product pricing not found' };
      }
      
      return { 
        success: true, 
        data: {
          productCode: data.product_code,
          description: data.description,
          price: data.price,
          unit: data.unit
        }
      };
    } catch (error: any) {
      console.error(`Error in getProductPricing for ${productCode}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new quote in the database
   */
  async createQuote(quoteData: any): Promise<any> {
    try {
      // Generate a quote number (format: Q-YYYYMMDD-XXXX)
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      const quoteNumber = `Q-${datePart}-${randomPart}`;

      // Prepare quote object
      const quote = {
        quote_number: quoteNumber,
        customer_name: quoteData.customerName,
        customer_phone: quoteData.customerTelephone,
        customer_email: quoteData.customerEmail || null,
        items: quoteData.items,
        subtotal: quoteData.items.reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0),
        tax: quoteData.tax || 0,
        total: quoteData.total,
        status: 'sent',
        cutlist_url: quoteData.cutlistUrl,
        created_at: new Date().toISOString(),
        expiry_date: new Date(today.setDate(today.getDate() + 30)).toISOString() // 30 days validity
      };

      // Insert quote into database
      const { data, error } = await supabase
        .from('quotes')
        .insert([quote])
        .select()
        .single();

      if (error) {
        console.error('Error creating quote:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          quoteNumber: data.quote_number,
          quoteId: data.id,
          createdAt: data.created_at
        }
      };
    } catch (error: any) {
      console.error('Error in createQuote:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update quote status
   */
  async updateQuoteStatus(quoteNumber: string, status: 'sent' | 'pending' | 'approved' | 'rejected'): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('quote_number', quoteNumber)
        .select()
        .single();

      if (error) {
        console.error(`Error updating quote status for ${quoteNumber}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in updateQuoteStatus for ${quoteNumber}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new invoice from a quote
   */
  async createInvoice(quoteNumber: string, paymentDetails: any): Promise<any> {
    try {
      // First, get the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_number', quoteNumber)
        .single();

      if (quoteError || !quote) {
        console.error(`Error fetching quote ${quoteNumber}:`, quoteError);
        return { success: false, error: quoteError?.message || 'Quote not found' };
      }

      // Generate invoice number (format: INV-YYYYMMDD-XXXX)
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      const invoiceNumber = `INV-${datePart}-${randomPart}`;

      // Prepare invoice object
      const invoice = {
        invoice_number: invoiceNumber,
        quote_id: quote.id,
        quote_number: quote.quote_number,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        customer_email: quote.customer_email,
        items: quote.items,
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        payment_method: paymentDetails.method || 'Credit Card',
        payment_reference: paymentDetails.reference || `Ref-${Date.now()}`,
        payment_date: paymentDetails.date || new Date().toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
        due_date: new Date(today.setDate(today.getDate() + 14)).toISOString() // 14 days to pay
      };

      // Insert invoice into database
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        return { success: false, error: error.message };
      }

      // Update quote status to 'approved'
      await SupabaseService.updateQuoteStatus(quoteNumber, 'approved');

      return { 
        success: true, 
        data: {
          invoiceNumber: data.invoice_number,
          invoiceId: data.id,
          createdAt: data.created_at
        }
      };
    } catch (error: any) {
      console.error('Error in createInvoice:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceNumber: string, status: 'pending' | 'paid' | 'overdue' | 'cancelled'): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('invoice_number', invoiceNumber)
        .select()
        .single();

      if (error) {
        console.error(`Error updating invoice status for ${invoiceNumber}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in updateInvoiceStatus for ${invoiceNumber}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch material options for cascading dropdowns from the hds_prices table
   */
  async getMaterialOptions(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('hds_prices')
        .select('description, price')
        .order('description', { ascending: true });
      
      if (error) {
        console.error('Error fetching material options:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No material options found' };
      }
      
      return { 
        success: true, 
        data: data
      };
    } catch (error: any) {
      console.error('Error in getMaterialOptions:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all product descriptions
   */
  async getProductDescriptions(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('hds_prices')
        .select('description')
        .order('description', { ascending: true });
      
      if (error) {
        console.error('Error fetching product descriptions:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No product descriptions found' };
      }
      
      return { 
        success: true, 
        data: data
      };
    } catch (error: any) {
      console.error('Error in getProductDescriptions:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save cutlist data to the cutlists table
   */
  async saveCutlist(cutlistData: any): Promise<any> {
    try {
      // Ensure the cutlist data has all required fields
      const cutlist = {
        id: cutlistData.id,
        customer_name: cutlistData.customerName || null,
        project_name: cutlistData.projectName || null,
        phone_number: cutlistData.phoneNumber || null,
        unit: cutlistData.unit || 'mm',
        ocr_text: cutlistData.ocrText || null,
        cut_pieces: cutlistData.cutPieces || [],
        stock_pieces: cutlistData.stockPieces || [],
        materials: cutlistData.materials || [],
        is_confirmed: cutlistData.isConfirmed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert cutlist into database
      const { data, error } = await supabase
        .from('cutlists')
        .insert([cutlist])
        .select()
        .single();

      if (error) {
        console.error('Error saving cutlist:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          id: data.id,
          customerName: data.customer_name,
          createdAt: data.created_at
        }
      };
    } catch (error: any) {
      console.error('Error in saveCutlist:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get cutlist data by ID from the cutlists table
   */
  async getCutlistById(cutlistId: string): Promise<any> {
    try {
      console.log(`Fetching cutlist with ID ${cutlistId} from Supabase`);
      
      const { data, error } = await supabase
        .from('cutlists')
        .select('*')
        .eq('id', cutlistId)
        .single();
      
      if (error) {
        console.error(`Error fetching cutlist with ID ${cutlistId}:`, error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        console.log(`Cutlist with ID ${cutlistId} not found in Supabase`);
        return { success: false, error: 'Cutlist not found' };
      }
      
      // Transform the data to match the expected format for the frontend
      const transformedData = {
        _id: data.id,
        cutPieces: data.cut_pieces || [],
        stockPieces: data.stock_pieces || [],
        materials: data.materials || [],
        unit: data.unit || 'mm',
        customerName: data.customer_name || '',
        projectName: data.project_name || '',
        phoneNumber: data.phone_number || '',
        ocrText: data.ocr_text || '',
        isConfirmed: data.is_confirmed || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      console.log(`Cutlist found in Supabase:`, transformedData);
      
      return { success: true, data: transformedData };
    } catch (error: any) {
      console.error(`Error in getCutlistById for ${cutlistId}:`, error);
      return { success: false, error: error.message };
    }
  }
};

export default SupabaseService;
