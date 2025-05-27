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

// Simulate WhatsApp message data
const whatsappMessageData = {
  type: 'whatsapp_message',
  data: {
    from: '+1234567890',
    timestamp: new Date().toISOString(),
    message: 'New project request',
    attachments: [
      {
        type: 'project_data',
        content: {
          projectName: 'Kitchen Cabinet Project',
          customer: 'John Doe',
          deadline: '2023-12-31',
          materials: [
            {
              id: 'mat-1',
              name: 'White Melamine',
              thickness: 18,
              width: 2440,
              length: 1220,
              quantity: 5
            }
          ],
          parts: [
            // Cabinet sides
            { name: 'Side Panel', width: 720, length: 600, quantity: 10 },
            // Cabinet tops and bottoms
            { name: 'Top/Bottom', width: 568, length: 580, quantity: 10 },
            // Cabinet backs
            { name: 'Back Panel', width: 568, length: 720, quantity: 5 },
            // Shelves
            { name: 'Shelf', width: 568, length: 560, quantity: 15 },
            // Doors
            { name: 'Door', width: 297, length: 717, quantity: 10 }
          ]
        }
      }
    ]
  }
};

// Function to convert WhatsApp data to Botsailor format
function convertWhatsAppToBotsailor(whatsappData) {
  const { data } = whatsappData;
  const { attachments } = data;
  const projectData = attachments.find(a => a.type === 'project_data')?.content;

  if (!projectData) {
    throw new Error('No project data found in WhatsApp message');
  }

  // Convert to Botsailor format
  return {
    type: 'project',
    data: {
      id: 'whatsapp-' + Date.now(),
      name: projectData.projectName,
      description: `Project from WhatsApp - Customer: ${projectData.customer}, Deadline: ${projectData.deadline}`,
      materials: projectData.materials.map(m => ({
        id: m.id,
        name: m.name,
        type: 'board',
        thickness: m.thickness
      })),
      cutPieces: projectData.parts.map((p, index) => ({
        id: `cp-${index + 1}`,
        width: p.width,
        length: p.length,
        quantity: p.quantity,
        material: 'mat-1', // Assuming all parts use the first material
        name: p.name
      })),
      stockPieces: projectData.materials.map(m => ({
        id: `sp-${m.id}`,
        width: m.width,
        length: m.length,
        quantity: m.quantity,
        material: m.id
      }))
    }
  };
}

// Function to convert WhatsApp data to IQ format
function convertWhatsAppToIQ(whatsappData) {
  const { data } = whatsappData;
  const { attachments } = data;
  const projectData = attachments.find(a => a.type === 'project_data')?.content;

  if (!projectData) {
    throw new Error('No project data found in WhatsApp message');
  }

  // Convert to IQ format
  return {
    version: "1.0",
    title: projectData.projectName,
    date: new Date().toISOString(),
    unit: "mm",
    layout: "guillotine",
    cutWidth: 3,
    stockPieces: projectData.materials.map(m => ({
      id: `Stock-${m.id}`,
      width: m.width,
      length: m.length,
      quantity: m.quantity
    })),
    parts: projectData.parts.map(p => ({
      name: p.name,
      width: p.width,
      length: p.length,
      quantity: p.quantity
    }))
  };
}

// Test WhatsApp to Botsailor integration
async function testWhatsAppToBotsailor() {
  console.log('=== Testing WhatsApp to Botsailor Integration ===');

  try {
    // Convert WhatsApp data to Botsailor format
    const botsailorData = convertWhatsAppToBotsailor(whatsappMessageData);
    console.log('\nConverted WhatsApp data to Botsailor format:', JSON.stringify(botsailorData, null, 2));

    // Send to Botsailor API
    console.log('\nSending data to Botsailor API...');
    const response = await api.post('/botsailor/receive', botsailorData);
    console.log('Response:', response.data);

    console.log('\nWhatsApp to Botsailor integration test completed!');
  } catch (error) {
    console.error('Error testing WhatsApp to Botsailor integration:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

// Test WhatsApp to IQ integration
async function testWhatsAppToIQ() {
  console.log('\n=== Testing WhatsApp to IQ Integration ===');

  try {
    // Convert WhatsApp data to IQ format
    const iqData = convertWhatsAppToIQ(whatsappMessageData);
    console.log('\nConverted WhatsApp data to IQ format:', JSON.stringify(iqData, null, 2));

    // Send to IQ API
    console.log('\nSending data to IQ API...');
    const response = await api.post('/optimizer/import-iq', iqData);
    console.log('Response status:', response.status);
    console.log('Response message:', response.data.message);
    console.log('Imported pieces count:', response.data.importedPieces.length);
    console.log('PDF ID:', response.data.pdfId);

    console.log('\nWhatsApp to IQ integration test completed!');
  } catch (error) {
    console.error('Error testing WhatsApp to IQ integration:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

// Run the tests
async function runTests() {
  try {
    // Test WhatsApp to Botsailor integration
    await testWhatsAppToBotsailor();

    // Test WhatsApp to IQ integration
    await testWhatsAppToIQ();

    console.log('\nAll WhatsApp integration tests completed!');
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Execute the tests
runTests();
