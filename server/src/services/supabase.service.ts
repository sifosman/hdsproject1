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
   * Get product pricing by product code (legacy method)
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
   * Get product pricing by description from hds_prices table
   */
  async getProductPricingByDescription(description: string, includeSizes: boolean = false): Promise<{
    success: boolean;
    error?: string;
    data?: {
      description: string;
      price: number;
      sizes: string | null;
      unit: string;
    };
  }> {
    try {
      console.log(`Fetching product pricing for description: "${description}" from hds_prices table`);
      
      // Select columns based on whether dimensions are needed
      let selectColumns = 'description, price';
      if (includeSizes) {
        selectColumns = 'description, price, dimensions'; // Include dimensions column if requested
      }
      
      // Log the exact query we're about to run for debugging
      console.log(`Running exact match query on 'hds_prices' table for description: "${description}"`);
      console.log(`Select columns: ${selectColumns}`);
      
      // First try an exact match
      let { data, error } = await supabase
        .from('hds_prices')
        .select(selectColumns)
        .eq('description', description.trim());
        
      // If no match, try with explicit column ILIKE for an exact match (handles case insensitivity)
      if (!data || data.length === 0 || error) {
        console.log(`No exact match with .eq(), trying with .ilike() for exact match...`);
        ({ data, error } = await supabase
          .from('hds_prices')
          .select(selectColumns)
          .ilike('description', description.trim()));
      }
      
      // If no exact match or direct ILIKE match, try an exact phrase LIKE search
      if (!data || data.length === 0 || error) {
        console.log(`No exact or case-insensitive match, trying exact phrase with wildcards...`);
        
        // Surround with % to find the exact phrase anywhere in the description
        const exactPhrasePattern = `%${description.trim()}%`;
        
        ({ data, error } = await supabase
          .from('hds_prices')
          .select(selectColumns)
          .ilike('description', exactPhrasePattern)
          .order('description', { ascending: true }));
      }
      
      // If still no match, try a partial match using ILIKE with keywords
      if (!data || data.length === 0 || error) {
        console.log(`No exact phrase match found for "${description}", trying keyword partial match...`);
        const materialKeywords = description.split(' ');
        
        // Try to match the first two words which are usually the material type
        const searchPattern = `%${materialKeywords[0]}%${materialKeywords[1] || ''}%`;
        
        ({ data, error } = await supabase
          .from('hds_prices')
          .select(selectColumns)
          .ilike('description', searchPattern)
          .order('description', { ascending: true }));
      }
      
      if (error) {
        console.error(`Error fetching product details for pricing:`, error);
        return { success: false, error: error.message };
      }
      
      if (!data || data.length === 0) {
        return { success: false, error: `Product pricing not found for "${description}"` };
      }
      
      // Make sure data is an array to avoid TypeScript errors
      if (!data || !Array.isArray(data) || data.length === 0) {
        // If we got here with no results, try an even looser match
        console.log(`No results found for "${description}", trying looser match...`);
        
        // Try a looser match with just the first word
        const firstWord = description.split(' ')[0];
        const looseSearchPattern = `%${firstWord}%`;
        
        try {
          const looseResult = await supabase
            .from('hds_prices')
            .select(selectColumns)
            .ilike('description', looseSearchPattern)
            .order('description', { ascending: true });
            
          if (looseResult.error) {
            console.error('Error in loose search:', looseResult.error);
            return { success: false, error: `No matching product found for "${description}"` };
          }
          
          if (!looseResult.data || looseResult.data.length === 0) {
            return { success: false, error: `No matching product found for "${description}"` };
          }
          
          // Use the loose search results
          data = looseResult.data;
          console.log(`Found ${data.length} matches with loose search`);
        } catch (error) {
          console.error('Error in loose search:', error);
          return { success: false, error: `No matching product found for "${description}"` };
        }
      }

      // Safe to work with data as an array now
      // If multiple matches found, log them for debugging
      if (data.length > 1) {
        const descriptions = data.map((item: any) => {
          return typeof item?.description === 'string' ? item.description : '';
        });
        console.log(`Found ${data.length} potential matches:`, descriptions.join(', '));
      }
      
      // Use the first match
      const matchedProduct = data[0] as Record<string, any>;
      console.log(`Using product match: ${JSON.stringify(matchedProduct)}`);
      
      // Extract fields with proper type checking
      const productDescription = typeof matchedProduct?.description === 'string' ? matchedProduct.description : description;
      const productPrice = typeof matchedProduct?.price === 'number' ? matchedProduct.price : 0;
      const productDimensions = typeof matchedProduct?.dimensions === 'string' ? matchedProduct.dimensions : null;
      
      // Return the data with transformed field names
      return { 
        success: true, 
        data: {
          description: productDescription,
          price: productPrice,
          sizes: productDimensions, // We keep using 'sizes' as the field name in the returned object for compatibility
          unit: 'piece' // Default unit
        }
      };
      
      // If we get here, no matching product was found
      return { success: false, error: `No matching product found for "${description}"` }
    } catch (error: any) {
      console.error(`Error in getProductPricingByDescription for "${description}":`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new quote in the database
   * 
   * Table schema: 
   * - id (UUID, auto-generated)
   * - filename (text)
   * - created_at (timestamp, auto-generated)
   * - cutlist_id (text, foreign key)
   * - expires_at (timestamp, nullable)
   */
  async createQuote(quoteData: any): Promise<any> {
    try {
      console.log('Creating quote with data:', JSON.stringify({
        cutlistId: quoteData?.cutlistId || quoteData?.cutlist_id,
        hasFilename: !!quoteData?.filename,
      }));
      
      // Validate required fields
      if (!quoteData?.cutlistId && !quoteData?.cutlist_id) {
        console.error('Error creating quote: Missing cutlist_id');
        return { success: false, error: 'Missing cutlist_id' };
      }

      if (!quoteData?.filename) {
        console.error('Error creating quote: Missing filename');
        return { success: false, error: 'Missing filename' };
      }

      // Set expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      // Create quote object that matches the actual database schema
      const quote = {
        filename: quoteData.filename,
        cutlist_id: quoteData.cutlistId || quoteData.cutlist_id,
        expires_at: expiryDate.toISOString()
        // id and created_at are auto-generated by the database
      };
      
      console.log('Inserting quote with schema-compliant structure:', JSON.stringify(quote));

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
      // Specifically log the table name we're querying
      console.log('Fetching product descriptions from hds_prices table...');
      
      // First verify if the table exists
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_tables');
        
      if (tablesError) {
        console.error('Error checking tables:', tablesError);
      } else {
        console.log('Available tables in Supabase:', tablesData);
      }
      
      // Force use of hds_prices table
      const { data, error } = await supabase
        .from('hds_prices')
        .select('description')
        .order('description', { ascending: true });
      
      if (error) {
        console.error('Error fetching product descriptions:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.warn('No product descriptions found in hds_prices table');
        return { success: false, error: 'No product descriptions found' };
      }
      
      console.log(`Found ${data.length} product descriptions from database:`, data.map(item => item.description));
      
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
  },

  /**
   * Fetch quote by ID
   * @param quoteId The ID of the quote to fetch
   * @returns Promise with quote data
   */
  async fetchQuoteById(quoteId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_id', quoteId)
        .single();
      
      if (error) {
        console.error(`Error fetching quote with ID ${quoteId}:`, error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Quote not found' };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in fetchQuoteById for ${quoteId}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update the PDF URL for a quote
   * @param quoteId The ID of the quote to update
   * @param pdfUrl The new PDF URL
   * @returns Promise with updated quote data
   */
  async updateQuotePdfUrl(quoteId: string, pdfUrl: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
        .eq('quote_id', quoteId)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating PDF URL for quote ${quoteId}:`, error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in updateQuotePdfUrl for ${quoteId}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Upload a PDF buffer to the Supabase hdsquotes bucket
   * @param fileBuffer The PDF file buffer
   * @param fileName The name for the uploaded file
   * @returns Promise with the public URL or an error
   */
  async uploadQuotePdf(fileBuffer: Buffer, fileName: string): Promise<{ success: boolean; error?: string; publicUrl?: string }> {
    try {
      const { error: uploadError } = await supabase.storage
        .from('hdsquotes') // Assumes a bucket named 'quotes'
        .upload(fileName, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true, // Overwrite if file exists
        });

      if (uploadError) {
        console.error('Error uploading PDF to Supabase Storage:', uploadError);
        return { success: false, error: uploadError.message };
      }

      const { data: urlData } = supabase.storage
        .from('hdsquotes')
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        return { success: false, error: 'Could not retrieve public URL for PDF.' };
      }

      return { success: true, publicUrl: urlData.publicUrl };
    } catch (error: any) {
      console.error('Error in uploadQuotePdf:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get branch by trading_as value from branches table
   */
  getBranchByTradingAs: async (tradingAs: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('trading_as', tradingAs)
        .single();
      if (error) {
        console.error(`Error fetching branch with trading_as ${tradingAs}:`, error);
        return { success: false, error: error.message };
      }
      if (!data) {
        return { success: false, error: 'Branch not found' };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in getBranchByTradingAs for ${tradingAs}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get banking details by fx_branch (match to trading_as of selected branch)
   */
  async getBankingDetailsByBranch(fxBranch: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('banking_details')
        .select('*')
        .eq('fx_branch', fxBranch)
        .single();
      if (error) {
        console.error(`Error fetching banking details for fx_branch ${fxBranch}:`, error);
        return { success: false, error: error.message };
      }
      if (!data) {
        return { success: false, error: 'Banking details not found' };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in getBankingDetailsByBranch for ${fxBranch}:`, error);
      return { success: false, error: error.message };
    }
  },

};

export default SupabaseService;
