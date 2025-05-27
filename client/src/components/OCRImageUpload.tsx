import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Grid,
  Alert,
  Snackbar,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

interface OCRImageUploadProps {
  onProcessComplete: (data: any) => void;
  onError?: (error: string) => void;
}

const OCRImageUpload: React.FC<OCRImageUploadProps> = ({ onProcessComplete, onError }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      // Reset states
      setError(null);
      setSuccess(null);
    }
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      
      // Check if file is an image
      if (!file.type.match('image.*')) {
        setError('Please upload an image file');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset states
      setError(null);
      setSuccess(null);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      const response = await fetch('/api/ocr/process-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Image processed successfully');
        onProcessComplete(result.data);
        
        // Show success message
        setSnackbarMessage('Image processed successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Clear the form if successful
        if (phoneNumber) {
          setSnackbarMessage('WhatsApp confirmation sent successfully');
        }
      } else {
        setError(result.message || 'Error processing image');
        if (onError) onError(result.message || 'Error processing image');
        
        setSnackbarMessage(result.message || 'Error processing image');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing image';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      
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
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
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
              backgroundColor: '#f9f9f9',
              position: 'relative'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)'
                  }}
                  onClick={handleClearFile}
                >
                  <DeleteIcon />
                </IconButton>
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
              ref={fileInputRef}
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
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
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
            InputProps={{
              startAdornment: <WhatsAppIcon color="success" sx={{ mr: 1 }} />
            }}
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
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
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
      
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default OCRImageUpload;
