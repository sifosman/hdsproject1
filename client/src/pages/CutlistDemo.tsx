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
  material?: string;
  separator?: boolean;
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
  // Debug - log the original OCR text
  console.log('OCR text to parse:', ocrText);

  const cutPieces: CutPiece[] = [];
  const stockPieces: StockPiece[] = [];
  const materials: Material[] = [];
  let currentMaterial: string | null = null; // No default material - will be determined from the content
  let materialSections: Set<string> = new Set();
  let materialChanged = false;
  
  // Define known material headers to match against
  const knownMaterials = [
    { key: 'white melamme', value: 'White Melamine' },
    { key: 'white melamine', value: 'White Melamine' },
    { key: 'doors', value: 'Doors' },
    { key: 'door', value: 'Doors' },
    { key: 'white messonite', value: 'White Messonite' },
    { key: 'messonite', value: 'White Messonite' },
    { key: 'color melamine', value: 'Color Melamine' },
    { key: 'colour melamine', value: 'Color Melamine' },
  ];
  
  // We'll detect materials from the content instead of pre-setting a default
  
  // Split by lines
  const lines = ocrText.split('\n');
  
  // Log the detected OCR text and lines for debugging
  console.log('OCR Text Lines:', lines.length, 'lines');
  console.log('OCR Text Content:', lines);
  
  // First pass: identify materials and create pieces
  for (const line of lines) {
    // Check if this line defines a material (explicit with colon or implicit as standalone word)
    const cleanLine = line.toLowerCase().trim();
    
    if (!cleanLine) {
      // Skip empty lines
      continue;
    }
    
    let materialChanged = false;
    
    // Case 1: Line has explicit 'cutlist:' format
    if (cleanLine.includes('cutlist:')) {
      const materialName = line.split(':')[1]?.trim();
      if (materialName) {
        const normalizedMaterial = normalizeMaterialName(materialName, knownMaterials);
        console.log('Found material (cutlist format):', materialName, '→', normalizedMaterial);
        addNewMaterial(normalizedMaterial, materials);
        // Add separator for this new material if we haven't seen it before
        if (!materialSections.has(normalizedMaterial)) {
          addSeparatorForMaterial(normalizedMaterial, cutPieces, materialSections);
          console.log('Added separator for material:', normalizedMaterial);
        }
        currentMaterial = normalizedMaterial;
        materialChanged = true;
      }
      continue;
    }
    
    // Case 2: Check if line is just a material header (no measurements)
    // A line is likely a material header if it doesn't contain measurement indicators
    if (!cleanLine.includes('x') && !cleanLine.includes('×') && !cleanLine.includes('=') && !cleanLine.includes('-')) {
      console.log('Checking if line is a material header:', cleanLine);
      
      // Case 2a: Handle standalone number (like "470")
      if (/^\d+$/.test(cleanLine)) {
        console.log('Found standalone number:', cleanLine, 'treating as potential dimension');
        // This could be a partial dimension that goes with a previous or next line
        // Let's skip for now, may need to handle differently in the future
        continue;
      }
      
      // Case 2b: Check against known material headers
      let foundMaterialHeader = false;
      for (const material of knownMaterials) {
        if (cleanLine.includes(material.key)) {
          console.log('Found material header:', material.key, '→', material.value);
          addNewMaterial(material.value, materials);
          // Add separator for this new material if we haven't seen it before
          if (!materialSections.has(material.value)) {
            addSeparatorForMaterial(material.value, cutPieces, materialSections);
            console.log('Added separator for material:', material.value);
          }
          currentMaterial = material.value;
          materialChanged = true;
          foundMaterialHeader = true;
          break;
        }
      }
      
      // Case 2c: Treat unknown words without measurements as potential material headers
      if (!foundMaterialHeader && cleanLine.length > 2 && isNaN(Number(cleanLine))) {
        console.log('Found potential unlisted material header:', cleanLine);
        const capitalizedMaterial = cleanLine.replace(/\b\w/g, c => c.toUpperCase());
        addNewMaterial(capitalizedMaterial, materials);
        if (!materialSections.has(capitalizedMaterial)) {
          addSeparatorForMaterial(capitalizedMaterial, cutPieces, materialSections);
          console.log('Added separator for unlisted material:', capitalizedMaterial);
        }
        currentMaterial = capitalizedMaterial;
        materialChanged = true;
        foundMaterialHeader = true;
      }
      
      // Only continue if we found a material header
      if (foundMaterialHeader) {
        continue;
      }
    }
    
    // Parse dimension lines - expanded regex to catch more variants
    // This handles formats like: 960X140=6, 360x140-8, 997×470=2, 197×7=4, etc.
    const regex = /(\d+)\s*[xX\u00d7]\s*(\d+)\s*[=\-]?\s*(\d+)?/;
    const match = line.match(regex);
    
    if (match) {
      // If we haven't found any material yet, create a default material section
      if (currentMaterial === null) {
        currentMaterial = 'Material Section 1';
        console.log('No material detected yet, creating default material section:', currentMaterial);
        addNewMaterial(currentMaterial, materials);
        addSeparatorForMaterial(currentMaterial, cutPieces, materialSections);
      }
      
      console.log('Found measurement in line:', line, 'Associating with material:', currentMaterial);
      const length = parseInt(match[1]);
      const width = parseInt(match[2]);
      let quantity = 1; // Default
      
      // Extract quantity from after the = or - sign if present
      console.log('Attempting to extract quantity from:', line);
      console.log('Regex match groups:', match[1], match[2], match[3]);
      
      // First try the captured group from the main regex
      if (match[3] && !isNaN(parseInt(match[3]))) {
        quantity = parseInt(match[3]);
        console.log(`SUCCESS: Extracted quantity ${quantity} from match group 3`);
      } else {
        // Try alternative patterns for quantity extraction
        console.log('Match group 3 not available, trying alternative patterns');
        
        // Pattern 1: Look for =number or -number
        const quantityMatch = line.match(/[=\-]\s*(\d+)/);
        if (quantityMatch && quantityMatch[1]) {
          quantity = parseInt(quantityMatch[1]);
          console.log(`SUCCESS: Extracted quantity ${quantity} using =number pattern, value: ${quantityMatch[1]}`);
        } else {
          // Pattern 2: Try to find any number at the end of the line
          const endNumberMatch = line.match(/\s(\d+)\s*$/);
          if (endNumberMatch && endNumberMatch[1]) {
            quantity = parseInt(endNumberMatch[1]);
            console.log(`SUCCESS: Extracted quantity ${quantity} from end of line`);
          } else {
            console.log('FAILED: Could not extract quantity, using default:', quantity);
          }
        }
      }
      
      // Create a name for the piece based on dimensions
      const pieceName = `${length}x${width}`;
      
      // Determine if this is likely a stock piece or cut piece based on size
      if (length >= 2000 || width >= 1000) {
        stockPieces.push({
          id: uuidv4(),
          length,
          width,
          quantity,
          material: currentMaterial,
          name: `${pieceName} (${currentMaterial})`
        });
        console.log('Added stock piece:', pieceName, 'with material:', currentMaterial);
      } else {
        console.log(`Creating cut piece with dimensions ${length}x${width} and quantity ${quantity}`);
        
        const cutPiece = {
          id: `cp-${Date.now()}-${cutPieces.length}-${Math.random().toString(36).substr(2, 8)}`,
          name: pieceName,
          material: currentMaterial,
          length,
          width,
          quantity, // Ensure this is the correct quantity we extracted
          separator: false
        };
        
        console.log('Final cut piece object before pushing:', cutPiece);
        cutPieces.push(cutPiece);
        console.log('Added cut piece:', pieceName, 'with material:', currentMaterial);
      }
    }
  }
  
  // Helper function to add separator for a material
  function addSeparatorForMaterial(materialName: string, pieces: CutPiece[], sections: Set<string>) {
    pieces.push({
      id: uuidv4(),
      name: materialName,
      separator: true,
      material: materialName,
      // Add default values for required fields
      width: 0,
      length: 0,
      quantity: 0
    });
    sections.add(materialName);
  }
  
  // If no materials were detected, add the default one
  if (materials.length === 0) {
    materials.push({
      id: uuidv4(),
      name: 'White Melamine',
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
  
  // Debug - log the final results
  console.log('Final parsed data:');
  console.log('- Materials:', materials);
  console.log('- Cut Pieces:', cutPieces.length, 'pieces', cutPieces.filter(p => !p.separator).length, 'non-separator pieces');
  console.log('- Material Sections:', materialSections);
  console.log('- Separator pieces:', cutPieces.filter(p => p.separator).length);
  
  const result = {
    cutPieces,
    stockPieces,
    materials,
    unit: 'mm'
  };
  
  return result;
};

// Helper function to normalize material names
function normalizeMaterialName(name: string, knownMaterials: {key: string; value: string}[]): string {
  const cleanName = name.toLowerCase().trim();
  for (const material of knownMaterials) {
    if (cleanName.includes(material.key)) {
      return material.value;
    }
  }
  return name; // Return original if no match
}

// Helper function to add new material if it doesn't exist yet
function addNewMaterial(materialName: string, materials: Material[]): void {
  if (!materials.some(m => m.name === materialName)) {
    materials.push({
      id: uuidv4(),
      name: materialName,
      type: 'board',
      thickness: 16 // Default thickness
    });
  }
}

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
