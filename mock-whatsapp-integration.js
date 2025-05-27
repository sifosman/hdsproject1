/**
 * Mock implementation of WhatsApp integration with Botsailor and IQ software
 * This demonstrates how the data would flow between systems
 */

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

// Mock Botsailor API processing
function mockBotsailorProcessing(botsailorData) {
  console.log('=== Botsailor API Processing ===');
  console.log('Received project data:', botsailorData.data.name);
  console.log('Project description:', botsailorData.data.description);
  console.log('Materials:', botsailorData.data.materials.length);
  console.log('Cut pieces:', botsailorData.data.cutPieces.length);
  console.log('Stock pieces:', botsailorData.data.stockPieces.length);
  
  // Simulate processing
  console.log('\nProcessing project data...');
  console.log('Validating materials...');
  console.log('Validating cut pieces...');
  console.log('Validating stock pieces...');
  
  // Simulate response
  return {
    success: true,
    message: 'Project data received and processed successfully',
    projectId: botsailorData.data.id,
    timestamp: new Date().toISOString()
  };
}

// Mock IQ software processing
function mockIQProcessing(iqData) {
  console.log('\n=== IQ Software Processing ===');
  console.log('Received project data:', iqData.title);
  console.log('Unit:', iqData.unit);
  console.log('Layout:', iqData.layout);
  console.log('Cut width:', iqData.cutWidth);
  console.log('Stock pieces:', iqData.stockPieces.length);
  console.log('Parts:', iqData.parts.length);
  
  // Simulate processing
  console.log('\nProcessing project data...');
  console.log('Optimizing cutting layout...');
  
  // Calculate total area
  let totalStockArea = 0;
  let totalPartsArea = 0;
  
  iqData.stockPieces.forEach(sp => {
    totalStockArea += sp.width * sp.length * sp.quantity;
  });
  
  iqData.parts.forEach(p => {
    totalPartsArea += p.width * p.length * p.quantity;
  });
  
  const wastePercentage = ((totalStockArea - totalPartsArea) / totalStockArea * 100).toFixed(2);
  
  // Simulate optimization result
  const optimizationResult = {
    success: true,
    message: 'Optimization completed successfully',
    pdfId: 'mock-pdf-' + Date.now(),
    summary: {
      totalStockPieces: iqData.stockPieces.reduce((sum, sp) => sum + sp.quantity, 0),
      totalCutPieces: iqData.parts.reduce((sum, p) => sum + p.quantity, 0),
      totalStockArea,
      totalPartsArea,
      totalWaste: totalStockArea - totalPartsArea,
      wastePercentage
    }
  };
  
  console.log('\nOptimization result:');
  console.log('Total stock pieces:', optimizationResult.summary.totalStockPieces);
  console.log('Total cut pieces:', optimizationResult.summary.totalCutPieces);
  console.log('Total stock area:', optimizationResult.summary.totalStockArea);
  console.log('Total parts area:', optimizationResult.summary.totalPartsArea);
  console.log('Total waste:', optimizationResult.summary.totalWaste);
  console.log('Waste percentage:', optimizationResult.summary.wastePercentage + '%');
  
  return optimizationResult;
}

// Run the mock integration
function runMockIntegration() {
  console.log('=== Mock WhatsApp Integration Test ===\n');
  
  // Step 1: Receive WhatsApp message
  console.log('Step 1: Received WhatsApp message from:', whatsappMessageData.data.from);
  console.log('Message:', whatsappMessageData.data.message);
  console.log('Attachments:', whatsappMessageData.data.attachments.length);
  
  // Step 2: Convert to Botsailor format
  console.log('\nStep 2: Converting WhatsApp data to Botsailor format...');
  const botsailorData = convertWhatsAppToBotsailor(whatsappMessageData);
  
  // Step 3: Process with Botsailor
  console.log('\nStep 3: Sending data to Botsailor API...');
  const botsailorResponse = mockBotsailorProcessing(botsailorData);
  
  // Step 4: Convert to IQ format
  console.log('\nStep 4: Converting WhatsApp data to IQ format...');
  const iqData = convertWhatsAppToIQ(whatsappMessageData);
  
  // Step 5: Process with IQ software
  console.log('\nStep 5: Sending data to IQ software...');
  const iqResponse = mockIQProcessing(iqData);
  
  // Step 6: Summary
  console.log('\n=== Integration Test Summary ===');
  console.log('WhatsApp to Botsailor: SUCCESS');
  console.log('WhatsApp to IQ software: SUCCESS');
  console.log('Project ID:', botsailorResponse.projectId);
  console.log('PDF ID:', iqResponse.pdfId);
  console.log('Waste percentage:', iqResponse.summary.wastePercentage + '%');
}

// Run the mock integration
runMockIntegration();
