import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCT_DESCRIPTIONS } from '../data/productDescriptions';
import { getMaterialOptions, optimizeCutting, getPdfUrl, getProductPricing, getAllProductDescriptions, generateQuote } from '../services/api';
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
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
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
  rawText?: string; // OCR text for direct parsing
}

interface EditableCutlistTableProps {
  initialData: CutlistData;
  onSave: (data: CutlistData) => void;
  onSendWhatsApp?: (phoneNumber: string, data: CutlistData, customerName?: string, projectName?: string) => void;
  isMobile?: boolean;
  isConfirmed?: boolean;
  branchData?: any | null;
  requireMaterialValidation?: boolean;
}

const EditableCutlistTable: React.FC<EditableCutlistTableProps> = ({ 
  initialData, 
  onSave,
  onSendWhatsApp,
  isMobile,
  isConfirmed,
  branchData,
  requireMaterialValidation = false
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
  
  // ------------------------------------------------------------------
  // Material headings and helper arrays MUST be declared BEFORE they are
  // referenced by normalizeCutPieces(). Declaring them here avoids the
  // "Cannot access '<var>' before initialization" runtime error.
  // Function to directly parse OCR text and extract dimensions and materials
  const parseOcrText = (ocrText: string | undefined): { dimensions: any[], materials: string[] } => {
    if (!ocrText) return { dimensions: [], materials: [] };
    
    const dimensions: any[] = [];
    const materials: string[] = [];
    let currentMaterial = DEFAULT_MATERIAL_CATEGORIES[0];
    
    // Split OCR text into lines
    const lines = ocrText.split('\n').filter(line => line.trim() !== '');
    console.log(`Parsing ${lines.length} lines of OCR text`);
    
    // Look for material headings and dimensions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`Processing line: "${line}"`);
      
      // Check if this is a material heading
      let isMaterialHeading = false;
      for (const heading of materialHeadings) {
        if (line.toLowerCase().includes(heading.key.toLowerCase())) {
          // This looks like a material heading
          if (!line.match(/\d+\s*[xX×*]\s*\d+/)) { // No dimensions in this line
            currentMaterial = heading.value;
            if (!materials.includes(currentMaterial)) {
              materials.push(currentMaterial);
              console.log(`Found material heading: ${currentMaterial}`);
            }
            isMaterialHeading = true;
            break;
          }
        }
      }
      
      if (isMaterialHeading) continue;
      
      // Try to extract dimensions
      const dimensionMatch = line.match(/(\d+)\s*[xX×*]\s*(\d+)/);
      if (dimensionMatch) {
        const width = parseInt(dimensionMatch[1]);
        const length = parseInt(dimensionMatch[2]);
        
        // Extract quantity if present
        let quantity = 1;
        const quantityMatch = line.match(/[=\-]\s*(\d+)/) || line.match(/\(\s*(\d+)\s*\)/) || line.match(/\d+\s*[xX×*]\s*\d+\s+(\d+)\b/);
        if (quantityMatch) {
          quantity = parseInt(quantityMatch[1]);
        }
        
        dimensions.push({
          id: `dim-${Date.now()}-${dimensions.length}`,
          width,
          length,
          quantity,
          material: currentMaterial,
          description: line // Store the original line for reference
        });
        
        console.log(`Added dimension: ${width}x${length}, qty=${quantity}, material=${currentMaterial}`);
      }
    }
    
    // Make sure we have at least one material
    if (materials.length === 0) {
      materials.push(DEFAULT_MATERIAL_CATEGORIES[0]);
    }
    
    return { dimensions, materials };
  };
  
  // Function to extract quantity from description field
  const extractQuantityFromDescription = (description: string | undefined): number | null => {
    if (!description) return null;
    
    // Array of regex patterns to extract quantity from description
    const patterns = [
      // Format: "2000x 460=2" or "918x460=4" (with equals sign)
      /\s*[xX×*]\s*\d+\s*=\s*(\d+)/,
      
      // Format: "360x140-8" (with dash)
      /\s*[xX×*]\s*\d+\s*-\s*(\d+)/,
      
      // Format: at the end of string after dimensions
      /\s*[xX×*]\s*\d+\s+(\d+)$/,
      
      // Format: parentheses (3)
      /\(\s*(\d+)\s*\)/,
      
      // Last resort: any number at the end
      /\s(\d+)$/
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const qty = parseInt(match[1], 10);
        if (!isNaN(qty) && qty > 0) {
          console.log(`Extracted quantity ${qty} from description: ${description}`);
          return qty;
        }
      }
    }
    
    return null;
  };
  
  // ------------------------------------------------------------------
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
  // ------------------------------------------------------------------

  // State for the component
  const [hasDirectlyParsed, setHasDirectlyParsed] = useState<boolean>(false);
  
  // State to track materials detected from OCR text
  const [detectedMaterials, setDetectedMaterials] = useState<string[]>([]);
  
  const [cutPieces, setCutPieces] = useState<CutPiece[]>(() => {
    // Check if we have raw OCR text to parse directly
    if (initialData.rawText && !hasDirectlyParsed) {
      console.log('Direct OCR parsing activated');
      const { dimensions, materials } = parseOcrText(initialData.rawText);
      
      // Save detected materials for later use
      if (materials.length > 0) {
        console.log(`Detected ${materials.length} materials from OCR text:`, materials);
        setDetectedMaterials(materials);
      }
      
      // If we got meaningful results from direct parsing, use those
      if (dimensions.length > 0) {
        console.log(`Directly parsed ${dimensions.length} dimensions from OCR text`);
        setHasDirectlyParsed(true);
        return normalizeCutPieces(dimensions);
      }
    }
    
    // Fallback to normal normalization
    return normalizeCutPieces(initialData.cutPieces || []);
  });
  const [stockPieces, setStockPieces] = useState<StockPiece[]>(initialData?.stockPieces || []);
  const [materials, setMaterials] = useState<Material[]>(initialData?.materials || []);
  const [unit, setUnit] = useState<string>(initialData?.unit || 'mm');
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || '');
  const [projectName, setProjectName] = useState<string>(initialData?.projectName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [quoteSuccessDialogOpen, setQuoteSuccessDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [successQuoteData, setSuccessQuoteData] = useState<{ quoteId: string; pdfUrl: string; phoneNumber?: string } | null>(null);
  const [message, setMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    // Add detailed logging for quantities
    console.log('===== QUANTITY DEBUGGING =====');
    rawPieces.forEach((piece, index) => {
      console.log(`Raw Piece ${index}: name=${piece.name || piece.description || 'unnamed'}, width=${piece.width}, length=${piece.length}, quantity=${piece.quantity}, type=${typeof piece.quantity}`);
    });

    const normalized: CutPiece[] = [];
    let currentMaterial = DEFAULT_MATERIAL_CATEGORIES[0];
    let materialSeen = new Set<string>();
    materialSeen.add(currentMaterial); // Always add the default material
    
    // We will skip rows that are detected as pure material headings so they are not
  // added twice (once as a separator and once as a normal cut-piece row)
  const headingRowIndexes = new Set<number>();
    
    for (let i = 0; i < rawPieces.length; i++) {
      const piece = rawPieces[i];
      // Clean the name for comparison - remove all non-alphanumeric chars
      const cleanName = (piece.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check each material heading for match
      for (const heading of materialHeadings) {
        const cleanHeading = heading.key.replace(/[^a-z0-9]/g, '');
        
        // If name contains the heading and has no measurements, it's likely a heading row
        // If the row looks like a pure material heading (no measurements)
        if (cleanName.includes(cleanHeading) && (!piece.width && !piece.length)) {
          headingRowIndexes.add(i);
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
    if (!headingRowIndexes.has(0)) {
      normalized.push({
        id: `sep-0-${Date.now()}`,
        name: DEFAULT_MATERIAL_CATEGORIES[0],
        separator: true,
      });
      currentMaterial = DEFAULT_MATERIAL_CATEGORIES[0];
    }

    // Process each piece
    for (let i = 0; i <rawPieces.length; i++) {
      const piece = rawPieces[i];

      // NEW: Inject separator based on explicit material field
      if (piece.material && !materialSeen.has(piece.material)) {
        normalized.push({
          id: `separator-${Date.now()}-${i}`,
          separator: true,
          name: piece.material,
        });
        materialSeen.add(piece.material);
        currentMaterial = piece.material;
      }

      // If this is a material heading row, insert a separator
      if (headingRowIndexes.has(i)) {
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
    // Use piece.name or piece.description to accommodate API response format
    if ((piece.name || piece.description) && (piece.width || piece.length || piece.quantity)) {
      // Debug quantity before normalization
      console.log(`Before normalization - Piece ${i}: quantity=${piece.quantity}, type=${typeof piece.quantity}`);
      
      // Force quantity to be a number type, but preserve the original value if it exists
  // Only default to 1 if quantity is undefined or null
  let quantityValue = piece.quantity !== undefined && piece.quantity !== null ? Number(piece.quantity) : 1;
  
  // If quantity is 1, try to extract a better quantity from the description
  if (quantityValue === 1 && (piece.description || piece.name)) {
    const extractedQty = extractQuantityFromDescription(piece.description || piece.name);
    if (extractedQty !== null) {
      console.log(`Overriding quantity from 1 to ${extractedQty} based on description`);
      quantityValue = extractedQty;
    }
  }
  
  console.log(`Final quantity for piece ${i}: ${quantityValue}`);
    
    // Ensure we preserve the original quantity explicitly
      const normalizedPiece = {
        ...piece,
        quantity: quantityValue, // Force as number and ensure it's preserved
        edging: piece.edging ?? 1,
        separator: false,
        lengthTick1: piece.lengthTick1 ?? false,
        lengthTick2: piece.lengthTick2 ?? false,
        widthTick1: piece.widthTick1 ?? false,
        widthTick2: piece.widthTick2 ?? false,
        material: currentMaterial,
      };
      
      // Debug the normalized piece
      console.log(`After normalization - Piece ${i}: quantity=${normalizedPiece.quantity}, type=${typeof normalizedPiece.quantity}`);
      
      normalized.push(normalizedPiece);
      }
    }

    // Log the normalized data for debugging
    console.log('Normalized pieces:', normalized.map((p, i) => {
      if (p.separator) {
        return `[${i}] SEPARATOR: ${p.name}`;
      }
      return `[${i}] ${p.name} (${p.material}) - ${p.length}x${p.width} quantity=${p.quantity}`;
    }));
    
    // Final quantity check
    console.log('===== FINAL QUANTITY CHECK =====');
    normalized.forEach((piece, index) => {
      if (!piece.separator) {
        console.log(`Final Piece ${index}: name=${piece.name || 'unnamed'}, quantity=${piece.quantity}, type=${typeof piece.quantity}`);
      }
    });
    
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
        // Only use the static PRODUCT_DESCRIPTIONS instead of API call
        console.log('Using static product descriptions from file');
        
        // Use the real product descriptions imported from file
        setProductDescriptions(PRODUCT_DESCRIPTIONS);
        
        // Set default material structure for other dropdowns
        setMaterialData(DEFAULT_MATERIAL_DATA);
        setMaterialCategories(DEFAULT_MATERIAL_CATEGORIES);
        
      } catch (error) {
        console.error('Error setting up material data:', error);
        // Use fallbacks
        setMaterialData(DEFAULT_MATERIAL_DATA);
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

  useEffect(() => {
    // If we have detected materials from OCR text, use those instead of default
    if (detectedMaterials.length > 0) {
      // Clear existing cut pieces that are separators
      setCutPieces(prevPieces => {
        const nonSeparators = prevPieces.filter(p => !p.separator);
        let result: CutPiece[] = [];
        
        // Add a separator for each detected material
        detectedMaterials.forEach((material, index) => {
          // Add separator
          result.push({
            id: `ocr-sep-${index}-${Date.now()}`,
            name: material,
            separator: true,
          });
          
          // Add cut pieces that match this material
          const materialPieces = nonSeparators.filter(p => p.material === material);
          result = [...result, ...materialPieces];
        });
        
        // Add any remaining pieces that don't have a material match
        const remainingPieces = nonSeparators.filter(p => !detectedMaterials.includes(p.material || ''));
        result = [...result, ...remainingPieces];
        
        return result;
      });
    }
    // Otherwise, make sure at least one material section exists
    else if (cutPieces.length === 0 || !cutPieces.some(p => p.separator)) {
      handleAddMaterialSection();
    }
  }, [detectedMaterials.length]);

  const handleCutPieceChange = (id: string, field: keyof CutPiece, value: any) => {
    setCutPieces(prevCutPieces =>
      prevCutPieces.map(piece =>
        piece.id === id ? { ...piece, [field]: value } : piece
      )
    );
  };

  const handleAddMaterialSection = () => {
    // Generate unique IDs for both the separator and the new piece
    const separatorId = `separator-${Date.now()}`;
    const newPieceId = `piece-${Date.now()}`;
    
    // Default material to use
    const defaultMaterial = materialCategories.length > 0 ? materialCategories[0] : 'New Material';
    
    // Add both the separator and a blank piece at once
    setCutPieces(prevCutPieces => [
      ...prevCutPieces,
      // Add the material section separator
      {
        id: separatorId,
        separator: true,
        name: defaultMaterial,
        material: defaultMaterial,
      },
      // Add an empty piece with the same material
      {
        id: newPieceId,
        name: '',
        width: undefined,
        length: undefined,
        quantity: 1,
        material: defaultMaterial,
        edging: 0,
        lengthTick1: false,
        lengthTick2: false,
        widthTick1: false,
        widthTick2: false,
      }
    ]);
    
    // Set a material section for the newly added material if we have material categories
    if (materialCategories.length > 0) {
      // Create a default section material structure for the dropdown
      setSectionMaterials(prev => {
        const newMaterialSection = {
          material: defaultMaterial,
          category: materialCategories[0] || '',
        };
        return {...prev, [cutPieces.length]: newMaterialSection};
      });
    }
    
    // Show confirmation message
    setSnackbarMessage('New material section added');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
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

  // Function to delete a material section and all its pieces
  const handleDeleteMaterialSection = (headingIdx: number) => {
    setCutPieces(prevCutPieces => {
      // Create a copy of current pieces
      const updatedPieces = [...prevCutPieces];
      
      // Find the separator piece at the given index
      if (!updatedPieces[headingIdx] || !updatedPieces[headingIdx].separator) {
        console.error('Cannot delete: invalid material section index or not a separator');
        return prevCutPieces;
      }
      
      // Find the next separator piece (or end of array)
      let nextSeparatorIdx = updatedPieces.findIndex((piece, idx) => 
        idx > headingIdx && piece.separator
      );
      
      if (nextSeparatorIdx === -1) {
        nextSeparatorIdx = updatedPieces.length;
      }
      
      // Remove the separator and all pieces until the next separator
      updatedPieces.splice(headingIdx, nextSeparatorIdx - headingIdx);
      
      // Ensure there's at least one material section left
      if (!updatedPieces.some(piece => piece.separator)) {
        // Add default material section if all were deleted
        updatedPieces.unshift({
          id: `sep-default-${Date.now()}`,
          name: DEFAULT_MATERIAL_CATEGORIES[0],
          separator: true,
        });
      }
      
      return updatedPieces;
    });
  };

  const handleSave = () => {
    // Validate all piece fields
    if (cutPieces.some(p => !p.separator && (!p.length || !p.width || !p.quantity))) {
      setSnackbarMessage('Please fill in all dimensions and quantity for each piece.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    // Material required validation
    if (requireMaterialValidation) {
      const sections = getSections();
      const missingMaterial = sections.some(section => !section.material || section.material.trim() === '');
      if (missingMaterial) {
        setSnackbarMessage('Please select a material for every section.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
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

  // Function to calculate edging based on checkbox selections
  const calculateEdging = (piece: CutPiece): number => {
    const edgesToCount = [
      piece.lengthTick1,
      piece.lengthTick2,
      piece.widthTick1,
      piece.widthTick2
    ].filter(Boolean).length;
    
    return edgesToCount > 0 ? 1 : 0; // Return 1 if any edge is selected, 0 otherwise
  };

  // Utility function to download a PDF from a URL
  const downloadPdf = (url: string, filename: string) => {
    // Check if it's a data URL or regular URL
    let downloadUrl = url;
    
    // If it's a regular URL (not a data URL), make sure it's absolute
    if (!url.startsWith('data:')) {
      downloadUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    }
    
    console.log(`Preparing PDF download with URL type: ${url.startsWith('data:') ? 'data URL' : 'regular URL'}`);
    
    // Create a link element and simulate a click to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  const handleCalculate = () => {
    // Validate data
    if (cutPieces.length === 0) {
      setSnackbarMessage('Please add cut pieces first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // Group the cutlist pieces by material section
    const sections = getSections();
    console.log('Material sections:', sections);
    
    if (sections.length === 0) {
      setSnackbarMessage('No valid material sections found. Please add at least one material section with cut pieces.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Open the confirmation dialog
    setConfirmationDialogOpen(true);
  };

  // Function to process the optimizer after user confirms measurements
  const processOptimizer = async () => {
    try {
      setSnackbarMessage('Calculating optimal cutting plan and generating quotation...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      // Group the cutlist pieces by material section
      const sections = getSections();
      
      // Prepare data for the backend
      const sectionData = sections.map(section => ({
        material: section.material,
        cutPieces: section.pieces.map(piece => ({
          id: piece.id,
          width: piece.width || 0,
          length: piece.length || 0,
          amount: piece.quantity || 1,
          edging: calculateEdging(piece),
          name: piece.name
        }))
      }));
      
      // Prepare the request payload
      const quotePayload = {
        sections: sectionData,
        customerName: customerName || 'Customer',
        projectName: projectName || 'Custom Cutlist',
        phoneNumber: phoneNumber || '',
        branchData: branchData || null
      };
      
      console.log('Sending quote request to backend:', quotePayload);
      
      // Use the new backend endpoint for generating quotes
      const quoteResult = await generateQuote(quotePayload);
      
      console.log('Quote result from backend:', quoteResult);
      
      if (!quoteResult.success) {
        console.error('Quote generation failed:', quoteResult);
        // Use the detailed error message if available, otherwise use the general message or a fallback
        const errorMessage = quoteResult.error || quoteResult.message || 'Unknown error';
        setSnackbarMessage(`Failed to generate quote: ${errorMessage}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      // Extract data from the response
      const { quoteId, sections: processedSections, grandTotal, pdfUrl } = quoteResult.data;
      
      // Trigger PDF download
      if (pdfUrl) {
        console.log('Downloading PDF from URL:', pdfUrl ? pdfUrl.substring(0, 100) + '...' : 'undefined');
        
        // Handle both Supabase public URLs and base64 data URLs
        if (pdfUrl.startsWith('data:application/pdf;base64,') || pdfUrl.startsWith('http')) {
          console.log('Valid PDF URL detected:', pdfUrl.startsWith('data:') ? 'base64 format' : 'Supabase public URL');
          // Store data and open success modal
          setSuccessQuoteData({
            quoteId,
            pdfUrl,
            phoneNumber: phoneNumber || undefined
          });
          setQuoteSuccessDialogOpen(true);
        } else {
          console.error('Invalid PDF URL format');
          setSnackbarMessage('PDF generation failed: invalid URL format');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      } else {
        console.error('No PDF URL received from server');
        setSnackbarMessage('PDF generation failed: no URL received');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
      
      // Generate quotation text for WhatsApp
      const now = new Date();
      const quoteDate = now.toLocaleDateString();
      
      // Helper to format numbers safely without throwing
      const safeFixed = (val: number | undefined | null, digits = 2): string =>
        typeof val === 'number' && isFinite(val) ? val.toFixed(digits) : '-';
      
      const quotationText = `
HDS GROUP QUOTATION

Quote: ${quoteId}
Date: ${quoteDate}
Customer: ${customerName || 'Customer'}
Project: ${projectName || 'Custom Cutlist'}

${'='.repeat(50)}

${processedSections.map(section => 
`MATERIAL: ${section.material}
Board Size: ${section.boardSize}
Quantity: ${section.boardsNeeded}
Price per Board: R ${safeFixed(section.pricePerBoard)}
Section Total: R ${safeFixed(section.sectionTotal)}
`
).join('\n')}
${'='.repeat(50)}

GRAND TOTAL: R ${safeFixed(grandTotal)}

Thank you for your business!
`;
      
      // Set a success message
      setSnackbarMessage(`Quotation generated successfully. Total: R ${safeFixed(grandTotal)}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // WhatsApp message will be sent from the success modal when user clicks the button
      
    } catch (error) {
      console.error('Calculation error:', error);
      setSnackbarMessage('Failed to calculate boards and price.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle closing the quote success dialog
  const handleCloseQuoteSuccessDialog = () => {
    setQuoteSuccessDialogOpen(false);
  };
  
  // Handle closing the snackbar
  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleCloseConfirmationDialog = () => {
    setConfirmationDialogOpen(false);
  };

  const handleConfirmMeasurements = async () => {
    setConfirmationDialogOpen(false);
    await processOptimizer();
  };

  const navigate = useNavigate();
  // Handle creating a new quote from the success modal
  const handleNewQuote = () => {
    navigate('/cutlist-edit/new');
  };

  // Handle PDF download from the success modal
  const handleDownloadQuotePdf = () => {
    if (successQuoteData?.pdfUrl) {
      downloadPdf(successQuoteData.pdfUrl, `Quote-${successQuoteData.quoteId}.pdf`);
    }
  };
  
  // Handle sharing to WhatsApp from the success modal
  const handleShareToWhatsApp = async () => {
    if (!successQuoteData?.quoteId || !successQuoteData?.pdfUrl) {
      setSnackbarMessage('Missing quote data for WhatsApp sharing');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      // Set loading state
      setIsLoading(true);
      
      // Extract PDF data URL and convert to proper URL if needed
      let pdfUrl = successQuoteData.pdfUrl;
      let finalPdfUrl = pdfUrl;
      
      // If this is a data URL, we need to upload it to the server to get a shareable link
      const isPdfDataUrl = pdfUrl.startsWith('data:application/pdf');
      
      if (isPdfDataUrl) {
        // Show loading message
        setSnackbarMessage('Preparing PDF for sharing...');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        
        try {
          // Upload PDF data URL to get a shareable link
          const response = await fetch('/api/quotes/upload-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quoteId: successQuoteData.quoteId,
              pdfDataUrl: pdfUrl
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload PDF');
          }
          
          const result = await response.json();
          finalPdfUrl = result.pdfUrl; // Use the URL returned by the server
          
        } catch (uploadError) {
          console.error('PDF upload error:', uploadError);
          // If upload fails, we'll use a fallback message
          setSnackbarMessage('Failed to prepare PDF for sharing, using fallback method');
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
        }
      }
      
      // Create a thank you message from HDS stating that the quotation is ready
      let thankYouMessage = `Thank you for choosing HDS Group! Your quotation (ID: ${successQuoteData.quoteId}) is now ready.`;
      
      // Always include the PDF link - either the uploaded URL or the original URL
      thankYouMessage += ` You can view and download your quotation at: ${finalPdfUrl}\n\nWe appreciate your business and look forward to working with you.`;
      
      // Encode the message for the WhatsApp URL
      const encodedMessage = encodeURIComponent(thankYouMessage);
      
      // Create the WhatsApp URL with the encoded message
      const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
      
      // Clear loading state
      setIsLoading(false);
      
      // Open the URL in a new window/tab
      window.open(whatsappUrl, '_blank');
      
      setSnackbarMessage('WhatsApp sharing initiated with PDF download link');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseQuoteSuccessDialog();
    } catch (error) {
      console.error('WhatsApp sharing error:', error);
      setSnackbarMessage('Failed to initiate WhatsApp sharing');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  // This function finds all sections based on separator pieces
  const getSections = () => {
    const sections: { material: string, pieces: CutPiece[], headingIdx: number }[] = [];
    if (!cutPieces) {
      console.log('EditableCutlistTable: No cut pieces available');
      return sections;
    }
    
    console.log('EditableCutlistTable: Processing', cutPieces.length, 'cut pieces for sections');
    console.log('EditableCutlistTable: Separator pieces:', cutPieces.filter(p => p.separator).map(p => p.name || 'Unnamed'));

    let currentPieces: CutPiece[] = [];
    let currentMaterial: string | undefined;
    let currentHeadingIdx: number = -1;

    cutPieces.forEach((piece, idx) => {
      // Debug the current piece
      console.log(`EditableCutlistTable: Processing piece ${idx}:`, { 
        id: piece.id, 
        name: piece.name, 
        separator: piece.separator,
        material: piece.material,
        dimensions: `${piece.length}x${piece.width}`
      });
      
      if (piece.separator) {
        console.log(`EditableCutlistTable: Found separator at index ${idx} for material: ${piece.name}`);
        if (currentMaterial !== undefined && currentHeadingIdx !== -1) {
          sections.push({ material: currentMaterial, pieces: currentPieces, headingIdx: currentHeadingIdx });
          console.log(`EditableCutlistTable: Created section for ${currentMaterial} with ${currentPieces.length} pieces`);
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
      console.log(`EditableCutlistTable: Created final section for ${currentMaterial} with ${currentPieces.length} pieces`);
    }
    
    console.log('EditableCutlistTable: Created', sections.length, 'material sections');
    console.log('EditableCutlistTable: Section materials:', sections.map(s => s.material));
    
    return sections;
  };

  const sections = getSections();

  return (
    <Paper elevation={3}>
      {isMobile ? (
        // Mobile Card View
        <Box sx={{ p: 2 }}>
          {/* Mobile view heading with add material section button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Cutlist</Typography>
            <Button 
              variant="contained" 
              color="secondary"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddMaterialSection}
              disabled={isConfirmed}
              sx={{ fontWeight: 'bold' }}
            >
              Add Material
            </Button>
          </Box>
          
          {sections.map((section, sectionIdx) => (
            <Box key={`section-mobile-${sectionIdx}`} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FormControl fullWidth size="small" required={requireMaterialValidation} error={requireMaterialValidation && (!section.material || section.material.trim() === '')}>
                    <InputLabel>Material</InputLabel>
                    <Select
                        value={section.material}
                        onChange={(e) => {
                            const newMaterial = e.target.value;
                            const updatedPieces = [...cutPieces];
                            updatedPieces[section.headingIdx].name = newMaterial;
                            // Update material for all pieces in this section
                            for (let i = section.headingIdx + 1; i < updatedPieces.length; i++) {
                                if (updatedPieces[i].separator) break;
                                updatedPieces[i].material = newMaterial;
                            }
                            setCutPieces(updatedPieces);
                        }}
                        disabled={isConfirmed || loadingMaterials}
                    >
                        {loadingMaterials ? <MenuItem disabled>Loading...</MenuItem> : productDescriptions.map(description => (
                            <MenuItem key={description} value={description}>{description}</MenuItem>
                        ))}
                    </Select>
                    {requireMaterialValidation && (!section.material || section.material.trim() === '') && (
                      <Typography variant="caption" color="error">Material is required</Typography>
                    )}
                  </FormControl>
                  <IconButton
                    aria-label="Delete material section"
                    onClick={() => {
                      if (isConfirmed || loadingMaterials) return;
                      // Delete the entire material section instead of just clearing the name
                      handleDeleteMaterialSection(section.headingIdx);
                    }}
                    color="error"
                    sx={{ ml: 1 }}
                    disabled={isConfirmed || loadingMaterials || sections.length <= 1} // Prevent deleting the last section
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

              {section.pieces.map((piece, pieceIdx) => (
                <Paper key={piece.id} elevation={2} sx={{ p: 2, mb: 2 }}>
                  <TextField fullWidth label="Name" value={piece.name || ''} onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)} variant="outlined" size="small" sx={{ mb: 1.5 }} disabled={isConfirmed} />
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <TextField label={`Length (${unit})`} type="number" value={piece.length ?? ''} onChange={(e) => handleCutPieceChange(piece.id, 'length', e.target.value)} variant="outlined" size="small" disabled={isConfirmed} />
                    <TextField label={`Width (${unit})`} type="number" value={piece.width ?? ''} onChange={(e) => handleCutPieceChange(piece.id, 'width', e.target.value)} variant="outlined" size="small" disabled={isConfirmed} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick1} onChange={e => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)} disabled={isConfirmed} />} label="L1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick2} onChange={e => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)} disabled={isConfirmed} />} label="L2" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick1} onChange={e => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)} disabled={isConfirmed} />} label="W1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick2} onChange={e => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)} disabled={isConfirmed} />} label="W2" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2}}>
                    <TextField label="Quantity" type="number" value={piece.quantity !== undefined && piece.quantity !== null ? piece.quantity : 1} onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)} variant="outlined" size="small" inputProps={{ min: 1 }} disabled={isConfirmed} />
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddCutPiece()} disabled={isConfirmed}>Add Piece</Button>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<AddIcon />} 
                onClick={handleAddMaterialSection} 
                disabled={isConfirmed}
                sx={{ fontWeight: 'bold' }}
              >
                Add New Material Section
              </Button>
            </Box>
          </Box>
          {(() => {
            // Get all material sections
            const sections = getSections();
            
            if (sections.length === 0 && cutPieces.length === 0) {
              // No materials or pieces yet, show a welcome message
              return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>No materials added yet</Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddMaterialSection}
                  >
                    Add Your First Material Section
                  </Button>
                </Box>
              );
            }
            
            // Return a separate table for each material section
            return sections.map((section, sectionIndex) => (
              <Box key={section.headingIdx} sx={{ mb: 4 }}>
                <Paper elevation={2} sx={{ p: 0, borderRadius: '4px', overflow: 'hidden' }}>
                  {/* Section header */}
                  <Box 
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white', 
                      px: 2, 
                      py: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Material Section {sectionIndex + 1}: {section.material}
                      </Typography>
                      {!isConfirmed && sections.length > 1 && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteMaterialSection(section.headingIdx)}
                          sx={{ ml: 1, color: 'white' }}
                          disabled={isConfirmed}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    {!isConfirmed && (
                      <Button 
                        variant="contained" 
                        color="secondary" 
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddCutPiece(section.material)}
                      >
                        Add Piece
                      </Button>
                    )}
                  </Box>
                  
                  {/* Section table */}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {!isConfirmed && <TableCell width="5%"></TableCell>}
                          <TableCell width="30%">Name</TableCell>
                          <TableCell width="15%" align="right">Width (mm)</TableCell>
                          <TableCell width="15%" align="right">Length (mm)</TableCell>
                          <TableCell width="10%" align="right">Qty</TableCell>
                          {!isConfirmed && (
                            <>
                              <TableCell width="5%" align="center">L1</TableCell>
                              <TableCell width="5%" align="center">L2</TableCell>
                              <TableCell width="5%" align="center">W1</TableCell>
                              <TableCell width="5%" align="center">W2</TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {section.pieces.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isConfirmed ? 5 : 9} align="center">
                              <Typography sx={{ py: 2, color: 'text.secondary' }}>No pieces added to this material section</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          section.pieces.map((piece) => (
                            <TableRow key={piece.id}>
                              {!isConfirmed && (
                                <TableCell>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleDeleteCutPiece(piece.id)}
                                    disabled={isConfirmed}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                              <TableCell>
                                <TextField
                                  variant="standard"
                                  value={piece.name || ''}
                                  onChange={(e) => handleCutPieceChange(piece.id, 'name', e.target.value)}
                                  fullWidth
                                  disabled={isConfirmed}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  variant="standard"
                                  value={piece.width || ''}
                                  onChange={(e) => handleCutPieceChange(piece.id, 'width', Number(e.target.value))}
                                  type="number"
                                  InputProps={{ inputProps: { min: 0, step: 1 } }}
                                  disabled={isConfirmed}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  variant="standard"
                                  value={piece.length || ''}
                                  onChange={(e) => handleCutPieceChange(piece.id, 'length', Number(e.target.value))}
                                  type="number"
                                  InputProps={{ inputProps: { min: 0, step: 1 } }}
                                  disabled={isConfirmed}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  variant="standard"
                                  value={piece.quantity !== undefined && piece.quantity !== null ? piece.quantity : 1}
                                  onChange={(e) => handleCutPieceChange(piece.id, 'quantity', Number(e.target.value))}
                                  type="number"
                                  InputProps={{ inputProps: { min: 1, step: 1 } }}
                                  disabled={isConfirmed}
                                />
                              </TableCell>
                              {!isConfirmed && (
                                <>
                                  <TableCell align="center">
                                    <Checkbox 
                                      checked={!!piece.lengthTick1} 
                                      onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)}
                                      disabled={isConfirmed}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox 
                                      checked={!!piece.lengthTick2} 
                                      onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)}
                                      disabled={isConfirmed}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox 
                                      checked={!!piece.widthTick1} 
                                      onChange={(e) => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)}
                                      disabled={isConfirmed}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox 
                                      checked={!!piece.widthTick2} 
                                      onChange={(e) => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)}
                                      disabled={isConfirmed}
                                    />
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            ));
          })()}
          {!isConfirmed && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, mb: 2 }}>
              <Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        
        {!isConfirmed && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleAddMaterialSection}
          >
            Add New Material Section
          </Button>
        )}
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleCalculate}
        >
          Confirm Cutlist
        </Button>
        
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

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialogOpen}
        onClose={handleCloseConfirmationDialog}
        aria-labelledby="confirmation-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="confirmation-dialog-title" sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Please Confirm Your Measurements
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Are you sure all measurements and material selections are correct?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Once confirmed, we will generate your optimal cutting plan and prepare your quotation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmationDialog}>Cancel</Button>
          <Button onClick={handleConfirmMeasurements} variant="contained" color="primary">
            Yes, Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quote Success Dialog */}
      <Dialog
        open={quoteSuccessDialogOpen}
        onClose={handleCloseQuoteSuccessDialog}
        aria-labelledby="quote-success-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="quote-success-dialog-title" sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Quotation Generated Successfully
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Your quote is ready! What would you like to do with it?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Quote ID: {successQuoteData?.quoteId}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, width: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadQuotePdf}
                sx={{ py: 2 }}
              >
                Download PDF
              </Button>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={handleShareToWhatsApp}
                sx={{ py: 2 }}
              >
                Share via WhatsApp
              </Button>
            </Box>
          </Box>
          {/* Phone number alert message removed as requested */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewQuote} variant="contained" color="secondary" sx={{ mr: 1 }}>
            New Quote
          </Button>
          <Button onClick={handleCloseQuoteSuccessDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EditableCutlistTable;
