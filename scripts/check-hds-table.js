const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './scripts/temp.env' });

console.log('Checking hds_prices table structure and data...');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHdsPricesTable() {
  try {
    console.log('Directly checking hds_prices table...');
    
    // Check if the hds_prices table exists and get its structure
    const { data: columns, error: columnsError } = await supabase
      .from('hds_prices')
      .select()
      .limit(1);
    
    if (columnsError) {
      console.error('Error accessing hds_prices table:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('hds_prices table structure:', Object.keys(columns[0]));
      
      // Now try to fetch all descriptions
      const { data: allData, error: allDataError } = await supabase
        .from('hds_prices')
        .select('*');
      
      if (allDataError) {
        console.error('Error fetching all data from hds_prices:', allDataError);
        return;
      }
      
      console.log(`Found ${allData.length} records in hds_prices table.`);
      
      if (allData.length > 0) {
        console.log('Sample data (first 3 records):', JSON.stringify(allData.slice(0, 3), null, 2));
        
        // Check if description column exists
        if (allData[0].hasOwnProperty('description')) {
          const descriptions = allData
            .map(item => item.description)
            .filter(Boolean); // Remove null/undefined values
          
          console.log(`Found ${descriptions.length} descriptions.`);
          
          if (descriptions.length > 0) {
            console.log('Sample descriptions:', descriptions.slice(0, 10));
            console.log('\nFormatted for hardcoding in TypeScript:');
            console.log(`export const PRODUCT_DESCRIPTIONS = ${JSON.stringify(descriptions, null, 2)};`);
          } else {
            console.log('All description values are null or empty.');
          }
        } else {
          console.log('No "description" column found in hds_prices table.');
          console.log('Available columns:', Object.keys(allData[0]));
        }
      }
    } else {
      console.log('hds_prices table exists but appears to be empty.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkHdsPricesTable();
