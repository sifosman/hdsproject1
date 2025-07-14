// Diagnostic API to trace quantity flow from OCR text to DB
import { parseOCRText } from '../server/dist/services/botsailor.service';
import Cutlist from '../server/dist/models/cutlist.model';

// This endpoint won't save anything to the database, it just simulates the flow
export default async function handler(req, res) {
  try {
    // Accept POST with ocrText in the body or GET with ocrText as a query parameter
    const method = req.method;
    let ocrText;
    
    if (method === 'POST') {
      ocrText = req.body.ocrText;
    } else if (method === 'GET') {
      ocrText = req.query.ocrText;
    }
    
    // If no ocrText provided, use a sample
    if (!ocrText) {
      ocrText = "White melamme\n2000x 460=2\n918x460=4\n400x460 = 1\n450x460=2\n1000X 460 = 1\n450X140=14\n960X140=6\n360x140-8\nDoors\n997×470=2\n470\n197×7=4\n197×947=3\nwhite messonite\n2000x 950=1\n450x892=3\n450x470=4";
    }
    
    console.log('=== QUANTITY FLOW TRACE ===');
    console.log('Input OCR Text:', ocrText);
    
    // Step 1: Parse OCR text with the improved parser
    console.log('\nSTEP 1: Parsing OCR text with improved parser');
    const parsedResults = parseOCRText(ocrText);
    console.log('Parser output cutPieces:', JSON.stringify(parsedResults.cutPieces, null, 2));
    
    // Step 2: Map to the format expected by the rest of the code (like in createFromN8nData)
    console.log('\nSTEP 2: Mapping parser results to dimensions format');
    const dimensions = parsedResults.cutPieces.map(piece => ({
      width: piece.width,
      length: piece.length,
      quantity: piece.quantity !== undefined && piece.quantity !== null ? Number(piece.quantity) : 1,
      description: piece.description || ''
    }));
    console.log('Mapped dimensions:', JSON.stringify(dimensions, null, 2));
    
    // Step 3: Create a new cutlist object (but don't save it)
    console.log('\nSTEP 3: Creating cutlist object with dimensions');
    const cutlistObj = {
      rawText: ocrText,
      unit: parsedResults.unit || 'mm',
      dimensions: dimensions || [],
      customerName: 'Diagnostic Test',
      projectName: 'Quantity Flow Trace',
    };
    console.log('Cutlist object dimensions:', JSON.stringify(cutlistObj.dimensions, null, 2));
    
    // Step 4: Simulate what happens when saving to MongoDB (Mongoose)
    console.log('\nSTEP 4: Simulating MongoDB document creation');
    const cutlistDoc = new Cutlist(cutlistObj);
    console.log('Mongoose document dimensions:', JSON.stringify(cutlistDoc.dimensions, null, 2));
    
    // Step 5: Simulate toObject conversion (what happens when sending to frontend)
    console.log('\nSTEP 5: Simulating toObject conversion for API response');
    const cutlistAsObject = cutlistDoc.toObject ? cutlistDoc.toObject() : cutlistDoc;
    console.log('Document as plain object dimensions:', JSON.stringify(cutlistAsObject.dimensions, null, 2));
    
    // Count items with quantity=1 vs other quantities
    const quantityOneCount = dimensions.filter(d => d.quantity === 1).length;
    const totalDimensions = dimensions.length;
    
    return res.status(200).json({
      success: true,
      message: 'Quantity flow trace complete',
      inputTextLength: ocrText.length,
      parsedItemsCount: parsedResults.cutPieces.length,
      dimensionsCount: dimensions.length,
      quantityStats: {
        quantityOneCount,
        otherQuantityCount: totalDimensions - quantityOneCount,
        percentageOne: totalDimensions > 0 ? (quantityOneCount / totalDimensions * 100).toFixed(1) : 0
      },
      dimensions: dimensions
    });
  } catch (error) {
    console.error('Error in quantity flow trace:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracing quantity flow',
      error: error.message || String(error)
    });
  }
}
