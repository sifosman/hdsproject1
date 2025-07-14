const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './scripts/temp.env' });

console.log('Extracting descriptions from hds_prices table...');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDescriptions() {
  try {
    // Try a direct query to see what's in the table
    console.log('Running direct query on hds_prices table...');
    
    // First check if the table has any records at all
    const { count, error: countError } = await supabase
      .from('hds_prices')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting records:', countError);
      return;
    }
    
    console.log(`hds_prices table has ${count} records`);
    
    if (count === 0) {
      console.log('Table is empty. No descriptions to extract.');
      return;
    }
    
    // Get column information by fetching one row
    const { data: sampleRow, error: sampleError } = await supabase
      .from('hds_prices')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample row:', sampleError);
      return;
    }
    
    if (!sampleRow || sampleRow.length === 0) {
      console.log('Could not fetch sample row. Table might be empty.');
      return;
    }
    
    console.log('Table columns:', Object.keys(sampleRow[0]));
    
    // Try all possible name variations for the description column
    const possibleColumns = ['description', 'name', 'product_name', 'title', 'material', 'material_name'];
    let descriptionColumn = null;
    
    for (const col of possibleColumns) {
      if (sampleRow[0].hasOwnProperty(col)) {
        descriptionColumn = col;
        console.log(`Found possible description column: "${col}"`);
        break;
      }
    }
    
    if (!descriptionColumn) {
      console.log('Could not find any suitable description column. Available columns:', 
        Object.keys(sampleRow[0]));
      return;
    }
    
    // Get all descriptions
    const { data, error } = await supabase
      .from('hds_prices')
      .select(descriptionColumn)
      .order(descriptionColumn, { ascending: true });
    
    if (error) {
      console.error(`Error fetching ${descriptionColumn} column:`, error);
      return;
    }
    
    const descriptions = data
      .map(item => item[descriptionColumn])
      .filter(Boolean); // Remove null/undefined values
    
    console.log(`Found ${descriptions.length} descriptions in "${descriptionColumn}" column:`);
    console.log(descriptions);
    
    if (descriptions.length > 0) {
      console.log('\nFormatted for hardcoding in TypeScript:');
      console.log(`export const PRODUCT_DESCRIPTIONS = ${JSON.stringify(descriptions, null, 2)};`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

getDescriptions();
