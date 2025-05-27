const axios = require('axios');

// API base URL - change this to match your server
const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test Botsailor integration
async function testBotsailorIntegration() {
  console.log('=== Testing Botsailor Integration ===');
  
  try {
    // 1. Test connection status
    console.log('\nTesting Botsailor connection status...');
    const statusResponse = await api.get('/botsailor/status');
    console.log('Status response:', statusResponse.data);
    
    // 2. Test receiving data from Botsailor (simulating WhatsApp data)
    console.log('\nTesting receiving data from Botsailor...');
    const botsailorData = {
      type: 'project',
      data: {
        id: 'bs-' + Date.now(),
        name: 'WhatsApp Project',
        description: 'Project data received from WhatsApp via Botsailor',
        materials: [
          {
            id: 'mat-1',
            name: 'Plywood 18mm',
            type: 'wood',
            thickness: 18
          }
        ],
        cutPieces: [
          {
            id: 'cp-1',
            width: 800,
            length: 600,
            quantity: 2,
            material: 'mat-1'
          },
          {
            id: 'cp-2',
            width: 400,
            length: 300,
            quantity: 4,
            material: 'mat-1'
          }
        ],
        stockPieces: [
          {
            id: 'sp-1',
            width: 2440,
            length: 1220,
            quantity: 2,
            material: 'mat-1'
          }
        ]
      }
    };
    
    const receiveResponse = await api.post('/botsailor/receive', botsailorData);
    console.log('Receive response:', receiveResponse.data);
    
    // 3. Test getting materials
    console.log('\nTesting getting materials from Botsailor...');
    const materialsResponse = await api.get('/botsailor/materials');
    console.log('Materials response:', materialsResponse.data);
    
    // 4. Test getting stock pieces
    console.log('\nTesting getting stock pieces from Botsailor...');
    const stockResponse = await api.get('/botsailor/stock?materialId=mat-1');
    console.log('Stock pieces response:', stockResponse.data);
    
    console.log('\nBotsailor integration tests completed!');
  } catch (error) {
    console.error('Error testing Botsailor integration:', error.response?.data || error.message);
  }
}

// Test IQ software integration
async function testIQIntegration() {
  console.log('\n=== Testing IQ Software Integration ===');
  
  try {
    // 1. Test importing data from IQ
    console.log('\nTesting importing data from IQ...');
    const iqData = {
      version: "1.0",
      title: "IQ Software Export",
      date: new Date().toISOString(),
      unit: "mm",
      layout: "guillotine",
      cutWidth: 3,
      stockPieces: [
        {
          id: "Stock1",
          width: 2440,
          length: 1220,
          quantity: 2
        }
      ],
      parts: [
        {
          name: "A",
          width: 800,
          length: 600,
          quantity: 2
        },
        {
          name: "B",
          width: 400,
          length: 300,
          quantity: 4
        }
      ]
    };
    
    const importResponse = await api.post('/optimizer/import-iq', iqData);
    console.log('Import response status:', importResponse.status);
    console.log('Import response message:', importResponse.data.message);
    console.log('Imported pieces count:', importResponse.data.importedPieces.length);
    console.log('PDF ID:', importResponse.data.pdfId);
    
    // 2. Test exporting data to IQ
    console.log('\nTesting exporting data to IQ...');
    const exportResponse = await api.post('/optimizer/export-iq', {
      solution: importResponse.data.solution,
      unit: 0, // mm
      width: 3,
      layout: 0 // guillotine
    });
    
    console.log('Export response status:', exportResponse.status);
    console.log('Export data version:', exportResponse.data.version);
    console.log('Export data title:', exportResponse.data.title);
    console.log('Stock pieces count:', exportResponse.data.stockPieces.length);
    
    console.log('\nIQ software integration tests completed!');
  } catch (error) {
    console.error('Error testing IQ integration:', error.response?.data || error.message);
  }
}

// Run the tests
async function runTests() {
  try {
    // First test Botsailor integration
    await testBotsailorIntegration();
    
    // Then test IQ software integration
    await testIQIntegration();
    
    console.log('\nAll integration tests completed!');
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Execute the tests
runTests();
