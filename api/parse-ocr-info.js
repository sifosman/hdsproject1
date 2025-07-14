// Diagnostic API endpoint to verify what version of the parser is running in production
// This will help diagnose if the updated parser code is being used or if there's a caching issue

const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get diagnostics
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeVersion: process.version,
      paths: {
        serverDistPath: path.resolve('./server/dist'),
        apiPath: path.resolve('./api'),
        currentDir: process.cwd()
      }
    };

    // Test if the parser module exists
    let parserModuleExists = false;
    let parserSource = '';
    let parserFunction = null;

    try {
      // Try to require the parser from different paths to diagnose import issues
      const importPaths = [
        '../server/dist/services/botsailor.service',
        './server/dist/services/botsailor.service',
        '/var/task/server/dist/services/botsailor.service'
      ];

      for (const importPath of importPaths) {
        try {
          const imported = require(importPath);
          if (imported && typeof imported.parseOCRText === 'function') {
            parserModuleExists = true;
            parserSource = importPath;
            parserFunction = imported.parseOCRText;
            break;
          }
        } catch (importError) {
          // Continue to next path
        }
      }

      // If we still haven't found it, try a direct dynamic import
      if (!parserModuleExists) {
        // Try to read the compiled JS file directly to check if it exists
        const possiblePaths = [
          path.resolve('./server/dist/services/botsailor.service.js'),
          path.resolve('/var/task/server/dist/services/botsailor.service.js')
        ];

        for (const filePath of possiblePaths) {
          try {
            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              diagnostics.fileExists = true;
              diagnostics.filePath = filePath;
              diagnostics.fileSize = fileContent.length;
              
              // Check if the file contains the improved parser logic keywords
              const containsImprovedRegex = fileContent.includes('dimensionPatterns') && 
                                          fileContent.includes('1000x500=2') &&
                                          fileContent.includes('parseOCRText');
              
              diagnostics.containsImprovedParser = containsImprovedRegex;
              break;
            }
          } catch (fileError) {
            // Continue to next path
          }
        }
      }
    } catch (moduleError) {
      diagnostics.moduleError = moduleError.message;
    }

    // Test the parser if available
    const testResults = [];
    
    if (parserFunction) {
      const testCases = [
        "2000x460=2",
        "918x460=4",
        "360x140-8"
      ];
      
      for (const testCase of testCases) {
        const result = parserFunction(testCase);
        testResults.push({
          input: testCase,
          output: result,
          quantitiesExtracted: result.cutPieces.map(piece => piece.quantity)
        });
      }
    }

    // Get the OCR text from the request if provided
    const { ocrText } = req.body || {};
    let userTestResult = null;
    
    if (ocrText && parserFunction) {
      userTestResult = {
        input: ocrText,
        output: parserFunction(ocrText)
      };
    }

    // Return diagnostic information
    return res.status(200).json({
      success: true,
      message: 'OCR parser diagnostics',
      diagnostics,
      parserAvailable: parserModuleExists,
      parserSource,
      standardTests: testResults,
      userTest: userTestResult
    });
  } catch (error) {
    console.error('Error in OCR parser diagnostics:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error getting OCR parser diagnostics',
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
};
