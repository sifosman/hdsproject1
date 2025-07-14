import { Router, Request, Response } from 'express';
import { parseOCRText } from '../services/botsailor.service';
import { cutlistController } from '../controllers/cutlist.controller';

const router = Router();

interface CutPiece {
  width: number;
  length: number;
  quantity: number;
  description?: string;
  id?: string;
  name?: string;
}

/**
 * @route GET /api/diagnostic/parser
 * @description Test the OCR parser functionality with some sample inputs
 * @access Public
 */
router.get('/parser', (req: Request, res: Response) => {
  const testCases = [
    "2000x460=2",
    "918x460=4", 
    "360x140-8"
  ];

  const results = testCases.map(testCase => {
    const result = parseOCRText(testCase);
    return {
      input: testCase,
      output: result,
      quantitiesExtracted: result.cutPieces.map((piece: CutPiece) => piece.quantity)
    };
  });

  res.json({
    success: true,
    message: 'OCR parser test results',
    results,
    parserVersion: 'Using improved parser from botsailor.service',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route POST /api/diagnostic/parser
 * @description Test the OCR parser with user-provided OCR text
 * @access Public
 */
router.post('/parser', (req: Request, res: Response) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText) {
      res.status(400).json({
        success: false,
        message: 'OCR text is required'
      });
      return;
    }

    const result = parseOCRText(ocrText);

    res.json({
      success: true,
      message: 'OCR text parsed successfully',
      input: ocrText,
      output: result,
      quantitiesExtracted: result.cutPieces.map((piece: CutPiece) => piece.quantity),
      parserVersion: 'Using improved parser from botsailor.service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error parsing OCR text:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing OCR text',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/diagnostic/info
 * @description Get diagnostic information about the server
 * @access Public
 */
router.get('/info', (req: Request, res: Response) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      vercelEnv: process.env.VERCEL_ENV || 'development',
      nodeVersion: process.version,
      serverPath: __dirname,
      parserAvailable: typeof parseOCRText === 'function',
      parserFunctionString: parseOCRText.toString().slice(0, 200) + '...'
    };

    res.json({
      success: true,
      message: 'Server diagnostic information',
      diagnostics
    });
  } catch (error) {
    console.error('Error getting diagnostic information:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting diagnostic information',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/diagnostic/test-controller
 * @description Test the controller's cutlist creation with OCR text
 * @access Public
 */
router.post('/test-controller', async (req: Request, res: Response) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText) {
      res.status(400).json({
        success: false,
        message: 'OCR text is required'
      });
      return;
    }

    // Step 1: Direct parser test
    console.log('DIAGNOSTIC - Testing direct parser');
    const directParserResult = parseOCRText(ocrText);
    
    // Step 2: Mock the controller request
    console.log('DIAGNOSTIC - Testing controller integration');
    const mockRequest = {
      body: {
        ocrText: ocrText,
        phoneNumber: '+1234567890',  // Mock phone number
        senderName: 'Diagnostic Test'
      }
    } as Request;
    
    // Create a response capture object
    let responseData: any = {};
    const mockResponse = {
      status: (code: number) => {
        responseData.statusCode = code;
        return {
          json: (data: any) => {
            responseData.data = data;
            responseData.sent = true;
          }
        };
      },
      json: (data: any) => {
        responseData.data = data;
        responseData.sent = true;
        return mockResponse;
      }
    } as unknown as Response;
    
    // Intercept the controller's require of the parser to log what it receives
    const originalRequire = require;
    const mockedRequire = (path: string) => {
      if (path === '../services/botsailor.service') {
        console.log('DIAGNOSTIC - Controller is importing botsailor.service');
        const original = originalRequire(path);
        
        // Create a wrapped version that logs calls
        const wrappedParseOCRText = (text: string) => {
          console.log('DIAGNOSTIC - Controller called parseOCRText with:', text.substring(0, 50) + '...');
          const result = original.parseOCRText(text);
          console.log('DIAGNOSTIC - parseOCRText returned quantities:', 
                     result.cutPieces.map((p: any) => ({ desc: p.description, qty: p.quantity })));
          return result;
        };
        
        return {
          ...original,
          parseOCRText: wrappedParseOCRText
        };
      }
      return originalRequire(path);
    };
    
    // WARNING: This is a diagnostic tool and should NOT be used in production
    // It modifies the global require which could have side effects
    // We're only using it here for debugging purposes
    (global as any).require = mockedRequire;
    
    try {
      // Execute the controller function with our mock request/response
      await cutlistController.createFromN8nData(mockRequest, mockResponse);
      
      // Check the result and restore the original require
      (global as any).require = originalRequire;
      
      // Compare direct parser vs controller results
      res.json({
        success: true,
        message: 'Controller diagnostic test completed',
        directParserResult: {
          cutPieces: directParserResult.cutPieces.map((p: any) => ({ 
            width: p.width, 
            length: p.length, 
            quantity: p.quantity,
            description: p.description
          }))
        },
        controllerResult: responseData.data?.cutlist || 'No cutlist created',
        analysisOfQuantities: {
          directParser: directParserResult.cutPieces.map((p: any) => ({ 
            desc: p.description,
            qty: p.quantity 
          })),
          controller: responseData.data?.cutlist?.dimensions?.map((d: any) => ({
            desc: d.description,
            qty: d.quantity
          })) || 'No dimensions found'
        },
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Ensure we restore the original require even if there's an error
      (global as any).require = originalRequire;
      throw e;
    }
  } catch (error) {
    console.error('Error in controller diagnostic test:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing controller',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export const diagnosticRoutes = router;
