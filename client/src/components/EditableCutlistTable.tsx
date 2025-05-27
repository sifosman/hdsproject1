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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cutlist-tabpanel-${index}`}
      aria-labelledby={`cutlist-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

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
}

interface EditableCutlistTableProps {
  initialData: CutlistData;
  onSave: (data: CutlistData) => void;
  onSendWhatsApp?: (phoneNumber: string, data: CutlistData, customerName?: string, projectName?: string) => void;
}

const EditableCutlistTable: React.FC<EditableCutlistTableProps> = ({ 
  initialData, 
  onSave,
  onSendWhatsApp
}) => {
  const theme = useTheme();
  
  const [data, setData] = useState<CutlistData>(initialData);
  const [tabValue, setTabValue] = useState(0);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStockPieceChange = (id: string, field: keyof StockPiece, value: any) => {
    setData(prevData => ({
      ...prevData,
      stockPieces: prevData.stockPieces.map(piece => 
        piece.id === id ? { ...piece, [field]: field === 'quantity' ? parseInt(value) : parseFloat(value) } : piece
      )
    }));
  };

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

  const handleAddStockPiece = () => {
    const newId = `sp-${Date.now()}`;
    setData(prevData => ({
      ...prevData,
      stockPieces: [
        ...prevData.stockPieces,
        {
          id: newId,
          width: 2440,
          length: 1220,
          quantity: 1,
          material: prevData.materials[0]?.id || 'default'
        }
      ]
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
          name: `Part ${prevData.cutPieces.length + 1}`
        }
      ]
    }));
  };

  const handleDeleteStockPiece = (id: string) => {
    setData(prevData => ({
      ...prevData,
      stockPieces: prevData.stockPieces.filter(piece => piece.id !== id)
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
    if (data.stockPieces.length === 0) {
      setSnackbarMessage('You need at least one stock piece');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
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
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="cutlist tabs">
          <Tab label="Stock Pieces" id="cutlist-tab-0" aria-controls="cutlist-tabpanel-0" />
          <Tab label="Cut Pieces" id="cutlist-tab-1" aria-controls="cutlist-tabpanel-1" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1">Stock Pieces ({data.unit})</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddStockPiece}
            size="small"
          >
            Add Stock Piece
          </Button>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Width</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Material</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.stockPieces.map((piece) => (
                <TableRow key={piece.id}>
                  <TableCell>
                    <TextField
                      type="number"
                      value={piece.width}
                      onChange={(e) => handleStockPieceChange(piece.id, 'width', e.target.value)}
                      variant="outlined"
                      size="small"
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={piece.length}
                      onChange={(e) => handleStockPieceChange(piece.id, 'length', e.target.value)}
                      variant="outlined"
                      size="small"
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={piece.quantity}
                      onChange={(e) => handleStockPieceChange(piece.id, 'quantity', e.target.value)}
                      variant="outlined"
                      size="small"
                      inputProps={{ min: 1, step: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={piece.material || 'default'}
                        onChange={(e) => handleStockPieceChange(piece.id, 'material', e.target.value)}
                      >
                        {data.materials.map((material) => (
                          <MenuItem key={material.id} value={material.id}>
                            {material.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeleteStockPiece(piece.id)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1">Cut Pieces ({data.unit})</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddCutPiece}
            size="small"
          >
            Add Cut Piece
          </Button>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Width</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.cutPieces.map((piece) => (
                <TableRow key={piece.id}>
                  <TableCell>
                    <TextField
                      value={piece.name || ''}
                      onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                      variant="outlined"
                      size="small"
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
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
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
