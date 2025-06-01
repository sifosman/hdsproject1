import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
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
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Divider,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FloatingActionButton from './CutlistFloatingButton';
import { v4 as uuidv4 } from 'uuid';

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

// Parse the OCR text and create cutlist data
const parseOcrText = (ocrText: string): CutlistData => {
  const cutPieces: CutPiece[] = [];
  const stockPieces: StockPiece[] = [];
  const materials: Material[] = [];
  let currentMaterial = 'White melamme'; // Default material
  
  // Split by lines
  const lines = ocrText.split('\n');
  
  for (const line of lines) {
    // Check if this line defines a material
    if (line.toLowerCase().includes('cutlist:') || line.trim().endsWith(':')) {
      const materialName = line.split(':')[1]?.trim() || line.replace(':', '').trim();
      if (materialName) {
        currentMaterial = materialName;
        materials.push({
          id: uuidv4(),
          name: materialName,
          type: 'board',
          thickness: 16 // Default thickness
        });
      }
      continue;
    }
    
    // Check if this is a section header (like "Doors")
    if (!line.includes('x') && !line.includes('X') && !line.includes('×')) {
      continue;
    }
    
    // Parse dimension lines
    const regex = /(\d+)\s*[xX×]\s*(\d+)\s*=?\s*(\d+)?/;
    const match = line.match(regex);
    
    if (match) {
      const length = parseInt(match[1]);
      const width = parseInt(match[2]);
      const quantity = match[3] ? parseInt(match[3]) : 1;
      
      // Determine if this is likely a stock piece or cut piece based on size
      if (length >= 2000 || width >= 1000) {
        stockPieces.push({
          id: uuidv4(),
          length,
          width,
          quantity,
          material: currentMaterial
        });
      } else {
        cutPieces.push({
          id: uuidv4(),
          length,
          width,
          quantity,
          name: `Part ${cutPieces.length + 1}`
        });
      }
    }
  }
  
  // If no materials were detected, add the default one
  if (materials.length === 0) {
    materials.push({
      id: uuidv4(),
      name: 'White melamme',
      type: 'board',
      thickness: 16
    });
  }
  
  // If no stock pieces were detected, add a default one
  if (stockPieces.length === 0) {
    stockPieces.push({
      id: uuidv4(),
      length: 2440,
      width: 1220,
      quantity: 1,
      material: materials[0].name
    });
  }
  
  return {
    cutPieces,
    stockPieces,
    materials,
    unit: 'mm'
  };
};

