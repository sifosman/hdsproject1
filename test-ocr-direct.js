/**
 * Direct test of Google Cloud Vision OCR functionality
 * This script bypasses the server and directly uses the Google Cloud Vision API
 */

// Load environment variables from .env file
require('dotenv').config({ path: './server/.env' });

const fs = require('fs');
const path = require('path');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Path to the test image
const imagePath = path.join(__dirname, 'cutlist.jpg');

// Check if the image exists
if (!fs.existsSync(imagePath)) {
  console.error(`Test image not found: ${imagePath}`);
  console.error('Please make sure you have a file named "cutlist.jpg" in the project root directory');
  process.exit(1);
}

/**
 * Initialize the Google Cloud Vision client
 * Using credentials directly from the file
 */
async function initializeClient() {
  try {
    // Direct path to credentials file in the project
    const credentialsPath = path.join(__dirname, 'google-cloud-credentials.json');
    
    if (fs.existsSync(credentialsPath)) {
      console.log(`Using Google Cloud credentials from file: ${credentialsPath}`);
      // Read credentials directly from file
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      const visionClient = new ImageAnnotatorClient({ credentials });
      return visionClient;
    } else {
      console.error(`Credentials file not found at: ${credentialsPath}`);
      console.error('Please make sure google-cloud-credentials.json exists in the project root directory');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error initializing Google Cloud Vision client:', error);
    process.exit(1);
  }
}

/**
 * Process an image with Google Cloud Vision OCR
 */
async function processImageWithOCR(client, imagePath) {
  try {
    console.log(`Processing image: ${imagePath}`);
    
    // Read the image file
    const imageFile = fs.readFileSync(imagePath);
    
    // Perform OCR on the image
    console.log('Sending image to Google Cloud Vision API...');
    const [result] = await client.textDetection(imageFile);
    const detections = result.textAnnotations || [];
    
    // Extract the full text
    const fullText = detections[0]?.description || '';
    
    console.log('\n==== Extracted Text ====\n');
    console.log(fullText);
    
    // Extract dimensions using regex
    const dimensionRegex = /(\d+)\s*[xX×]\s*(\d+)(?:\s*(\d+)(?:\s*pcs?)?)?/g;
    const matches = [...fullText.matchAll(dimensionRegex)];
    
    if (matches.length > 0) {
      console.log('\n==== Extracted Dimensions ====\n');
      
      matches.forEach((match, index) => {
        const width = match[1];
        const length = match[2];
        const quantity = match[3] || 1;
        
        console.log(`${index + 1}. ${width} × ${length} (Quantity: ${quantity})`);
      });
    } else {
      console.log('\nNo dimensions found in the extracted text');
    }
    
    return {
      fullText,
      dimensions: matches.map(match => ({
        width: parseInt(match[1]),
        length: parseInt(match[2]),
        quantity: match[3] ? parseInt(match[3]) : 1
      }))
    };
  } catch (error) {
    console.error('Error processing image with OCR:', error);
    return { error: error.message };
  }
}

/**
 * Main function to run the test
 */
async function main() {
  console.log('=== Direct Testing of Google Cloud Vision OCR ===\n');
  
  try {
    // Initialize the Vision client
    const client = await initializeClient();
    
    // Process the image
    const result = await processImageWithOCR(client, imagePath);
    
    console.log('\n=== Test completed successfully ===');
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error(error);
  }
}

// Run the test
main();
