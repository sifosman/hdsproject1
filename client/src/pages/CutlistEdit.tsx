import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckIcon from '@mui/icons-material/Check';
import HomeIcon from '@mui/icons-material/Home';
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
  _id?: string; // Added to reflect MongoDB ID if present
  stockPieces: StockPiece[];
  cutPieces: CutPiece[];
  materials: Material[];
  unit: string;
  customerName?: string;
  projectName?: string;
  isConfirmed?: boolean; // To track confirmation status from backend eventually
}

const CutlistEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cutlistData, setCutlistData] = useState<CutlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isDataConfirmed, setIsDataConfirmed] = useState(false); // Local confirmation state
  
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []); // Empty array as setters are stable

  const fetchCutlistData = useCallback(async () => {
    if (!id) {
      setError('No cutlist ID provided');
      showSnackbar('No cutlist ID provided', 'error');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching cutlist data for ID:', id);
      
      const response = await fetch(`/api/cutlist/data/${id}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      const result = await response.json();
      console.log('API response data:', JSON.stringify(result, null, 2));
      
      if (!result.success || !result.cutlist) {
        throw new Error(result.message || 'Failed to load cutlist data: structure incorrect or cutlist missing.');
      }
      
      const rawCutlist = result.cutlist;
      if (!rawCutlist.cutPieces && rawCutlist.dimensions) {
        console.log('Found dimensions but no cutPieces, using dimensions as cutPieces');
        rawCutlist.cutPieces = rawCutlist.dimensions;
      }
      
      const ensureIds = (items: any[], prefix: string): any[] => {
        if (!Array.isArray(items)) return [];
        return items.map((item, index) => ({
          ...item,
          id: item.id || item._id || `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`
        }));
      };
      
      const safeData: CutlistData = {
        _id: rawCutlist._id,
        stockPieces: ensureIds(rawCutlist.stockPieces || [], 'sp'),
        cutPieces: ensureIds(rawCutlist.cutPieces || [], 'cp'),
        materials: ensureIds(rawCutlist.materials || [], 'mat'),
        unit: rawCutlist.unit || 'mm',
        customerName: rawCutlist.customerName || '',
        projectName: rawCutlist.projectName || '',
        isConfirmed: rawCutlist.isConfirmed || false, // Check for confirmed status from backend
      };
      
      console.log('Safe data object created:', JSON.stringify(safeData, null, 2));
      setCutlistData(safeData);
      if (safeData.isConfirmed) {
        setIsDataConfirmed(true); // Set local confirmed state if data from backend is confirmed
        showSnackbar('This cutlist was previously confirmed.', 'info');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching cutlist data:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching data.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      setCutlistData(null);
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]); // Added showSnackbar to dependency array as it's used inside useCallback

  useEffect(() => {
    // Scroll to top when data loading is complete and there's no error
    if (!loading && !error) {
      window.scrollTo(0, 0);
    }
  }, [loading, error]);

  useEffect(() => {
    fetchCutlistData();
  }, [fetchCutlistData]);
  
  const handleSaveCutlist = async (dataToSave: CutlistData) => {
    if (!id) {
      showSnackbar('Cannot save: No cutlist ID provided', 'error');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      console.log('Saving cutlist data:', JSON.stringify(dataToSave, null, 2));
      
      const response = await fetch(`/api/cutlist/update/${id}`, {
        method: 'POST', // As per cutlist.routes.ts
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cutlistData: dataToSave }), // Send the whole object
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save cutlist data');
      }
      
      console.log('Save successful:', result);
      // The backend should return the updated cutlist, or at least confirm success.
      // For now, optimistically update frontend state or re-fetch.
      setCutlistData(dataToSave); // Optimistic update
      showSnackbar('Cutlist data saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving cutlist data:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSendWhatsApp = async (phoneNumber: string, currentData: CutlistData) => {
    if (!id) {
      showSnackbar('Cannot send: No cutlist ID provided', 'error');
      return;
    }
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        showSnackbar('Invalid phone number. Please use international format (e.g., +27123456789).', 'error');
        return;
    }
    try {
      showSnackbar('Sending link to WhatsApp...', 'info');
      const response = await fetch(`/api/cutlist/send-whatsapp/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber,
          customerName: currentData.customerName || 'N/A',
          projectName: currentData.projectName || 'N/A',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      const result = await response.json();
      if (result.success) {
        showSnackbar('WhatsApp message sent successfully!', 'success');
      } else {
        throw new Error(result.message || 'Failed to send WhatsApp message');
      }
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while sending WhatsApp message.';
      showSnackbar(errorMessage, 'error');
    }
  };
  
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
  
  const handleBack = () => {
    navigate('/');
  };
  
  const handleOpenConfirmDialog = () => {
    if (cutlistData) {
      setConfirmDialogOpen(true);
    } else {
      showSnackbar('No cutlist data to confirm.', 'error');
    }
  };
  
  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false);
  };
  
  const handleConfirmDialogConfirm = async () => {
    setConfirmDialogOpen(false);
    // TODO: Implement backend call to mark cutlist as confirmed
    // For now, just update local state and show success message
    setIsDataConfirmed(true);
    if (cutlistData) {
        const updatedData = { ...cutlistData, isConfirmed: true };
        setCutlistData(updatedData);
        // Optionally, call handleSaveCutlist here if confirmation should also save other changes
        // await handleSaveCutlist(updatedData); 
    }
    showSnackbar('Cutlist data confirmed successfully!', 'success');
    // Potentially disable further edits or show a clear visual indicator
  };
  
  return (
    <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', py: 3 }}>
      {/* Breadcrumbs and Header - Always Visible */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/cutlists" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Cutlists
        </Link>
        <Typography color="text.primary">Edit</Typography>
      </Breadcrumbs>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 3,
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h5"} component="h1">
            Edit Cutlist {id ? `(${id.substring(0, 6)}...)` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: isMobile ? 1 : 0 }}>
            <Button
                variant="contained"
                color="secondary"
                startIcon={<CheckIcon />}
                onClick={handleOpenConfirmDialog}
                disabled={loading || saving || isDataConfirmed || !cutlistData}
                sx={{ 
                  whiteSpace: 'nowrap',
                  width: { xs: '100%', sm: 'auto' },
                  mt: { xs: 2, sm: 0 } 
                }}
            >
                {isDataConfirmed ? 'Confirmed' : 'Confirm Cutlist'}
            </Button>
        </Box>
      </Box>

      {/* Conditional Content Area - Below Header */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh" sx={{mt: 3}}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading cutlist data...</Typography>
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2, mt: 3 }}>
          <Typography variant="h6">Error Loading Cutlist</Typography>
          {error}
          <Button onClick={fetchCutlistData} variant="outlined" sx={{mt: 2, ml:1}}>Try Again</Button>
          <Button onClick={handleBack} variant="outlined" sx={{mt: 2, ml:1}}>Go Back</Button>
        </Alert>
      )}

      {!loading && !error && cutlistData && (
        <Paper elevation={3} sx={{ mb: 4, mt: 3, width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
            <Tabs
              value={0} // Assuming only one tab for now
              aria-label="cutlist tabs"
              sx={{ 
                backgroundColor: theme.palette.grey[100],
                '& .MuiTab-root': {
                  py: isMobile ? 1.5 : 1.5,
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  minWidth: isMobile ? 0 : 'auto',
                  flexGrow: isMobile ? 1 : 'initial',
                }
              }}
              textColor="primary"
              indicatorColor="primary"
              variant={isMobile ? "fullWidth" : "standard"}
            >
              <Tab label={`${cutlistData.projectName || cutlistData.customerName || 'Cutlist'} Details`} id="cutlist-tab-0" />
            </Tabs>
          </Box>
          <Box sx={{ p: isMobile ? 2 : 3, width: '100%' }}>
            <EditableCutlistTable
              initialData={cutlistData}
              onSave={handleSaveCutlist}
              isConfirmed={isDataConfirmed}
              isMobile={isMobile}
            />
          </Box>
        </Paper>
      )}
      
      {!loading && !error && !cutlistData && (
         <Paper elevation={3} sx={{ p: 3, mb: 4, mt: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">No cutlist data available.</Typography>
            <Button onClick={fetchCutlistData} variant="outlined" sx={{mt: 2}}>Try Reloading</Button>
          </Paper>
      )}


      {/* Dialogs and Snackbars - Positioned at the end of the container is fine */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleConfirmDialogClose}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm Cutlist Data
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            Are you sure you want to confirm this cutlist? Once confirmed, this typically finalizes the data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDialogConfirm} color="primary" variant="contained" autoFocus>
            Confirm Data
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CutlistEdit;
