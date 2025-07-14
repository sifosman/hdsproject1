import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import OCRImageUpload from '../components/OCRImageUpload';
import EditableCutlistTable from '../components/EditableCutlistTable';

interface StockPiece {
  id: string;
  width: number;
  length: number;
  quantity: number;
  material?: string;
}

interface CutPiece {
  id: string;
  width: number;
  length: number;
  quantity: number;
  name?: string;
}

interface Material {
  id: string;
  name: string;
  type: string;
  thickness: number;
}

interface CutlistData {
  stockPieces: StockPiece[];
  cutPieces: CutPiece[];
  materials: Material[];
  unit: string;
  rawText?: string; // Add rawText to store the OCR raw text
}

const OCRCutlistPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeStep, setActiveStep] = useState(0);
  const [cutlistData, setCutlistData] = useState<CutlistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const steps = [
    { label: 'Upload Image', icon: <CloudUploadIcon /> },
    { label: 'Edit Cutlist', icon: <EditIcon /> },
    { label: 'Optimize', icon: <SendIcon /> }
  ];
  
  const handleProcessComplete = (data: any) => {
    // Include rawText in the cutlistData
    const enhancedData: CutlistData = {
      ...data,
      rawText: data.rawText || ''
    };
    
    console.log('OCR processing complete with rawText:', enhancedData.rawText?.length || 0, 'characters');
    setCutlistData(enhancedData);
    setActiveStep(1); // Move to edit step
  };
  
  const handleSaveCutlist = (data: CutlistData) => {
    setCutlistData(data);
    
    // Save to server
    saveToServer(data);
  };
  
  const saveToServer = async (data: CutlistData) => {
    try {
      setLoading(true);
      
      // Call API to save cutlist data
      const response = await fetch('/api/ocr/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cutlistData: data })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Cutlist saved successfully');
        setActiveStep(2); // Move to optimize step
        
        setSnackbarMessage('Cutlist saved successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setError(result.message || 'Error saving cutlist');
        
        setSnackbarMessage(result.message || 'Error saving cutlist');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving cutlist';
      setError(errorMessage);
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendWhatsApp = async (
    phoneNumber: string, 
    data: CutlistData, 
    customerName?: string, 
    projectName?: string
  ) => {
    try {
      setLoading(true);
      
      // Call API to send WhatsApp message
      const response = await fetch('/api/ocr/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          cutlistData: data,
          customerName,
          projectName
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSnackbarMessage('WhatsApp message sent successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage(result.message || 'Error sending WhatsApp message');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending WhatsApp message';
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptimize = async () => {
    if (!cutlistData) {
      setSnackbarMessage('No cutlist data available');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert cutlist data to optimizer format
      const optimizerData = {
        pieces: [
          ...cutlistData.stockPieces.map(sp => ({
            width: sp.width,
            length: sp.length,
            amount: sp.quantity,
            kind: 1, // Stock piece
            pattern: 0 // No pattern
          })),
          ...cutlistData.cutPieces.map(cp => ({
            width: cp.width,
            length: cp.length,
            amount: cp.quantity,
            kind: 0, // Cut piece
            pattern: 0 // No pattern
          }))
        ],
        unit: cutlistData.unit === 'mm' ? 0 : cutlistData.unit === 'in' ? 1 : 2,
        width: 3, // Default cut width
        layout: 0 // Guillotine layout
      };
      
      // Call optimizer API
      const response = await fetch('/api/optimizer/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(optimizerData)
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Redirect to results page or display results
      // This is a placeholder - implement actual navigation
      window.location.href = `/optimizer/results?pdfId=${result.pdfId}`;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error optimizing cutlist';
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        OCR Cutting List Processing
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel StepIconProps={{ icon: step.icon }}>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {activeStep === 0 && (
        <OCRImageUpload 
          onProcessComplete={handleProcessComplete}
          onError={(errorMessage) => setError(errorMessage)}
        />
      )}
      
      {activeStep === 1 && cutlistData && (
        <Box>
          <EditableCutlistTable
            initialData={cutlistData}
            onSave={handleSaveCutlist}
            onSendWhatsApp={handleSendWhatsApp}
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
          </Box>
        </Box>
      )}
      
      {activeStep === 2 && cutlistData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Optimize Cutting Layout
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your cutting list is ready to be optimized. Click the button below to generate an optimized cutting layout.
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOptimize}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
            >
              {loading ? 'Processing...' : 'Optimize Cutting Layout'}
            </Button>
          </Box>
        </Paper>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
      
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OCRCutlistPage;
