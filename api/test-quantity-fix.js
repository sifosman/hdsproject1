// Direct serverless function to test quantity fix
const { parseOCRText } = require('../server/dist/services/botsailor.service');

export default async function handler(req, res) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Test cases specifically for quantity extraction
    const testCases = [
      "2000x460=2",
      "918x460=4", 
      "360x140-8"
    ];
    
    // For direct parser tests
    const parserResults = testCases.map(testCase => {
      const parsed = parseOCRText(testCase);
      return {
        input: testCase,
        parsedQuantity: parsed.cutPieces[0]?.quantity,
        fullResult: parsed
      };
    });

    // For controller simulation tests
    const controllerMappedResults = testCases.map(testCase => {
      const parsed = parseOCRText(testCase);
      
      // Simulate both the old buggy controller code and the new fixed code
      const oldControllerQuantity = parsed.cutPieces[0]?.quantity || 1;
      const newControllerQuantity = 
        parsed.cutPieces[0]?.quantity !== undefined && 
        parsed.cutPieces[0]?.quantity !== null ? 
        Number(parsed.cutPieces[0]?.quantity) : 1;
      
      return {
        input: testCase,
        parsedQuantity: parsed.cutPieces[0]?.quantity,
        oldControllerMapping: oldControllerQuantity,
        newControllerMapping: newControllerQuantity,
        mappingDifference: oldControllerQuantity !== newControllerQuantity
      };
    });
    
    // To test which version of the code is deployed
    const fixedCodeTest = {
      testCase: "2000x460=0", // A zero quantity is the key test
      parserResult: parseOCRText("2000x460=0"),
      // Simulate old vs new code handling
      oldCode: parseOCRText("2000x460=0").cutPieces[0]?.quantity || 1,
      newCode: parseOCRText("2000x460=0").cutPieces[0]?.quantity !== undefined && 
               parseOCRText("2000x460=0").cutPieces[0]?.quantity !== null ? 
               Number(parseOCRText("2000x460=0").cutPieces[0]?.quantity) : 1,
      deployedCodeMatches: "Will check if old or new code matches results from live system"
    };
    
    // If this is a POST request with a custom OCR text, process that too
    let customTest = null;
    if (req.method === 'POST' && req.body && req.body.ocrText) {
      const ocrText = req.body.ocrText;
      const parsed = parseOCRText(ocrText);
      
      customTest = {
        input: ocrText,
        parsedQuantity: parsed.cutPieces[0]?.quantity,
        oldControllerMapping: parsed.cutPieces[0]?.quantity || 1,
        newControllerMapping: parsed.cutPieces[0]?.quantity !== undefined && 
                             parsed.cutPieces[0]?.quantity !== null ? 
                             Number(parsed.cutPieces[0]?.quantity) : 1,
        fullResult: parsed
      };
    }
    
    // Return all results
    res.status(200).json({
      success: true,
      message: 'Quantity fix diagnostic test',
      parserResults,
      controllerMappedResults,
      fixedCodeTest,
      customTest,
      serverTimestamp: new Date().toISOString(),
      codeVersion: "After quantity fix in controller"
    });
    
  } catch (error) {
    console.error('Error in quantity fix diagnostic test:', error);
    res.status(500).json({
      success: false,
      message: 'Error in quantity fix diagnostic test',
      error: error.toString()
    });
  }
}
