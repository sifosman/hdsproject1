import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CutlistTable from '../components/CutlistTable';
import { getBotsailorStatus, syncWithBotsailor } from '../services/api';
import botsailorService from '../services/botsailor';

interface CutlistData {
  stockPieces: Array<{
    id: string;
    width: number;
    length: number;
    quantity: number;
    material?: string;
  }>;
  cutPieces: Array<{
    id: string;
    width: number;
    length: number;
    quantity: number;
    name?: string;
  }>;
  materials: Array<{
    id: string;
    name: string;
    type: string;
    thickness: number;
  }>;
  unit: string;
}

const CutlistOCR: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cutlistData, setCutlistData] = useState<CutlistData | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const steps = [
    { label: 'Upload Image', icon: <CloudUploadIcon /> },
    { label: 'Edit Cutlist', icon: <EditIcon /> },
    { label: 'Optimize', icon: <SendIcon /> }
  ];
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset data
      setCutlistData(null);
      setError(null);
      setSuccess(null);
    }
  };
  
  const handleProcessImage = async () => {
    if (!selectedFile) {
      setSnackbarMessage('Please select an image file first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      if (phoneNumber) {
        formData.append('phoneNumber', phoneNumber);
      }
      
      if (customerName) {
        formData.append('customerName', customerName);
      }
      
      if (projectName) {
        formData.append('projectName', projectName);
      }
      
      // Call the API to process the image
      const response = await fetch('/api/botsailor/process-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setCutlistData(result.data);
        setSuccess('Image processed successfully');
        setActiveStep(1); // Move to edit step
      } else {
        setError(result.message || 'Error processing image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing image');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveCutlist = (data: CutlistData) => {
    setCutlistData(data);
    setSuccess('Cutlist saved successfully');
    setActiveStep(2); // Move to optimize step
  };
  
  const handleSendWhatsApp = async (phoneNumber: string, data: CutlistData) => {
    try {
      setLoading(true);
      
      // Call the WhatsApp API
      const response = await botsailorService.sendData({
        phoneNumber,
        customerName: customerName || 'Customer',
        projectName: projectName || 'Cutting List Project',
        data
      }, 'whatsapp');
      
      setSnackbarMessage('WhatsApp message sent successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'Error sending WhatsApp message');
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
      
      // Redirect to optimizer page with data
      // This is a placeholder - implement actual navigation
      console.log('Optimizing with data:', optimizerData);
      
      setSnackbarMessage('Redirecting to optimizer...');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // In a real implementation, you would navigate to the optimizer page
      // with the data, or call the optimizer API directly
      
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'Error optimizing cutlist');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cutlist OCR Processing
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel StepIconProps={{ icon: step.icon }}>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Cutting List Image
            </Typography>
            
            <Typography variant="body1" paragraph>
              Upload a photo of your handwritten cutting list. We'll use OCR to extract the dimensions and quantities.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    mb: 2,
                    height: 300,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  {previewUrl ? (
                    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{
                          maxHeight: '100%',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    </Box>
                  ) : (
                    <>
                      <ImageIcon sx={{ fontSize: 60, color: '#aaa', mb: 2 }} />
                      <Typography variant="body1" color="textSecondary">
                        Drag & drop an image here, or click to select
                      </Typography>
                    </>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                >
                  Select Image
                </Button>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Customer Information (Optional)
                </Typography>
                
                <TextField
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  fullWidth
                  margin="normal"
                  placeholder="+1234567890"
                  helperText="For WhatsApp confirmation"
                />
                
                <TextField
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                
                <TextField
                  label="Project Name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  fullWidth
                  margin="normal"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleProcessImage}
                disabled={!selectedFile || loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
              >
                {loading ? 'Processing...' : 'Process Image'}
              </Button>
            </Box>
            
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
          </Box>
        )}
        
        {activeStep === 1 && cutlistData && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Edit Extracted Cutlist
            </Typography>
            
            <Typography variant="body1" paragraph>
              Review and edit the extracted cutting list data. You can add, remove, or modify pieces as needed.
            </Typography>
            
            <CutlistTable
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
          <Box>
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
          </Box>
        )}
      </Paper>
      
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CutlistOCR;
