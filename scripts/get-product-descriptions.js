const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './scripts/temp.env' });

console.log('Script starting with comprehensive database diagnostics...');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseKey.substring(0, 10)}...`); // Only show part of the key for security

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAndGetProductDescriptions() {
  try {
    // Test basic connection
    console.log('\n1. Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase.rpc('version');
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
    } else {
      console.log('Connection successful');
      if (connectionTest) console.log('Supabase version:', connectionTest);
    }

    // List all tables using direct SQL (more reliable than pg_tables approach)
    console.log('\n2. Attempting to list all tables using SQL...');
    const { data: tableList, error: tableListError } = await supabase.rpc('list_tables');
    
    if (tableListError) {
      console.error('Error listing tables via RPC:', tableListError);
      
      // Fallback to direct SQL query if RPC fails
      const { data: directSql, error: directSqlError } = await supabase
        .from('_content_tables')
        .select('name');
      
      if (directSqlError) {
        console.error('Error with fallback table list:', directSqlError);
      } else if (directSql) {
        console.log('Tables found via fallback method:', directSql.map(t => t.name));
      }
    } else if (tableList) {
      console.log('Tables found:', tableList);
    }
    
    // Try multiple table names that might contain product descriptions
    const tablesToCheck = ['hds_prices', 'products', 'product', 'materials', 'inventory', 'items'];
    
    for (const tableName of tablesToCheck) {
      console.log(`\n3. Checking table '${tableName}'...`);
      
      // First check if the table exists and what columns it has
      const { data: columns, error: columnsError } = await supabase
        .from(tableName)
        .select()
        .limit(1);
      
      if (columnsError) {
        if (columnsError.code === '42P01') { // Table doesn't exist error
          console.log(`Table '${tableName}' doesn't exist`); 
        } else {
          console.error(`Error checking '${tableName}':`, columnsError);
        }
        continue; // Try next table
      }
      
      if (columns && columns.length > 0) {
        console.log(`Table '${tableName}' exists with columns:`, Object.keys(columns[0]));
        
        // Check if it has a description column
        const columnNames = Object.keys(columns[0]);
        const descriptionColumnName = columnNames.find(col => 
          col.toLowerCase() === 'description' || 
          col.toLowerCase() === 'name' || 
          col.toLowerCase() === 'product_name' || 
          col.toLowerCase() === 'title' ||
          col.toLowerCase() === 'material_name'
        );
        
        if (descriptionColumnName) {
          console.log(`Found possible description column: '${descriptionColumnName}'`);
          
          // Get all values from this column
          const { data: values, error: valuesError } = await supabase
            .from(tableName)
            .select(descriptionColumnName)
            .order(descriptionColumnName, { ascending: true });
          
          if (valuesError) {
            console.error(`Error getting values from '${tableName}.${descriptionColumnName}':`, valuesError);
          } else if (values && values.length > 0) {
            const descriptions = values.map(item => item[descriptionColumnName]).filter(Boolean);
            console.log(`Found ${descriptions.length} descriptions in '${tableName}.${descriptionColumnName}':`);
            console.log(JSON.stringify(descriptions, null, 2));
            
            // Format for hardcoding in TypeScript
            console.log('\nFormatted for hardcoding in TypeScript:');
            console.log(`export const PRODUCT_DESCRIPTIONS = ${JSON.stringify(descriptions, null, 2)};`);
            
            if (descriptions.length > 0) {
              // We found what we need, return to avoid checking other tables
              return;
            }
          } else {
            console.log(`No values found in '${tableName}.${descriptionColumnName}'`);
          }
        } else {
          console.log(`No suitable description column found in table '${tableName}'`);
        }
      } else {
        console.log(`Table '${tableName}' exists but appears to be empty`);
      }
    }
    
    // If we got here, we didn't find any product descriptions
    console.log('\n4. No product descriptions found in any of the checked tables.');
    console.log('Continuing with the hardcoded product descriptions in the frontend.');
    
  } catch (error) {
    console.error('Unexpected error during database diagnosis:', error);
  }
}

diagnoseAndGetProductDescriptions();
