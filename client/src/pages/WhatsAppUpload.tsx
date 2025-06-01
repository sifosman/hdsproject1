import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
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
import { useLocation } from 'react-router-dom';

const WhatsAppUpload: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Parse query parameters to extract user info
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const userParam = queryParams.get('user');
    if (userParam) {
      setPhoneNumber(userParam);
    }
  }, [location]);
  
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
      setError(null);
      setSuccess(null);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbarMessage('Please select an image file first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('phoneNumber', phoneNumber);
      formData.append('customerName', customerName || 'WhatsApp User');
      
      const response = await fetch('/api/cutlist/process-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      setSuccess(`Your cutting list has been processed successfully! You can view it at: ${result.cutlistUrl}`);
      setSnackbarMessage('Cutting list processed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Redirect to the cutlist view page after a short delay
      setTimeout(() => {
        window.location.href = result.cutlistUrl;
      }, 3000);
      
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(`Failed to process image: ${err.message}`);
      setSnackbarMessage(`Error: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Upload Your Cutting List Image
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" paragraph>
          We'll process your image and extract the dimensions automatically
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box textAlign="center" mb={3}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="contained-button-file"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="contained-button-file">
                  <Button
                    variant="contained"
                    color="primary"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth={isMobile}
                    size="large"
                  >
                    Select Image
                  </Button>
                </label>
              </Box>
            </Grid>
            
            {previewUrl && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardMedia
                    component="img"
                    image={previewUrl}
                    alt="Selected Image"
                    sx={{ 
                      height: 240,
                      objectFit: 'contain',
                      backgroundColor: 'rgba(0,0,0,0.05)'
                    }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      {selectedFile?.name} ({Math.round(selectedFile?.size! / 1024)} KB)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            <Grid item xs={12} md={previewUrl ? 6 : 12}>
              <Box mb={2}>
                <TextField
                  label="Phone Number"
                  variant="outlined"
                  fullWidth
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  helperText="Used to send your cutting list results"
                  disabled={!!phoneNumber} // Disable if pre-filled from query param
                />
              </Box>
              <Box mb={2}>
                <TextField
                  label="Your Name"
                  variant="outlined"
                  fullWidth
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name (optional)"
                />
              </Box>
              <Box mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<ImageIcon />}
                  onClick={handleUpload}
                  disabled={!selectedFile || loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Process Image'}
                </Button>
              </Box>
            </Grid>
            
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            
            {success && (
              <Grid item xs={12}>
                <Alert severity="success">{success}</Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WhatsAppUpload;
