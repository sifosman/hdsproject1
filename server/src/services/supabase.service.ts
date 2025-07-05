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
  }
};

export default SupabaseService;
