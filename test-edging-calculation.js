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

// Test edging calculation functionality
async function testEdgingCalculation() {
  console.log('=== Testing Edging Calculation ===');
  
  try {
    // Test data with edging requirements
    const testQuoteData = {
      sections: [
        {
          material: 'Melamine White 18mm',
          cutPieces: [
            {
              id: 'piece-1',
              width: 600,
              length: 800,
              amount: 2,
              edging: 'L1,W2', // Length side 1 and Width side 2
              name: 'Test Piece 1'
            },
            {
              id: 'piece-2', 
              width: 400,
              length: 600,
              amount: 1,
              edging: 'L1,L2', // Both length sides
              name: 'Test Piece 2'
            },
            {
              id: 'piece-3',
              width: 300,
              length: 500,
              amount: 3,
              edging: 'W1,W2,L1,L2', // All four sides
              name: 'Test Piece 3'
            }
          ]
        }
      ],
      customerName: 'Test Customer',
      projectName: 'Edging Test Project',
      phoneNumber: '+27123456789'
    };

    console.log('\nSending quote request with edging data...');
    console.log('Test data:', JSON.stringify(testQuoteData, null, 2));
    
    const response = await api.post('/optimizer/quote', testQuoteData);
    
    if (response.data.success) {
      console.log('\n✅ Quote generated successfully!');
      console.log('Quote ID:', response.data.data.quoteId);
      console.log('Grand Total:', response.data.data.grandTotal);
      
      // Check if edging information is included
      const sections = response.data.data.sections;
      sections.forEach((section, index) => {
        console.log(`\nSection ${index + 1}: ${section.material}`);
        console.log('Boards needed:', section.boardsNeeded);
        console.log('Section total (boards):', section.sectionTotal);
        
        if (section.edging) {
          console.log('Edging length (mm):', section.edging.length);
          console.log('Edging length (m):', (section.edging.length / 1000).toFixed(2));
          console.log('Edging cost:', section.edging.cost);
        } else {
          console.log('❌ No edging information found in section');
        }
      });
      
      // Expected calculations:
      // Piece 1: L1(800) + W2(600) = 1400mm × 2 pieces = 2800mm
      // Piece 2: L1(600) + L2(600) = 1200mm × 1 piece = 1200mm  
      // Piece 3: W1(300) + W2(300) + L1(500) + L2(500) = 1600mm × 3 pieces = 4800mm
      // Total: 2800 + 1200 + 4800 = 8800mm = 8.8m
      // Cost: 8.8m × R14 = R123.20
      
      const expectedEdgingLength = 8800; // mm
      const expectedEdgingCost = (expectedEdgingLength / 1000) * 14; // R123.20
      
      console.log('\n=== Expected vs Actual ===');
      console.log('Expected edging length:', expectedEdgingLength, 'mm');
      console.log('Expected edging cost: R', expectedEdgingCost.toFixed(2));
      
      if (sections[0] && sections[0].edging) {
        const actualLength = sections[0].edging.length;
        const actualCost = sections[0].edging.cost;
        
        console.log('Actual edging length:', actualLength, 'mm');
        console.log('Actual edging cost: R', actualCost.toFixed(2));
        
        if (Math.abs(actualLength - expectedEdgingLength) < 1) {
          console.log('✅ Edging length calculation is correct!');
        } else {
          console.log('❌ Edging length calculation is incorrect');
        }
        
        if (Math.abs(actualCost - expectedEdgingCost) < 0.01) {
          console.log('✅ Edging cost calculation is correct!');
        } else {
          console.log('❌ Edging cost calculation is incorrect');
        }
      }
      
      console.log('\nPDF URL:', response.data.data.pdfUrl);
      
    } else {
      console.log('❌ Quote generation failed:', response.data.message);
      if (response.data.error) {
        console.log('Error details:', response.data.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEdgingCalculation();