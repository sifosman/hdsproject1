/**
 * Test script for OCR processing with a local image file
 * 
 * This script sends a local image to your OCR endpoint and displays the results
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// API base URL - using local server for testing
const API_URL = 'http://localhost:3000/api';
// If you want to test with your production URL (requires authentication):
// const API_URL = 'https://hds-jg088er3c-sifosmans-projects.vercel.app/api';

/**
 * Test OCR processing with a local image file
 */
async function testOCRWithLocalImage() {
  console.log('=== Testing OCR with Local Image ===');
  
  try {
    // Path to a local image file
    const imagePath = path.join(__dirname, 'cutlist.jpg');
    
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found: ${imagePath}`);
      console.error('Please make sure you have an image named "cutlist.jpg" in the same directory as this script.');
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('phoneNumber', '+1234567890');
    formData.append('customerName', 'Test User');
    formData.append('projectName', 'Test Project');
    
    // Send the image for OCR processing
    console.log('\nSending image for OCR processing...');
    console.log(`Sending to: ${API_URL}/botsailor/process-image`);
    
    const response = await axios.post(`${API_URL}/botsailor/process-image`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    // Display the response
    console.log('\nOCR Processing Successful!');
    console.log('\nExtracted OCR Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      console.log('\n=== Extracted Dimensions ===');
      
      if (response.data.data.stockPieces && response.data.data.stockPieces.length > 0) {
        console.log('\nStock Pieces:');
        response.data.data.stockPieces.forEach((piece, index) => {
          console.log(`${index + 1}. ${piece.width} × ${piece.length} ${response.data.data.unit} (Quantity: ${piece.quantity})`);
        });
      }
      
      if (response.data.data.cutPieces && response.data.data.cutPieces.length > 0) {
        console.log('\nCut Pieces:');
        response.data.data.cutPieces.forEach((piece, index) => {
          console.log(`${index + 1}. ${piece.width} × ${piece.length} ${response.data.data.unit} (Quantity: ${piece.quantity})`);
        });
      }
    }
    
    console.log('\nOCR test completed successfully!');
  } catch (error) {
    console.error('\nError testing OCR:');
    if (error.response) {
      console.error('Server responded with error:', error.response.status);
      console.error('Error data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Request was sent to:', error.request._currentUrl);
    } else {
      console.error('Error setting up request:', error.message);
    }
    console.error('Full error:', error);
  }
}

/**
 * Run the test with a direct call to the OCR endpoint
 */
async function runTest() {
  await testOCRWithLocalImage();
}

// Run the test
runTest();
