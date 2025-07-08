import React, { useState, useEffect } from 'react';
import { getMaterialOptions, optimizeCutting, getPdfUrl, getProductPricing, getAllProductDescriptions } from '../services/api';
import * as botsailorService from '../services/botsailor';
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
  Grid,
  Checkbox,
  FormControlLabel
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
  const [message, setMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Material options from API
  const [materialData, setMaterialData] = useState<any>(DEFAULT_MATERIAL_DATA);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [productDescriptions, setProductDescriptions] = useState<string[]>([]);
  const [materialDescriptions, setMaterialDescriptions] = useState<Record<string, string[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(true);
  
  // State for managing material selections for each section
  interface SectionMaterial {
    category?: string;
    colorFamily?: string;
    decorPattern?: string;
    surfacePattern?: string;
    materialDescription?: string;
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
    async function fetchOptions() {
      setLoadingMaterials(true);
      try {
        const [optionsResult, descriptions] = await Promise.all([
          getMaterialOptions(),
          getAllProductDescriptions(),
        ]);

        if (optionsResult.success && optionsResult.options) {
          setMaterialData(optionsResult.options);
          setMaterialCategories(Object.keys(optionsResult.options));
        } else {
          console.error('Failed to get material options:', optionsResult.error);
          setMaterialData(DEFAULT_MATERIAL_DATA); // fallback
          setMaterialCategories(DEFAULT_MATERIAL_CATEGORIES);
        }

        setProductDescriptions(descriptions);

      } catch (error) {
        console.error('Error fetching material data:', error);
        setMaterialData(DEFAULT_MATERIAL_DATA); // fallback
        setMaterialCategories(DEFAULT_MATERIAL_CATEGORIES);
      } finally {
        setLoadingMaterials(false);
      }
    }
    fetchOptions();
  }, []);

  useEffect(() => {
    if (initialData) {
      const normalized = normalizeCutPieces(initialData.cutPieces || []);
      setCutPieces(normalized);
      setStockPieces(initialData.stockPieces || []);
      setMaterials(initialData.materials || []);
      setUnit(initialData.unit || 'mm');
      setCustomerName(initialData.customerName || '');
      setProjectName(initialData.projectName || '');
    }
  }, [initialData]);

  const handleCutPieceChange = (id: string, field: keyof CutPiece, value: any) => {
    setCutPieces(prevCutPieces =>
      prevCutPieces.map(piece =>
        piece.id === id ? { ...piece, [field]: value } : piece
      )
    );
  };

  const handleAddMaterialSection = () => {
    const newId = `separator-${Date.now()}`;
    setCutPieces(prevCutPieces => [
      ...prevCutPieces,
      {
        id: newId,
        separator: true,
        name: materialCategories[0] || 'New Material',
      },
    ]);
  };

  const handleAddCutPiece = (materialName?: string) => {
    const newId = `cp-${Date.now()}`;
    let targetMaterial = materialName;

    if (!targetMaterial) {
      // Find the last material section to add the piece to
      const lastSeparator = [...cutPieces].reverse().find(p => p.separator);
      targetMaterial = lastSeparator?.name || materialCategories[0] || 'New Material';
    }
    
    const newPiece: CutPiece = {
      id: newId,
      width: 500,
      length: 500,
      quantity: 1,
      name: 'New Piece',
      edging: 1,
      material: targetMaterial,
      lengthTick1: false,
      lengthTick2: false,
      widthTick1: false,
      widthTick2: false,
      separator: false,
    };

    // Find the correct index to insert the new piece
    let insertAtIndex = cutPieces.length;
    if (targetMaterial) {
        // Find the last piece of the same material
        const lastPieceInMaterialSectionIndex = cutPieces.map(p => p.material).lastIndexOf(targetMaterial);
        if (lastPieceInMaterialSectionIndex !== -1) {
            insertAtIndex = lastPieceInMaterialSectionIndex + 1;
        } else {
            // If no pieces of this material, find the separator and insert after it
            const separatorIndex = cutPieces.findIndex(p => p.separator && p.name === targetMaterial);
            if (separatorIndex !== -1) {
                insertAtIndex = separatorIndex + 1;
            }
        }
    }

    const updatedCutPieces = [...cutPieces];
    updatedCutPieces.splice(insertAtIndex, 0, newPiece);
    setCutPieces(updatedCutPieces);
  };

  const handleDeleteCutPiece = (id: string) => {
    setCutPieces(prevCutPieces => prevCutPieces.filter(piece => piece.id !== id));
  };

  const handleSave = () => {
    if (cutPieces.some(p => !p.separator && (!p.length || !p.width || !p.quantity))) {
      setSnackbarMessage('Please fill in all dimensions and quantity for each piece.');
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
      projectName,
    });
    setSnackbarMessage('Cutlist saved successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleOpenWhatsAppDialog = () => setWhatsappDialogOpen(true);
  const handleCloseWhatsAppDialog = () => setWhatsappDialogOpen(false);

  const handleSendWhatsApp = async () => {
    if (!onSendWhatsApp) return;

    if (!phoneNumber || !customerName) {
        setSnackbarMessage('Phone number and customer name are required.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
    }

    const dataToSend = { stockPieces, cutPieces, materials, unit, customerName, projectName };
    
    try {
        await onSendWhatsApp(phoneNumber, dataToSend, customerName, projectName);
        setSnackbarMessage('WhatsApp message sent successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        handleCloseWhatsAppDialog();
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        setSnackbarMessage('Failed to send WhatsApp message.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
    }
  };

  // Function to extract dimensions from product data
  const extractDimensions = (productData: any): { width: number; length: number; thickness: number } => {
    // Default values
    const defaultDimensions = { width: 2750, length: 1830, thickness: 16 };
    
    try {
      if (!productData) return defaultDimensions;
      
      // First priority: check if sizes field exists with format "LxWxT"
      if (productData.sizes && typeof productData.sizes === 'string') {
        const sizesParts = productData.sizes.split('x');
        if (sizesParts.length === 3) {
          return {
            length: parseInt(sizesParts[0], 10) || defaultDimensions.length,
            width: parseInt(sizesParts[1], 10) || defaultDimensions.width,
            thickness: parseInt(sizesParts[2], 10) || defaultDimensions.thickness
          };
        }
      }
      
      // Fallback to parsing from description
      if (productData && productData.description) {
        const description = productData.description;
        const dimensionPattern = /(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*mm/i;
        const match = description.match(dimensionPattern);
        
        if (match && match.length === 4) {
          return {
            length: parseInt(match[1], 10) || defaultDimensions.length,
            width: parseInt(match[2], 10) || defaultDimensions.width,
            thickness: parseInt(match[3], 10) || defaultDimensions.thickness
          };
        }
      }
      
      return defaultDimensions;
    } catch (error) {
      console.error('Error extracting dimensions:', error);
      return defaultDimensions;
    }
  };

  // Function to send cutlist data to the calculation tool
  const handleCalculate = async () => {
    // Validate data
    if (cutPieces.length === 0) {
      setSnackbarMessage('Please add cut pieces first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const invalidPiece = cutPieces.find(p => !p.separator && (!p.lengthTick1 || !p.lengthTick2));
    if (invalidPiece) {
      setSnackbarMessage('Please select both Length tick boxes for each cut piece.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!phoneNumber) {
      setSnackbarMessage('Please enter a phone number to receive the quotation');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      setWhatsappDialogOpen(true);
      return;
    }

    try {
      setSnackbarMessage('Calculating optimal cutting plan and generating quotation...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      // Get material names from the cutlist (from separators)
      const sections = getSections();
      const materialNames = sections.map(section => section.material);
      
      // Get pricing information for each material
      const pricingPromises = materialNames.map(materialName => 
        getProductPricing(materialName || 'White Melamine')
      );
      
      const pricingResults = await Promise.all(pricingPromises);
      
      // Create stock pieces based on material dimensions from description
      const newStockPieces: StockPiece[] = [];
      const materialPrices: Record<string, number> = {};
      
      pricingResults.forEach((result, index) => {
        if (result.success && result.data) {
          const materialName = materialNames[index] || 'White Melamine';
          const dimensions = extractDimensions(result.data);
          
          // Add stock piece with the dimensions
          newStockPieces.push({
            id: `stock-${Date.now()}-${index}`,
            length: dimensions.length,
            width: dimensions.width,
            quantity: 100, // Large quantity so optimizer can use as many as needed
            material: materialName
          });
          
          // Store price for later use
          materialPrices[materialName] = result.data.price || 0;
        }
      });
      
      // Organize cut pieces by material
      let quotationText = '';
      let totalPrice = 0;
      
      // Process each material section
      for (const section of sections) {
        const materialName = section.material || 'White Melamine';
        const materialCutPieces = cutPieces.filter(p => 
          !p.separator && p.material === materialName
        );
        
        // Skip if no cut pieces for this material
        if (materialCutPieces.length === 0) continue;
        
        // Find the stock piece for this material
        const stockPiece = newStockPieces.find(sp => sp.material === materialName);
        if (!stockPiece) continue;
        
        // Prepare data for optimizer
        const optimizerData = {
          cutPieces: materialCutPieces.map(p => ({
            id: p.id,
            width: p.width || 0,
            length: p.length || 0,
            quantity: p.quantity || 1,
            edging: p.edging || 0
          })),
          stockPieces: [stockPiece]
        };
        
        // Call optimizer
        const optimizerResult = await optimizeCutting(optimizerData);
        
        if (optimizerResult.success) {
          // Calculate price for this material
          const boardsNeeded = optimizerResult.data.boardsNeeded || 0;
          const materialPrice = materialPrices[materialName] || 0;
          const sectionPrice = boardsNeeded * materialPrice;
          totalPrice += sectionPrice;
          
          // Build quotation text
          quotationText += `\n*${materialName}*\n`;
          quotationText += `- Boards needed: ${boardsNeeded}\n`;
          quotationText += `- Price per board: R ${materialPrice.toFixed(2)}\n`;
          quotationText += `- Section total: R ${sectionPrice.toFixed(2)}\n`;
        }
      }
      
      // Add grand total to quotation
      quotationText = `*Quotation Summary*\n${quotationText}\n*Total Price: R ${totalPrice.toFixed(2)}*`;
      
      // Add customer and project info if available
      if (customerName) {
        quotationText = `Customer: ${customerName}\n${quotationText}`;
      }
      
      if (projectName) {
        quotationText = `Project: ${projectName}\n${quotationText}`;
      }
      
      // Generate PDF
      const pdfResult = await getPdfUrl({ content: quotationText, title: `Cutlist Quotation ${projectName || ''}` });
      let pdfUrl = '';
      
      if (pdfResult.success && pdfResult.data && pdfResult.data.url) {
        pdfUrl = pdfResult.data.url;
      }
      
      // Set message with quotation text
      setMessage(quotationText);
      
      // If WhatsApp integration is enabled and we have a phone number
      if (onSendWhatsApp && phoneNumber) {
        try {
          // Send the WhatsApp message with the PDF
          await botsailorService.sendWhatsAppMessage({
            to: phoneNumber,
            message: quotationText,
            pdfUrl: pdfUrl
          });
          
          setSnackbarMessage('Quotation sent successfully to WhatsApp');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        } catch (whatsappError) {
          console.error('WhatsApp sending error:', whatsappError);
          setSnackbarMessage('Failed to send WhatsApp message');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Error during calculation:', error);
      setSnackbarMessage('Failed to calculate cutting plan. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // This function finds all sections based on separator pieces
  const getSections = () => {
    const sections: { material: string, pieces: CutPiece[], headingIdx: number }[] = [];
    if (!cutPieces) return sections;

    let currentPieces: CutPiece[] = [];
    let currentMaterial: string | undefined;
    let currentHeadingIdx: number = -1;

    cutPieces.forEach((piece, idx) => {
      if (piece.separator) {
        if (currentMaterial !== undefined && currentHeadingIdx !== -1) {
          sections.push({ material: currentMaterial, pieces: currentPieces, headingIdx: currentHeadingIdx });
        }
        currentMaterial = piece.name || 'Unknown Material';
        currentHeadingIdx = idx;
        currentPieces = [];
      } else {
        currentPieces.push(piece);
      }
    });

    if (currentMaterial !== undefined && currentHeadingIdx !== -1) {
      sections.push({ material: currentMaterial, pieces: currentPieces, headingIdx: currentHeadingIdx });
    }
    return sections;
  };

  const sections = getSections();

  return (
    <Paper elevation={3}>
      {isMobile ? (
        // Mobile Card View
        <Box sx={{ p: 2 }}>
          {sections.map((section, sectionIdx) => (
            <Box key={`section-mobile-${sectionIdx}`} sx={{ mb: 3 }}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Material</InputLabel>
                    <Select
                        value={section.material}
                        onChange={(e) => {
                            const newMaterial = e.target.value;
                            const updatedPieces = [...cutPieces];
                            updatedPieces[section.headingIdx].name = newMaterial;
                            setCutPieces(updatedPieces);
                        }}
                        disabled={isConfirmed || loadingMaterials}
                    >
                        {loadingMaterials ? <MenuItem disabled>Loading...</MenuItem> : productDescriptions.map(description => (
                            <MenuItem key={description} value={description}>{description}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

              {section.pieces.map((piece, pieceIdx) => (
                <Paper key={piece.id} elevation={2} sx={{ p: 2, mb: 2 }}>
                  <TextField fullWidth label="Name" value={piece.name || ''} onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)} variant="outlined" size="small" sx={{ mb: 1.5 }} disabled={isConfirmed} />
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <TextField label={`Length (${unit})`} type="number" value={piece.length || ''} onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)} variant="outlined" size="small" disabled={isConfirmed} />
                    <TextField label={`Width (${unit})`} type="number" value={piece.width || ''} onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)} variant="outlined" size="small" disabled={isConfirmed} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick1} onChange={e => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)} disabled={isConfirmed} />} label="L1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick2} onChange={e => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)} disabled={isConfirmed} />} label="L2" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick1} onChange={e => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)} disabled={isConfirmed} />} label="W1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick2} onChange={e => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)} disabled={isConfirmed} />} label="W2" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2}}>
                    <TextField label="Quantity" type="number" value={piece.quantity || 1} onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)} variant="outlined" size="small" inputProps={{ min: 1 }} disabled={isConfirmed} />
                    <IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" disabled={isConfirmed}><DeleteIcon /></IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          ))}
          <Fab color="primary" aria-label="add cut piece" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => handleAddCutPiece()} disabled={isConfirmed}><AddIcon /></Fab>
        </Box>
      ) : (
        // Desktop Table View
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Cutlist</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleAddCutPiece()} disabled={isConfirmed}>Add Piece</Button>
              <Button variant="outlined" onClick={handleAddMaterialSection} disabled={isConfirmed}>Add Material</Button>
            </Box>
          </Box>
          <TableContainer component={Paper} elevation={2}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Length ({unit})</TableCell>
                  <TableCell>Width ({unit})</TableCell>
                  <TableCell align="center">L1</TableCell>
                  <TableCell align="center">L2</TableCell>
                  <TableCell align="center">W1</TableCell>
                  <TableCell align="center">W2</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cutPieces.map((piece, index) =>
                  piece.separator ? (
                    <TableRow key={piece.id}>
                      <TableCell colSpan={10} sx={{ backgroundColor: '#f0f0f0' }}>
                        <FormControl fullWidth size="small">
                            <Select
                                variant="standard"
                                value={piece.name}
                                onChange={(e) => {
                                    const newMaterial = e.target.value;
                                    const updatedPieces = [...cutPieces];
                                    updatedPieces[index].name = newMaterial;
                                    // also update material for all subsequent pieces until next separator
                                    for (let i = index + 1; i < updatedPieces.length; i++) {
                                        if (updatedPieces[i].separator) break;
                                        updatedPieces[i].material = newMaterial;
                                    }
                                    setCutPieces(updatedPieces);
                                }}
                                disabled={isConfirmed || loadingMaterials}
                            >
                                {loadingMaterials ? <MenuItem disabled>Loading...</MenuItem> : materialCategories.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={piece.id}>
                      <TableCell>{piece.material}</TableCell>
                      <TableCell><TextField size="small" variant="outlined" value={piece.name} onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)} disabled={isConfirmed} /></TableCell>
                      <TableCell><TextField size="small" variant="outlined" type="number" value={piece.length} onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)} disabled={isConfirmed} /></TableCell>
                      <TableCell><TextField size="small" variant="outlined" type="number" value={piece.width} onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)} disabled={isConfirmed} /></TableCell>
                      <TableCell align="center"><Checkbox checked={!!piece.lengthTick1} onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)} disabled={isConfirmed} /></TableCell>
                      <TableCell align="center"><Checkbox checked={!!piece.lengthTick2} onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)} disabled={isConfirmed} /></TableCell>
                      <TableCell align="center"><Checkbox checked={!!piece.widthTick1} onChange={(e) => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)} disabled={isConfirmed} /></TableCell>
                      <TableCell align="center"><Checkbox checked={!!piece.widthTick2} onChange={(e) => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)} disabled={isConfirmed} /></TableCell>
                      <TableCell><TextField size="small" variant="outlined" type="number" value={piece.quantity} onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)} disabled={isConfirmed} /></TableCell>
                      <TableCell><IconButton onClick={() => handleDeleteCutPiece(piece.id)} color="error" disabled={isConfirmed}><DeleteIcon /></IconButton></TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" color="primary" onClick={handleSave} disabled={isConfirmed}>Save Cutlist</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleCalculate}
        >
          Confirm Cutlist
        </Button>
        {onSendWhatsApp && (
          <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={handleOpenWhatsAppDialog}>
            Send to WhatsApp
          </Button>
        )}
      </Box>

      <Dialog open={whatsappDialogOpen} onClose={handleCloseWhatsAppDialog}>
        <DialogTitle>Send Cutlist to WhatsApp</DialogTitle>
        <DialogContent>
          <TextField label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth margin="normal" />
          <TextField label="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWhatsAppDialog}>Cancel</Button>
          <Button onClick={handleSendWhatsApp} color="primary">Send</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default EditableCutlistTable;
