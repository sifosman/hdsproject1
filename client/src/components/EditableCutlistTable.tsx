import React, { useState, useEffect } from 'react';
import { getMaterialOptions } from '../services/api';
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
  useTheme,
  Grid
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
  
  // Default material options as fallback
  const DEFAULT_MATERIAL_CATEGORIES = [
    "White Melamine",
    "Color Melamine",
    "Doors", 
    "White Messonite"
  ];
  
  // Default fallback material data structure
  const DEFAULT_MATERIAL_DATA = {
    "White Melamine": { "White": { "Solid": ["Smooth"] } },
    "White Messonite": { "White": { "Solid": ["Smooth"] } },
    "Color Melamine": { "Neutral": { "Solid": ["Smooth"] } },
    "Doors": { "Neutral": { "Solid": ["Smooth"] } }
  };
  
  // State for the component
  const [cutPieces, setCutPieces] = useState<CutPiece[]>(normalizeCutPieces(initialData?.cutPieces || []));
  const [stockPieces, setStockPieces] = useState<StockPiece[]>(initialData?.stockPieces || []);
  const [materials, setMaterials] = useState<Material[]>(initialData?.materials || []);
  const [unit, setUnit] = useState<string>(initialData?.unit || 'mm');
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || '');
  const [projectName, setProjectName] = useState<string>(initialData?.projectName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Material options from API
  const [materialData, setMaterialData] = useState<any>(DEFAULT_MATERIAL_DATA);
  const [materialCategories, setMaterialCategories] = useState<string[]>(DEFAULT_MATERIAL_CATEGORIES);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(true);
  
  // State for managing material selections for each section
  interface SectionMaterial {
    category?: string;
    colorFamily?: string;
    decorPattern?: string;
    surfacePattern?: string;
  }

  const [sectionMaterials, setSectionMaterials] = useState<Record<number, SectionMaterial>>({});
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
    let currentMaterial = DEFAULT_MATERIAL_CATEGORIES[0];
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
        name: DEFAULT_MATERIAL_CATEGORIES[0],
        separator: true,
      });
      return normalized;
    }

    // Add first material heading if not already the first item
    let currentIndex = 0;
    if (!materialRows.has(0)) {
      normalized.push({
        id: `sep-0-${Date.now()}`,
        name: DEFAULT_MATERIAL_CATEGORIES[0],
        separator: true,
      });
      currentMaterial = DEFAULT_MATERIAL_CATEGORIES[0];
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
  // Safe version of initial data for reference
  const safeInitialData: CutlistData = {
    stockPieces: initialData?.stockPieces || [],
    cutPieces: normalizeCutPieces(initialData?.cutPieces || []),
    materials: initialData?.materials || [],
    unit: initialData?.unit || 'mm',
    customerName: initialData?.customerName || '',
    projectName: initialData?.projectName || '',
  };
  
  // Fetch material options from API on component mount
  useEffect(() => {
    fetchMaterialOptions();
  }, []);
  
  async function fetchMaterialOptions() {
    setLoadingMaterials(true);
    try {
      // Call API to get material options
      const options = await getMaterialOptions();
      
      if (options && options.categories && options.materialData) {
        setMaterialData(options.materialData);
        setMaterialCategories(options.categories);
        console.log('Material data loaded from API:', options.materialData);
        
        // Initialize section materials with defaults for existing sections
        const initialSections: Record<number, SectionMaterial> = {};
        cutPieces.forEach((piece, idx) => {
          if (piece.separator) {
            const materialName = piece.name || '';
            let category = '';
            
            // Determine the category from the piece name
            for (const heading of materialHeadings) {
              if (materialName.toLowerCase().includes(heading.key)) {
                category = heading.value;
                break;
              }
            }
            
            if (category && options.materialData[category]) {
              const colorFamilies = Object.keys(options.materialData[category]);
              if (colorFamilies.length > 0) {
                // Default to White for White Melamine/Messonite, otherwise first color
                const defaultColor = (category === "White Melamine" || category === "White Messonite") ? 
                  "White" : colorFamilies[0];
                  
                const decorPatterns = Object.keys(options.materialData[category][defaultColor]);
                if (decorPatterns.length > 0) {
                  initialSections[idx] = {
                    category,
                    colorFamily: defaultColor,
                    decorPattern: decorPatterns[0],
                    surfacePattern: options.materialData[category][defaultColor][decorPatterns[0]][0]
                  };
                }
              }
            }
          }
        });
        
        setSectionMaterials(initialSections);
      } else {
        console.warn('API returned incomplete material data, using defaults');
        // Use defaults as fallback
        setMaterialData(DEFAULT_MATERIAL_DATA);
        setMaterialCategories(DEFAULT_MATERIAL_CATEGORIES);
      }
    } catch (error) {
      console.error('Error fetching material options:', error);
      // Fall back to default options
      setMaterialData(DEFAULT_MATERIAL_DATA);
      setMaterialCategories(DEFAULT_MATERIAL_CATEGORIES);
    } finally {
      setLoadingMaterials(false);
    }
  }

  useEffect(() => {
    if (initialData) {
      setCutPieces(normalizeCutPieces(initialData.cutPieces || []));
      setStockPieces(initialData.stockPieces);
      setMaterials(initialData.materials);
      setUnit(initialData.unit || 'mm');
      setCustomerName(initialData.customerName || '');
      setProjectName(initialData.projectName || '');
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
    setCutPieces(prevCutPieces => prevCutPieces.map(piece => 
      piece.id === id ? { 
        ...piece, 
        [field]: field === 'quantity' ? parseInt(value) : field === 'name' ? value : parseFloat(value) 
      } : piece
    ));
  };

  const handleAddCutPiece = () => {
    const newId = `cp-${Date.now()}`;
    setCutPieces(prevCutPieces => [
      ...prevCutPieces,
      {
        id: newId,
        width: 500,
        length: 500,
        quantity: 1,
        name: `Cut Piece ${prevCutPieces.length + 1}`,
        edging: 1,
        material: materialCategories[0],
      }
    ]);
  };

  const handleDeleteCutPiece = (id: string) => {
    setCutPieces(prevCutPieces => prevCutPieces.filter(piece => piece.id !== id));
  };

  const handleSave = () => {
    // Validate data
    if (cutPieces.length === 0) {
      setSnackbarMessage('You need at least one cut piece');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    // Require both Length tick boxes for each cut piece (not separator)
    const invalidPiece = cutPieces.find(p => !p.separator && (!p.lengthTick1 || !p.lengthTick2));
    if (invalidPiece) {
      setSnackbarMessage('Please select both Length tick boxes for each cut piece.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    onSave({
      stockPieces,
      cutPieces,
      materials,
      unit,
      customerName,
      projectName
    });
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
      onSendWhatsApp(phoneNumber, {
        stockPieces,
        cutPieces,
        materials,
        unit,
        customerName,
        projectName
      }, customerName, projectName);
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
              Cut Pieces ({unit})
            </Typography>
          </Box>
          {/* Group cards by material sections based on separators */}
          {(() => {
            // Find all section boundaries (separator headings)
            const sections: { material: string, pieces: CutPiece[], headingIdx: number }[] = [];
            let currentMaterial = materialCategories[0];
            let currentPieces: CutPiece[] = [];
            let headingIdx = 0;
            let separatorId = '';
            
            cutPieces.forEach((piece, idx) => {
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
                currentMaterial = piece.name || materialCategories[0];
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
                        setCutPieces(prevCutPieces => prevCutPieces.map((p, idx) => {
                          // If this is the separator for this section, update its name
                          if (p.separator && idx === section.headingIdx) {
                            return { ...p, name: newMaterial };
                          }
                          // If this is a cut piece in this section, update its material
                          if (section.pieces.some(sp => sp.id === p.id)) {
                            return { ...p, material: newMaterial };
                          }
                          return p;
                        }));
                        
                        // Reset section materials when category changes
                        setSectionMaterials(prev => {
                          const updated = {...prev};
                          delete updated[sectionIdx];
                          return updated;
                        });
                      }}
                      disabled={isConfirmed || loadingMaterials}
                    >
                      {loadingMaterials ? (
                        <MenuItem disabled>Loading materials...</MenuItem>
                      ) : (
                        materialCategories.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Box>
                
                {/* Cascading material selection dropdowns */}
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    {/* Color Family Dropdown */}
                    {section.material && materialData[section.material] && (
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Color Family</InputLabel>
                          <Select
                            value={sectionMaterials[sectionIdx]?.colorFamily || (section.material === "White Melamine" || section.material === "White Messonite" ? "White" : Object.keys(materialData[section.material])[0])}
                            onChange={(e) => {
                              const colorFamily = e.target.value;
                              // Update section materials state with new selection and reset dependent fields
                              setSectionMaterials(prev => ({
                                ...prev,
                                [sectionIdx]: {
                                  category: section.material,
                                  colorFamily: colorFamily,
                                  // Reset dependent fields
                                  decorPattern: undefined,
                                  surfacePattern: undefined
                                }
                              }));
                              
                              // Generate description for section name
                              const description = `${section.material} - ${colorFamily}`;
                              
                              // Update the name of pieces in this section
                              setCutPieces(prevCutPieces => prevCutPieces.map((p, idx) => {
                                // If this is the separator for this section, update its name
                                if (p.separator && idx === section.headingIdx) {
                                  return { ...p, name: description };
                                }
                                // Update material for all pieces in this section
                                if (section.pieces.some(sp => sp.id === p.id)) {
                                  return { ...p, material: description };
                                }
                                return p;
                              }));
                            }}
                            disabled={isConfirmed || loadingMaterials}
                          >
                            {materialData[section.material] && Object.keys(materialData[section.material]).map(color => (
                              <MenuItem key={color} value={color}>{color}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    
                    {/* Decor Pattern Dropdown */}
                    {section.material && 
                     materialData[section.material] && 
                     sectionMaterials[sectionIdx]?.colorFamily && 
                     materialData[section.material][sectionMaterials[sectionIdx].colorFamily] && (
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Decor Pattern</InputLabel>
                          <Select
                            value={sectionMaterials[sectionIdx]?.decorPattern || Object.keys(materialData[section.material][sectionMaterials[sectionIdx].colorFamily])[0]}
                            onChange={(e) => {
                              const decorPattern = e.target.value;
                              // Update section materials state
                              setSectionMaterials(prev => ({
                                ...prev,
                                [sectionIdx]: {
                                  ...prev[sectionIdx],
                                  decorPattern: decorPattern,
                                  // Reset dependent fields
                                  surfacePattern: undefined
                                }
                              }));
                              
                              // Generate description for section name
                              const colorFamily = sectionMaterials[sectionIdx].colorFamily;
                              const description = `${section.material} - ${colorFamily} ${decorPattern}`;
                              
                              // Update the name of pieces in this section
                              setCutPieces(prevCutPieces => prevCutPieces.map((p, idx) => {
                                // If this is the separator for this section, update its name
                                if (p.separator && idx === section.headingIdx) {
                                  return { ...p, name: description };
                                }
                                // Update material for all pieces in this section
                                if (section.pieces.some(sp => sp.id === p.id)) {
                                  return { ...p, material: description };
                                }
                                return p;
                              }));
                            }}
                            disabled={isConfirmed || loadingMaterials}
                          >
                            {materialData[section.material][sectionMaterials[sectionIdx].colorFamily] && 
                             Object.keys(materialData[section.material][sectionMaterials[sectionIdx].colorFamily]).map(pattern => (
                              <MenuItem key={pattern} value={pattern}>{pattern}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    
                    {/* Surface Pattern Dropdown */}
                    {section.material && 
                      sectionMaterials[sectionIdx]?.colorFamily && 
                      sectionMaterials[sectionIdx]?.decorPattern && 
                      materialData[section.material]?.[sectionMaterials[sectionIdx].colorFamily]?.[sectionMaterials[sectionIdx].decorPattern] && (
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Surface Pattern</InputLabel>
                          <Select
                            value={sectionMaterials[sectionIdx]?.surfacePattern || materialData[section.material][sectionMaterials[sectionIdx].colorFamily][sectionMaterials[sectionIdx].decorPattern][0]}
                            onChange={(e) => {
                              const surfacePattern = e.target.value;
                              // Update section materials state
                              setSectionMaterials(prev => ({
                                ...prev,
                                [sectionIdx]: {
                                  ...prev[sectionIdx],
                                  surfacePattern: surfacePattern
                                }
                              }));
                              
                              // Generate description for section name
                              const { colorFamily, decorPattern } = sectionMaterials[sectionIdx];
                              const description = `${section.material} - ${colorFamily} ${decorPattern} (${surfacePattern})`;
                              
                              // Update the name of pieces in this section
                              setCutPieces(prevCutPieces => prevCutPieces.map((p, idx) => {
                                // If this is the separator for this section, update its name
                                if (p.separator && idx === section.headingIdx) {
                                  return { ...p, name: description };
                                }
                                // Update material for all pieces in this section
                                if (section.pieces.some(sp => sp.id === p.id)) {
                                  return { ...p, material: description };
                                }
                                return p;
                              }));
                            }}
                            disabled={isConfirmed || loadingMaterials}
                          >
                            {materialData[section.material][sectionMaterials[sectionIdx].colorFamily][sectionMaterials[sectionIdx].decorPattern].map((pattern: string) => (
                              <MenuItem key={pattern} value={pattern}>{pattern}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                  
                  {/* Display current material selection description */}
                  {section.material && (
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                      {section.material}
                      {sectionMaterials[sectionIdx]?.colorFamily && ` - ${sectionMaterials[sectionIdx].colorFamily}`}
                      {sectionMaterials[sectionIdx]?.decorPattern && ` ${sectionMaterials[sectionIdx].decorPattern}`}
                      {sectionMaterials[sectionIdx]?.surfacePattern && ` (${sectionMaterials[sectionIdx].surfacePattern})`}
                    </Typography>
                  )}
                </Box>
            
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
