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
  width?: number;
  length?: number;
  quantity?: number;
  name?: string;
  edging?: number; // in mm, always 1mm
  separator?: boolean;
  lengthTick1?: boolean;
  lengthTick2?: boolean;
  widthTick1?: boolean;
  widthTick2?: boolean;
  material?: string; // Section material
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
  // Add 'White Messonite' to material options
  const MATERIAL_OPTIONS = ["White Melamine", "Doors", "Color", "White Messonite"];
  // Section headings for material assignment
  // Material headings with improved key detection
  const materialHeadings = [
    { key: "white melamine", value: "White Melamine" },
    { key: "white melamme", value: "White Melamine" }, // Common spelling variation
    { key: "doors", value: "Doors" },
    { key: "door", value: "Doors" }, // Singular form
    { key: "color", value: "Color" },
    { key: "colour", value: "Color" }, // UK spelling
    { key: "white messonite", value: "White Messonite" },
    { key: "messonite", value: "White Messonite" }, // Just messonite
  ];
  const separatorWords = materialHeadings.map(m => m.key);

  // Debug function to examine raw and normalized data
  function logRawPiecesForDebug(rawPieces: any[]) {
    console.log('====== DEBUG: RAW CUTLIST DATA ======');
    rawPieces.forEach((p, i) => {
      console.log(`[${i}] Name: "${p.name}" | Length: ${p.length} | Width: ${p.width}`);
    });
    console.log('====================================');
  }

  // Completely rewritten: Insert separator cut pieces for every heading
  function normalizeCutPieces(rawPieces: any[]): CutPiece[] {
    // Debug the raw input
    logRawPiecesForDebug(rawPieces);

    const normalized: CutPiece[] = [];
    let currentMaterial = MATERIAL_OPTIONS[0];
    let materialSeen = new Set<string>();
    materialSeen.add(currentMaterial); // Always add the default material

    // First check if any material names are direct matches in the input
    // This handles cases where material names are their own rows with no measurements
    const materialRows = new Set<number>();
    
    for (let i = 0; i < rawPieces.length; i++) {
      const piece = rawPieces[i];
      // Clean the name for comparison - remove all non-alphanumeric chars
      const cleanName = (piece.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check each material heading for match
      for (const heading of materialHeadings) {
        const cleanHeading = heading.key.replace(/[^a-z0-9]/g, '');
        
        // If name contains the heading and has no measurements, it's likely a heading row
        if (cleanName.includes(cleanHeading) && (!piece.width && !piece.length)) {
          materialRows.add(i);
          console.log(`Found material heading at row ${i}: ${piece.name} -> ${heading.value}`);
          break;
        }
      }
    }

    // Special case for empty data - ensure at least one material is visible
    if (rawPieces.length === 0) {
      // Add a default separator
      normalized.push({
        id: `sep-default-${Date.now()}`,
        name: MATERIAL_OPTIONS[0],
        separator: true,
      });
      return normalized;
    }

    // Add first material heading if not already the first item
    let currentIndex = 0;
    if (!materialRows.has(0)) {
      normalized.push({
        id: `sep-0-${Date.now()}`,
        name: MATERIAL_OPTIONS[0],
        separator: true,
      });
      currentMaterial = MATERIAL_OPTIONS[0];
    }

    // Process each piece
    for (let i = 0; i < rawPieces.length; i++) {
      const piece = rawPieces[i];
      
      // If this is a material heading row, insert a separator
      if (materialRows.has(i)) {
        // Find the matching material
        const cleanName = (piece.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedHeading = materialHeadings.find(heading => {
          const cleanHeading = heading.key.replace(/[^a-z0-9]/g, '');
          return cleanName.includes(cleanHeading);
        });
        
        // Add separator for this material
        if (matchedHeading) {
          normalized.push({
            id: `sep-${i}-${Date.now()}`,
            name: matchedHeading.value,
            separator: true,
          });
          currentMaterial = matchedHeading.value;
          console.log(`Adding separator: ${currentMaterial}`);
        }
        // Skip adding this piece as a normal cut piece
        continue;
      }
      
      // Normal cut piece - add with current material
      if (piece.name && (piece.width || piece.length || piece.quantity)) {
        normalized.push({
          ...piece,
          edging: piece.edging ?? 1,
          separator: false,
          lengthTick1: piece.lengthTick1 ?? false,
          lengthTick2: piece.lengthTick2 ?? false,
          widthTick1: piece.widthTick1 ?? false,
          widthTick2: piece.widthTick2 ?? false,
          material: currentMaterial,
        });
      }
    }

    // Log the normalized data for debugging
    console.log('Normalized pieces:', normalized.map((p, i) => {
      if (p.separator) {
        return `[${i}] SEPARATOR: ${p.name}`;
      }
      return `[${i}] ${p.name} (${p.material}) - ${p.length}x${p.width}`;
    }));
    
    return normalized;
  }
  const safeInitialData: CutlistData = {
    stockPieces: initialData?.stockPieces || [],
    cutPieces: normalizeCutPieces(initialData?.cutPieces || []),
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
          name: `Cut Piece ${prevData.cutPieces.length + 1}`,
          edging: 1,
          material: MATERIAL_OPTIONS[0],
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
    // Require both Length tick boxes for each cut piece (not separator)
    const invalidPiece = data.cutPieces.find(p => !p.separator && (!p.lengthTick1 || !p.lengthTick2));
    if (invalidPiece) {
      setSnackbarMessage('Please select both Length tick boxes for each cut piece.');
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
          {/* Group cards by material sections based on separators */}
          {(() => {
            // Find all section boundaries (separator headings)
            const sections: { material: string, pieces: CutPiece[], headingIdx: number }[] = [];
            let currentMaterial = MATERIAL_OPTIONS[0];
            let currentPieces: CutPiece[] = [];
            let headingIdx = 0;
            let separatorId = '';
            
            data.cutPieces.forEach((piece, idx) => {
              if (piece.separator) {
                // Save previous section if it has pieces
                if (currentPieces.length) {
                  sections.push({ 
                    material: currentMaterial, 
                    pieces: currentPieces, 
                    headingIdx 
                  });
                  currentPieces = [];
                }
                // Find material name for heading (exact match from piece.name)
                currentMaterial = piece.name || MATERIAL_OPTIONS[0];
                headingIdx = idx;
                separatorId = piece.id;
              } else {
                currentPieces.push(piece);
              }
            });
            
            // Push last section
            if (currentPieces.length) {
              sections.push({ 
                material: currentMaterial, 
                pieces: currentPieces, 
                headingIdx 
              });
            }
            
            console.log('Rendered sections:', sections.map(s => `${s.material} (${s.pieces.length} pieces)`));
            return sections.map((section, sectionIdx) => (
              <Box key={`section-${sectionIdx}-${section.material}`} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ mr: 1 }}>Material:</Typography>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={section.material}
                      onChange={e => {
                        const newMaterial = e.target.value;
                        setData(prevData => ({
                          ...prevData,
                          cutPieces: prevData.cutPieces.map((p, idx) => {
                            // If this is the separator for this section, update its name
                            if (p.separator && idx === section.headingIdx) {
                              return { ...p, name: newMaterial };
                            }
                            // If this is a cut piece in this section, update its material
                            if (section.pieces.some(sp => sp.id === p.id)) {
                              return { ...p, material: newMaterial };
                            }
                            return p;
                          })
                        }));
                      }}
                      disabled={isConfirmed}
                    >
                      {MATERIAL_OPTIONS.map(opt => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {section.pieces.map((piece, index) => (
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
                      <Box sx={{ width: '31%' }}>
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
                      <Box sx={{ width: '31%' }}>
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
                      <Box sx={{ width: '31%' }}>
                        <Typography variant="caption" display="block" gutterBottom>Edging (mm)</Typography>
                        <TextField
                          fullWidth
                          type="number"
                          value={piece.edging ?? 1}
                          variant="outlined"
                          size="small"
                          disabled
                        />
                      </Box>
                    </Box>
                    {/* Tick boxes row - mobile */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">Length</Typography>
                        <input
                          type="checkbox"
                          checked={!!piece.lengthTick1}
                          onChange={e => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)}
                        />
                        <input
                          type="checkbox"
                          checked={!!piece.lengthTick2}
                          onChange={e => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)}
                        />

                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">Width</Typography>
                        <input
                          type="checkbox"
                          checked={!!piece.widthTick1}
                          onChange={e => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)}
                          disabled={isConfirmed}
                        />
                        <input
                          type="checkbox"
                          checked={!!piece.widthTick2}
                          onChange={e => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)}
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
              </Box>
            ));
          })()}
          {/* Render separator headings as before */}
          {data.cutPieces.filter(piece => piece.separator).map(piece => (
            <Paper key={piece.id} elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {piece.name}
              </Typography>
            </Paper>
          ))}
          {/* Render separator headings as before */}
          {data.cutPieces.filter(piece => piece.separator).map(piece => (
            <Paper key={piece.id} elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {piece.name}
              </Typography>
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
          <TableContainer component={Paper} elevation={2}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Name/Desc</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Width ({data.unit})</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Length ({data.unit})</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Edging (mm)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }} colSpan={1} align="center">Ticks</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200] }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.cutPieces.map((piece, index) => (
                  piece.separator ? (
                    <TableRow key={piece.id}>
                      <TableCell colSpan={7} sx={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', color: 'primary.main', fontSize: '1.1em' }}>
                        {piece.name}
                      </TableCell>
                    </TableRow>
                  ) : (
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
                          value={piece.edging ?? 1}
                          variant="outlined"
                          size="small"
                          disabled
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
                      {/* Tick boxes column */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span style={{ fontSize: '0.8em' }}>Length</span>
                            <input
                              type="checkbox"
                              checked={!!piece.lengthTick1}
                              onChange={e => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)}
                              disabled={isConfirmed}
                            />
                            <input
                              type="checkbox"
                              checked={!!piece.lengthTick2}
                              onChange={e => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)}
                              disabled={isConfirmed}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span style={{ fontSize: '0.8em' }}>Width</span>
                            <input
                              type="checkbox"
                              checked={!!piece.widthTick1}
                              onChange={e => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)}
                              disabled={isConfirmed}
                            />
                            <input
                              type="checkbox"
                              checked={!!piece.widthTick2}
                              onChange={e => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)}
                              disabled={isConfirmed}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" size="small" disabled={isConfirmed}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
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
