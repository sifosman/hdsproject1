const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// API base URL - change this to match your server
// Since we're running from the server folder, we'll use localhost
const API_URL = 'http://localhost:5000/api';

// Log the full URL we're going to use
console.log(`API URL: ${API_URL}/ocr/process-image`);

// Path to the cutlist image - adjust path to point to the root directory
const imagePath = path.join(__dirname, '../cutlist.jpg');

// Test OCR processing
async function testOCRProcessing() {
  console.log('=== Testing OCR Processing ===');
  
  try {
    // Check if the image exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Image not found at: ${imagePath}`);
      return;
    }
    
    console.log(`Using image: ${imagePath}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('customerName', 'Test Customer');
    formData.append('projectName', 'Test Project');
    
    // Set headers
    const headers = {
      ...formData.getHeaders(),
    };
    
    console.log('Sending image to OCR endpoint...');
    
    // Send the request
    const response = await axios.post(`${API_URL}/ocr/process-image`, formData, { headers });
    
    // Check the response
    if (response.status === 200 && response.data.success) {
      console.log('OCR processing successful!');
      console.log('\nExtracted Raw Text:');
      console.log('-------------------');
      console.log(response.data.rawText);
      
      console.log('\nExtracted Dimensions:');
      console.log('--------------------');
      
      // Display stock pieces
      console.log('\nStock Pieces:');
      response.data.data.stockPieces.forEach((piece, index) => {
        console.log(`${index + 1}. ${piece.width} × ${piece.length} ${response.data.data.unit} (Quantity: ${piece.quantity})`);
      });
      
      // Display cut pieces
      console.log('\nCut Pieces:');
      response.data.data.cutPieces.forEach((piece, index) => {
        console.log(`${index + 1}. ${piece.name || ''}: ${piece.width} × ${piece.length} ${response.data.data.unit} (Quantity: ${piece.quantity})`);
      });
      
      // Display materials
      console.log('\nMaterials:');
      response.data.data.materials.forEach((material, index) => {
        console.log(`${index + 1}. ${material.name} (${material.type}, ${material.thickness}mm)`);
      });
      
      // Display summary
      console.log('\nSummary:');
      console.log(`Total Stock Pieces: ${response.data.data.stockPieces.reduce((sum, p) => sum + p.quantity, 0)}`);
      console.log(`Total Cut Pieces: ${response.data.data.cutPieces.reduce((sum, p) => sum + p.quantity, 0)}`);
      
      // Save the extracted data to a file for reference
      fs.writeFileSync(path.join(__dirname, 'ocr-results.json'), JSON.stringify(response.data, null, 2));
      console.log('\nResults saved to ocr-results.json');
    } else {
      console.error('OCR processing failed:', response.data.message);
    }
  } catch (error) {
    console.error('Error testing OCR processing:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. This could mean:');
      console.error('1. The server is not running');
      console.error('2. The server is running but not accessible at the specified URL');
      console.error('3. The server is running but the endpoint does not exist');
      console.error('4. The request timed out');
      console.error('\nRequest details:', error.request._currentUrl);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('\nFull error:', error);
  }
}

// Run the test
testOCRProcessing();
