const axios = require('axios');

// API base URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sample IQ data
const iqData = {
  version: "1.0",
  title: "Kitchen Cabinet Project",
  date: new Date().toISOString(),
  unit: "mm",
  layout: "guillotine",
  cutWidth: 3,
  stockPieces: [
    {
      id: "Stock-1",
      width: 2440,
      length: 1220,
      quantity: 5
    }
  ],
  parts: [
    {
      name: "Side Panel",
      width: 720,
      length: 600,
      quantity: 10
    },
    {
      name: "Top/Bottom",
      width: 568,
      length: 580,
      quantity: 10
    },
    {
      name: "Back Panel",
      width: 568,
      length: 720,
      quantity: 5
    },
    {
      name: "Shelf",
      width: 568,
      length: 560,
      quantity: 15
    },
    {
      name: "Door",
      width: 297,
      length: 717,
      quantity: 10
    }
  ]
};

// Test IQ import
async function testIQImport() {
  try {
    console.log('Sending IQ data to import endpoint...');
    const response = await api.post('/optimizer/import-iq', iqData);
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error testing IQ import:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testIQImport();