const CutlistDemo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  
  // Sample OCR text
  const sampleOcrText = `cutlist:White melamme
2000x 460=2
918x460=4
400x460 = 1
450x460=2
1000X 460 = 1
450X140=14
960X140=6
360x140-8
Doors
997×470=2
470
197×7=4
197×947=3
white messonite
2000x 950=1
450x892=3
450x470=4`;

  // Parse the OCR text to create cutlist data
  const [data, setData] = useState<CutlistData>(parseOcrText(sampleOcrText));
  
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
        piece.id === id ? { ...piece, [field]: field === 'quantity' ? parseInt(value) : field === 'name' ? value : parseFloat(value) } : piece
      )
    }));
  };
  
  const addStockPiece = () => {
    setData(prevData => ({
      ...prevData,
      stockPieces: [
        ...prevData.stockPieces,
        {
          id: uuidv4(),
          width: 1220,
          length: 2440,
          quantity: 1,
          material: prevData.materials[0]?.name
        }
      ]
    }));
  };
  
  const addCutPiece = () => {
    setData(prevData => ({
      ...prevData,
      cutPieces: [
        ...prevData.cutPieces,
        {
          id: uuidv4(),
          width: 300,
          length: 600,
          quantity: 1,
          name: `Part ${prevData.cutPieces.length + 1}`
        }
      ]
    }));
  };
  
  const removeStockPiece = (id: string) => {
    setData(prevData => ({
      ...prevData,
      stockPieces: prevData.stockPieces.filter(piece => piece.id !== id)
    }));
  };
  
  const removeCutPiece = (id: string) => {
    setData(prevData => ({
      ...prevData,
      cutPieces: prevData.cutPieces.filter(piece => piece.id !== id)
    }));
  };
  
  const handleSave = () => {
    alert('Changes saved (demo only - no actual saving occurs)');
  };
  
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="text.primary">Cutting List Demo</Typography>
        </Breadcrumbs>
        
        <Paper elevation={4} sx={{ p: 3, mb: 3, bgcolor: theme.palette.primary.main, color: 'white' }}>
          <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} gap={2}>
            <Typography variant="h4" component="h1" gutterBottom={isMobile} sx={{ color: 'white' }}>
              Edit Cutting List (Demo)
            </Typography>
            
            <Box display="flex" gap={2} flexDirection={isMobile ? 'column' : 'row'} width={isMobile ? '100%' : 'auto'}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
              >
                Save Changes
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={addCutPiece}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
              >
                Add Part
              </Button>
            </Box>
          </Box>
        </Paper>
        
        <Paper elevation={3} sx={{ mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="cutlist tabs"
              sx={{ 
                backgroundColor: theme.palette.primary.main, 
                color: 'white',
                '& .MuiTab-root': {
                  py: isMobile ? 1.5 : 1,
                  fontSize: isMobile ? '0.9rem' : 'inherit',
                  minWidth: isMobile ? 0 : 'inherit',
                  flexGrow: isMobile ? 1 : 'inherit',
                }
              }}
              textColor="inherit"
              indicatorColor="secondary"
              variant={isMobile ? "fullWidth" : "standard"}
            >
              <Tab label="Cut Pieces" id="cutlist-tab-0" />
              <Tab label="Stock Material" id="cutlist-tab-1" />
              <Tab label="Materials" id="cutlist-tab-2" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center" flexDirection={isMobile ? 'column' : 'row'} gap={isMobile ? 2 : 0}>
              <Typography variant="h6">Cut Pieces</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={addCutPiece}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
              >
                Add Cut Piece
              </Button>
            </Box>
            
            {isMobile ? (
              // Mobile card layout for cut pieces
              <Stack spacing={2}>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    size="large" 
                    startIcon={<AddIcon />}
                    onClick={addCutPiece}
                    sx={{ py: 1.5 }}
                  >
                    Add New Part
                  </Button>
                </Box>
                
                {/* Floating action button for Cut Pieces tab */}
                {tabValue === 0 && (
                  <FloatingActionButton onClick={addCutPiece} color="success" />
                )}
                
                {data.cutPieces.map(piece => (
                  <Card key={piece.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box sx={{ gridColumn: '1 / span 2' }}>
                          <TextField
                            label="Name"
                            value={piece.name || ''}
                            onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label={`Length (${data.unit})`}
                            value={piece.length}
                            onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label={`Width (${data.unit})`}
                            value={piece.width}
                            onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label="Quantity"
                            value={piece.quantity}
                            onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => removeCutPiece(piece.id)}
                            fullWidth
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              // Desktop table layout for cut pieces
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Length ({data.unit})</TableCell>
                      <TableCell>Width ({data.unit})</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.cutPieces.map(piece => (
                      <TableRow key={piece.id}>
                        <TableCell>
                          <TextField
                            value={piece.name || ''}
                            onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                            variant="standard"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.length}
                            onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.width}
                            onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.quantity}
                            onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => removeCutPiece(piece.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center" flexDirection={isMobile ? 'column' : 'row'} gap={isMobile ? 2 : 0}>
              <Typography variant="h6">Stock Material</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={addStockPiece}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
              >
                Add Stock Piece
              </Button>
            </Box>
            
            {isMobile ? (
              // Mobile card layout for stock pieces
              <Stack spacing={2}>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={addStockPiece}
                    sx={{ py: 1.5 }}
                  >
                    Add New Stock
                  </Button>
                </Box>
                
                {/* Floating action button for Stock Material tab */}
                {tabValue === 1 && (
                  <FloatingActionButton onClick={addStockPiece} color="success" />
                )}
                
                {data.stockPieces.map(piece => (
                  <Card key={piece.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box sx={{ gridColumn: '1 / span 2' }}>
                          <TextField
                            label="Material"
                            value={piece.material || ''}
                            onChange={(e) => handleStockPieceChange(piece.id, 'material', e.target.value)}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label={`Length (${data.unit})`}
                            value={piece.length}
                            onChange={(e) => handleStockPieceChange(piece.id, 'length', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label={`Width (${data.unit})`}
                            value={piece.width}
                            onChange={(e) => handleStockPieceChange(piece.id, 'width', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box>
                          <TextField
                            label="Quantity"
                            value={piece.quantity}
                            onChange={(e) => handleStockPieceChange(piece.id, 'quantity', e.target.value)}
                            variant="outlined"
                            type="number"
                            fullWidth
                            margin="dense"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => removeStockPiece(piece.id)}
                            fullWidth
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              // Desktop table layout for stock pieces
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>Length ({data.unit})</TableCell>
                      <TableCell>Width ({data.unit})</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.stockPieces.map(piece => (
                      <TableRow key={piece.id}>
                        <TableCell>
                          <TextField
                            value={piece.material || ''}
                            onChange={(e) => handleStockPieceChange(piece.id, 'material', e.target.value)}
                            variant="standard"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.length}
                            onChange={(e) => handleStockPieceChange(piece.id, 'length', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.width}
                            onChange={(e) => handleStockPieceChange(piece.id, 'width', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={piece.quantity}
                            onChange={(e) => handleStockPieceChange(piece.id, 'quantity', e.target.value)}
                            variant="standard"
                            type="number"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => removeStockPiece(piece.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Box mb={2}>
              <Typography variant="h6">Materials</Typography>
            </Box>
            
            {isMobile ? (
              // Mobile card layout for materials
              <Stack spacing={2}>
                {data.materials.map(material => (
                  <Card key={material.id} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">{material.name}</Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">Type:</Typography>
                        <Typography variant="body2">{material.type}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">Thickness:</Typography>
                        <Typography variant="body2">{material.thickness} {data.unit}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              // Desktop table layout for materials
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Thickness ({data.unit})</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.materials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>{material.type}</TableCell>
                        <TableCell>{material.thickness}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Paper>
        
        <Box mt={4} p={3} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="h6" gutterBottom>Demo Information</Typography>
          <Typography variant="body1">
            This is a standalone demo page showing how the cutting list editor would look with your data.
            Changes made here are not saved to a database and will be reset if you refresh the page.
          </Typography>
          <Box mt={2}>
            <Typography variant="subtitle1">Original OCR Text:</Typography>
            <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.default', overflow: 'auto', maxHeight: isMobile ? '200px' : '400px' }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {sampleOcrText}
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default CutlistDemo;
