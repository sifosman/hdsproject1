import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Fab } from '@mui/material'; // Added Fab for mobile

// TabPanel component removed as it's no longer needed

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
  customerName?: string;
  projectName?: string;
}

interface EditableCutlistTableProps {
  initialData: CutlistData;
  onSave: (data: CutlistData) => void;
  onSendWhatsApp?: (phoneNumber: string, data: CutlistData, customerName?: string, projectName?: string) => void;
  isMobile?: boolean;
  isConfirmed?: boolean;
}

const EditableCutlistTable: React.FC<EditableCutlistTableProps> = ({ 
  initialData, 
  onSave,
  onSendWhatsApp,
  isMobile,
  isConfirmed
}) => {
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // isMobile is now a prop
  
  // Ensure all required arrays exist in initialData with safe defaults
  const safeInitialData: CutlistData = {
    stockPieces: initialData?.stockPieces || [],
    cutPieces: initialData?.cutPieces || [],
    materials: initialData?.materials || [],
    unit: initialData?.unit || 'mm',
    customerName: initialData?.customerName,
    projectName: initialData?.projectName
  };
  
  const [data, setData] = useState<CutlistData>(safeInitialData);
  // const [tabValue, setTabValue] = useState(0); // Removed as tabs are simplified
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (initialData) {
      setData({
        stockPieces: initialData.stockPieces || [], // Ensure stockPieces is always present
        cutPieces: initialData.cutPieces || [],
        materials: initialData.materials || [],
        unit: initialData.unit || 'mm',
        customerName: initialData.customerName,
        projectName: initialData.projectName
      });
    }
  }, [initialData]);

  // const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  //   setTabValue(newValue);
  // }; // Removed as tabs are simplified

  // const handleStockPieceChange = (id: string, field: keyof StockPiece, value: any) => {
  //   setData(prevData => ({
  //     ...prevData,
  //     stockPieces: prevData.stockPieces.map(piece => 
  //       piece.id === id ? { ...piece, [field]: field === 'quantity' ? parseInt(value) : parseFloat(value) } : piece
  //     )
  //   }));
  // }; // Stock pieces removed

  const handleCutPieceChange = (id: string, field: keyof CutPiece, value: any) => {
    setData(prevData => ({
      ...prevData,
      cutPieces: prevData.cutPieces.map(piece => 
        piece.id === id ? { 
          ...piece, 
          [field]: field === 'quantity' ? parseInt(value) : field === 'name' ? value : parseFloat(value) 
        } : piece
      )
    }));
  };

  const handleAddCutPiece = () => {
    const newId = `cp-${Date.now()}`;
    setData(prevData => ({
      ...prevData,
      cutPieces: [
        ...prevData.cutPieces,
        {
          id: newId,
          width: 500,
          length: 500,
          quantity: 1,
          name: `Cut Piece ${prevData.cutPieces.length + 1}`
        }
      ]
    }));
  };

  const handleDeleteCutPiece = (id: string) => {
    setData(prevData => ({
      ...prevData,
      cutPieces: prevData.cutPieces.filter(piece => piece.id !== id)
    }));
  };

  const handleSave = () => {
    // Validate data
    if (data.cutPieces.length === 0) {
      setSnackbarMessage('You need at least one cut piece');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    onSave(data);
    setSnackbarMessage('Cutlist saved successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleOpenWhatsAppDialog = () => {
    setWhatsappDialogOpen(true);
  };

  const handleCloseWhatsAppDialog = () => {
    setWhatsappDialogOpen(false);
  };

  const handleSendWhatsApp = () => {
    if (!phoneNumber) {
      setSnackbarMessage('Phone number is required');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    if (onSendWhatsApp) {
      onSendWhatsApp(phoneNumber, data, customerName, projectName);
      setSnackbarMessage('WhatsApp message sent successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
    
    setWhatsappDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Edit Cutting List
      </Typography>
      
      {isMobile ? (
        // Mobile Card View
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Cut Pieces ({data.unit})
            </Typography>
          </Box>
          {data.cutPieces.map((piece, index) => (
            <Paper key={piece.id} elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="caption" display="block" gutterBottom>Name</Typography>
              <TextField
                fullWidth
                value={piece.name || ''}
                onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                placeholder={`Cut Piece ${index + 1}`}
                variant="outlined"
                size="small"
                sx={{ mb: 1.5 }}
                disabled={isConfirmed}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ width: '48%' }}>
                  <Typography variant="caption" display="block" gutterBottom>Length ({data.unit})</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={piece.length}
                    onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 0, step: 0.1 }}
                    disabled={isConfirmed}
                  />
                </Box>
                <Box sx={{ width: '48%' }}>
                  <Typography variant="caption" display="block" gutterBottom>Width ({data.unit})</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={piece.width}
                    onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 0, step: 0.1 }}
                    disabled={isConfirmed}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ width: '48%' }}>
                  <Typography variant="caption" display="block" gutterBottom>Quantity</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={piece.quantity}
                    onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, step: 1 }}
                    disabled={isConfirmed}
                  />
                </Box>
                <IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" size="small" sx={{ mt: 2}} disabled={isConfirmed}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}
          <Fab 
            color="primary" 
            aria-label="add cut piece" 
            sx={{ position: 'fixed', bottom: 16, right: 16 }} 
            onClick={handleAddCutPiece}
            disabled={isConfirmed}
          >
            <AddIcon />
          </Fab>
        </Box>
      ) : (
        // Desktop Table View
        <Box sx={{ p: 3 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="subtitle1">
              Cut Pieces ({data.unit})
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddCutPiece}
              size="small"
              disabled={isConfirmed}
            >
              Add Cut Piece
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 400, overflowY: 'auto', overflowX: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Name/Desc</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Width ({data.unit})</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Length ({data.unit})</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.cutPieces.map((piece, index) => (
                  <TableRow key={piece.id}>
                    <TableCell>
                      <TextField
                        value={piece.name || `Cut Piece ${index + 1}`}
                        onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                        placeholder={`Cut Piece ${index + 1}`}
                        variant="outlined"
                        size="small"
                        disabled={isConfirmed}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={piece.width}
                        onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 0, step: 0.1 }}
                        disabled={isConfirmed}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={piece.length}
                        onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 0, step: 0.1 }}
                        disabled={isConfirmed}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={piece.quantity}
                        onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 1, step: 1 }}
                        disabled={isConfirmed}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" size="small" disabled={isConfirmed}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={isConfirmed} // Disable save if confirmed
        >
          Save Cutlist
        </Button>
        
        {onSendWhatsApp && (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<WhatsAppIcon />}
            onClick={handleOpenWhatsAppDialog}
          >
            Send to WhatsApp
          </Button>
        )}
      </Box>
      
      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialogOpen} onClose={handleCloseWhatsAppDialog}>
        <DialogTitle>Send Cutlist to WhatsApp</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="+1234567890"
              required
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWhatsAppDialog}>Cancel</Button>
          <Button onClick={handleSendWhatsApp} variant="contained" color="primary">
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default EditableCutlistTable;
