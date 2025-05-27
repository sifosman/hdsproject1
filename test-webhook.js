/**
 * Test script to verify the Botsailor webhook functionality
 * This simulates a webhook request from Botsailor to your API
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const WEBHOOK_URL = 'https://hds-sifosmans-projects.vercel.app/api/botsailor/whatsapp/inbound';
const LOCAL_URL = 'http://localhost:5000/api/botsailor/whatsapp/inbound';

// Simulated webhook payload from Botsailor
const mockWebhookPayload = {
  user_id: 'test-user-123',
  message_type: 'image',
  image_url: 'https://example.com/test-image.jpg', // This won't actually work for OCR
  phone_number: '1234567890',
  sender_name: 'Test User'
};

/**
 * Test the webhook endpoint (both local and production)
 */
async function testWebhook() {
  console.log('=== Testing Botsailor Webhook Integration ===\n');
  
  // Test production webhook
  console.log(`Testing production webhook: ${WEBHOOK_URL}`);
  try {
    const prodResponse = await axios.post(WEBHOOK_URL, mockWebhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout and detailed error reporting
      timeout: 10000,
      validateStatus: function (status) {
        return true; // Always return response regardless of status code
      }
    });
    
    console.log('Production webhook response:');
    console.log('Status:', prodResponse.status);
    console.log('Headers:', JSON.stringify(prodResponse.headers, null, 2));
    console.log('Data:', JSON.stringify(prodResponse.data, null, 2));
    
    if (prodResponse.status >= 200 && prodResponse.status < 300) {
      console.log('\n✅ Production webhook test succeeded!\n');
    } else {
      console.log('\n⚠️ Production webhook received a non-success status code.\n');
    }
  } catch (error) {
    console.log('\n❌ Production webhook test failed:');
    console.log('Status:', error.response?.status || 'No status');
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    console.log('Stack trace:', error.stack);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('Request was made but no response received');
      console.log('Request details:', error.request);
    } else {
      console.log('Error setting up request:', error.message);
    }
    console.log('\n');
  }
  
  // Try to test local webhook if available
  console.log(`Testing local webhook: ${LOCAL_URL}`);
  console.log('Note: This will only work if your local server is running');
  
  try {
    const localResponse = await axios.post(LOCAL_URL, mockWebhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Local webhook response:');
    console.log('Status:', localResponse.status);
    console.log('Data:', JSON.stringify(localResponse.data, null, 2));
    console.log('\n✅ Local webhook test succeeded!\n');
  } catch (error) {
    console.log('\n❌ Local webhook test failed:');
    if (error.code === 'ECONNREFUSED') {
      console.log('Local server is not running. Start your local server with: npm start');
    } else {
      console.log('Status:', error.response?.status || 'No status');
      console.log('Error:', error.message);
      console.log('Response data:', error.response?.data || 'No response data');
    }
    console.log('\n');
  }
  
  console.log('=== Webhook Testing Complete ===');
}

// Run the test
testWebhook();
