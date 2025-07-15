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
  FormControlLabel,
  useMediaQuery
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

import type { StockPiece, CutPiece, Material, CutlistData, EditableCutlistTableProps } from './EditableCutlistTable/types';

import { 
  parseOcrText, 
  normalizeCutPieces,
  extractQuantityFromDescription, 
  calculateEdging,
  downloadPdf,
  extractDimensions
} from './EditableCutlistTable/utils';

const EditableCutlistTable: React.FC<EditableCutlistTableProps> = ({ 
  initialData, 
  onSave,
  onSendWhatsApp,
  isConfirmed,
  branchData,
  requireMaterialValidation = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
      const { dimensions, materials } = parseOcrText(initialData.rawText, DEFAULT_MATERIAL_CATEGORIES);
      
      // Save detected materials for later use
      if (materials.length > 0) {
        console.log(`Detected ${materials.length} materials from OCR text:`, materials);
        setDetectedMaterials(materials);
      }
      
      // Convert dimensions to cut pieces
      const pieces: CutPiece[] = dimensions.map((dim, idx) => ({
        id: `dim-${Date.now()}-${idx}`,
        width: dim.width,
        length: dim.length,
        count: dim.quantity,
        material: dim.material,
        done: false,
        doneCount: 0,
        externalId: dim.id,
        label: '',
        edge: { top: false, bottom: false, left: false, right: false },
      }));
      
      // Mark that we've parsed the OCR text
      setHasDirectlyParsed(true);
      
      return pieces;
    }
    
    // If we have initial cut pieces, use them
    if (initialData.cutPieces && initialData.cutPieces.length > 0) {
      return normalizeCutPieces(initialData.cutPieces, DEFAULT_MATERIAL_CATEGORIES);
    }
    
    // Otherwise, return an empty array
    return [];
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
      const normalized = normalizeCutPieces(initialData.cutPieces || [], DEFAULT_MATERIAL_CATEGORIES);
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
      // Add default material section if all were deleted
      handleAddMaterialSection();
    }
  }, [detectedMaterials.length]);

  useEffect(() => {
    console.log('Initial data:', initialData);
    console.log('Cut pieces:', cutPieces);
    console.log('Stock pieces:', stockPieces);
    console.log('Materials:', materials);
  }, []);

  const handleCutPieceChange = (id: string, field: keyof CutPiece, value: any) => {
    setCutPieces(prevCutPieces =>
      prevCutPieces.map(piece =>
        piece.id === id ? { ...piece, [field]: value } : piece
      )
    );
  };

  const handleAddMaterialSection = (insertIndex: number = cutPieces.length) => {
    const separatorId = `separator-${Date.now()}`;
    const newPieceId = `piece-${Date.now()}`;
    const defaultMaterial = materialCategories.length > 0 ? materialCategories[0] : 'New Material';
    
    setCutPieces(prev => {
      const newSeparator = {
        id: separatorId,
        separator: true,
        name: defaultMaterial,
        material: defaultMaterial,
      };
      const newPiece = {
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
      };

      const newPieces = [...prev];
      newPieces.splice(insertIndex, 0, newSeparator, newPiece);
      return newPieces;
    });
    
    setSectionMaterials(prevSectionMaterials => {
      const shifted = {};
      Object.entries(prevSectionMaterials).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx >= insertIndex) {
          shifted[idx + 2] = value;
        } else {
          shifted[idx] = value;
        }
      });
      shifted[insertIndex] = {
        material: defaultMaterial,
        category: materialCategories[0] || '',
      };
      return shifted;
    });
    
    setSnackbarMessage('New material section added');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleAddCutPiece = (materialName?: string) => {
    const newId = `cp-${Date.now()}`;
    let targetMaterial = materialName;

    if (!targetMaterial) {
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

    let insertAtIndex = cutPieces.length;
    if (targetMaterial) {
      const lastPieceInMaterialSectionIndex = cutPieces.map(p => p.material).lastIndexOf(targetMaterial);
      if (lastPieceInMaterialSectionIndex !== -1) {
        insertAtIndex = lastPieceInMaterialSectionIndex + 1;
      } else {
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

  const handleDeleteMaterialSection = (headingIdx: number) => {
    setCutPieces(prevCutPieces => {
      const updatedPieces = [...prevCutPieces];
      
      if (!updatedPieces[headingIdx] || !updatedPieces[headingIdx].separator) {
        console.error('Cannot delete: invalid material section index or not a separator');
        return prevCutPieces;
      }
      
      let nextSeparatorIdx = updatedPieces.findIndex((piece, idx) => 
        idx > headingIdx && piece.separator
      );
      
      if (nextSeparatorIdx === -1) {
        nextSeparatorIdx = updatedPieces.length;
      }
      
      updatedPieces.splice(headingIdx, nextSeparatorIdx - headingIdx);
      
      if (!updatedPieces.some(piece => piece.separator)) {
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
    if (cutPieces.some(p => !p.separator && (!p.length || !p.width || !p.quantity))) {
      setSnackbarMessage('Please fill in all dimensions and quantity for each piece.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
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

  const handleCalculate = () => {
    if (cutPieces.length === 0) {
      setSnackbarMessage('Please add cut pieces first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const sections = getSections();
    console.log('Material sections:', sections);
    
    if (sections.length === 0) {
      setSnackbarMessage('No valid material sections found. Please add at least one material section with cut pieces.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setConfirmationDialogOpen(true);
  };

  const processOptimizer = async () => {
    try {
      setSnackbarMessage('Calculating optimal cutting plan and generating quotation...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      const sections = getSections();
      
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
      
      const quotePayload = {
        sections: sectionData,
        customerName: customerName || 'Customer',
        projectName: projectName || 'Custom Cutlist',
        phoneNumber: phoneNumber || '',
        branchData: branchData || null
      };
      
      console.log('Sending quote request to backend:', quotePayload);
      
      const quoteResult = await generateQuote(quotePayload);
      
      console.log('Quote result from backend:', quoteResult);
      
      if (!quoteResult.success) {
        console.error('Quote generation failed:', quoteResult);
        const errorMessage = quoteResult.error || quoteResult.message || 'Unknown error';
        setSnackbarMessage(`Failed to generate quote: ${errorMessage}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      const { quoteId, sections: processedSections, grandTotal, pdfUrl } = quoteResult.data;
      
      if (pdfUrl) {
        console.log('Downloading PDF from URL:', pdfUrl ? pdfUrl.substring(0, 100) + '...' : 'undefined');
        
        if (pdfUrl.startsWith('data:application/pdf;base64,') || pdfUrl.startsWith('http')) {
          console.log('Valid PDF URL detected:', pdfUrl.startsWith('data:') ? 'base64 format' : 'Supabase public URL');
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
      
      const now = new Date();
      const quoteDate = now.toLocaleDateString();
      
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
      
      setSnackbarMessage(`Quotation generated successfully. Total: R ${safeFixed(grandTotal)}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      const thankYouMessage = `Thank you for choosing HDS Group! Your quotation (ID: ${successQuoteData.quoteId}) is now ready.`;
      
      const encodedMessage = encodeURIComponent(thankYouMessage);
      
      const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      setSnackbarMessage('WhatsApp sharing initiated with PDF download link');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseQuoteSuccessDialog();
    } catch (error) {
      console.error('Calculation error:', error);
      setSnackbarMessage('Failed to calculate boards and price.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseQuoteSuccessDialog = () => {
    setQuoteSuccessDialogOpen(false);
  };
  
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
  const handleNewQuote = () => {
    navigate('/cutlist-edit/new');
  };

  const handleDownloadQuotePdf = () => {
    if (successQuoteData?.pdfUrl) {
      downloadPdf(successQuoteData.pdfUrl, `Quote-${successQuoteData.quoteId}.pdf`);
    }
  };
  
  const handleShareToWhatsApp = async () => {
    if (!successQuoteData?.quoteId || !successQuoteData?.pdfUrl) {
      setSnackbarMessage('Missing quote data for WhatsApp sharing');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setIsLoading(true);
      
      let pdfUrl = successQuoteData.pdfUrl;
      let finalPdfUrl = pdfUrl;
      
      if (pdfUrl.startsWith('data:application/pdf')) {
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
        finalPdfUrl = result.pdfUrl; 
      }
      
      const thankYouMessage = `Thank you for choosing HDS Group! Your quotation (ID: ${successQuoteData.quoteId}) is now ready.`;
      
      const encodedMessage = encodeURIComponent(thankYouMessage);
      
      const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
      
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
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Cutlist</Typography>
            <Button 
              variant="contained" 
              color="secondary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAddMaterialSection()}
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
                    onClick={(e: React.MouseEvent) => {
                      if (isConfirmed || loadingMaterials) return;
                      handleDeleteMaterialSection(section.headingIdx);
                    }}
                    color="error"
                    sx={{ ml: 1 }}
                    disabled={isConfirmed || loadingMaterials || sections.length <= 1}
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
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick1} onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick1', e.target.checked)} disabled={isConfirmed} />} label="L1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.lengthTick2} onChange={(e) => handleCutPieceChange(piece.id, 'lengthTick2', e.target.checked)} disabled={isConfirmed} />} label="L2" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick1} onChange={(e) => handleCutPieceChange(piece.id, 'widthTick1', e.target.checked)} disabled={isConfirmed} />} label="W1" />
                    <FormControlLabel control={<Checkbox checked={!!piece.widthTick2} onChange={(e) => handleCutPieceChange(piece.id, 'widthTick2', e.target.checked)} disabled={isConfirmed} />} label="W2" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2}}>
                    <TextField label="Quantity" type="number" value={piece.quantity !== undefined && piece.quantity !== null ? piece.quantity : 1} onChange={(e) => handleCutPieceChange(piece.id, 'quantity', e.target.value)} variant="outlined" size="small" inputProps={{ min: 1 }} disabled={isConfirmed} />
                    <IconButton onClick={(e: React.MouseEvent) => handleDeleteCutPiece(piece.id)} color="error" disabled={isConfirmed}><DeleteIcon /></IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          ))}
          <Fab color="primary" aria-label="add cut piece" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => handleAddCutPiece()} disabled={isConfirmed}><AddIcon /></Fab>
        </Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Cutlist</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddCutPiece()} disabled={isConfirmed}>Add Piece</Button>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<AddIcon />} 
                onClick={() => handleAddMaterialSection()} 
                disabled={isConfirmed}
                sx={{ fontWeight: 'bold' }}
              >
                Add New Material Section
              </Button>
            </Box>
          </Box>
          {(() => {
            const sections = getSections();
            
            if (sections.length === 0 && cutPieces.length === 0) {
              return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>No materials added yet</Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddMaterialSection()}
                  >
                    Add Your First Material Section
                  </Button>
                </Box>
              );
            }
            
            return sections.map((section, sectionIndex) => (
              <Box key={section.headingIdx} sx={{ mb: 4 }}>
                <Paper elevation={2} sx={{ p: 0, borderRadius: '4px', overflow: 'hidden' }}>
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
                          onClick={(e: React.MouseEvent) => handleDeleteMaterialSection(section.headingIdx)}
                          sx={{ ml: 1, color: 'white' }}
                          disabled={isConfirmed}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  
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
                          <TableCell width="10%" align="center">Material</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {section.pieces.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isConfirmed ? 6 : 10} align="center">
                              <Typography sx={{ py: 2, color: 'text.secondary' }}>No pieces added to this material section</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          section.pieces.map((piece, index) => (
                            <React.Fragment key={piece.id}>
                              {piece.separator ? (
                                <TableRow sx={{ backgroundColor: theme.palette.grey[200] }}>
                                  <TableCell colSpan={10} sx={{ fontWeight: 'bold', py: 1 }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                      <Typography variant="subtitle1">{piece.name}</Typography>
                                      {!isConfirmed && (
                                        <IconButton onClick={(e: React.MouseEvent) => handleDeleteMaterialSection(index)} size="small">
                                          <DeleteIcon />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <TableRow>
                                  {!isConfirmed && (
                                    <TableCell>
                                      <IconButton 
                                        size="small" 
                                        onClick={(e: React.MouseEvent) => handleDeleteCutPiece(piece.id)}
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
                                  <TableCell align="center">
                                    <FormControl>
                                      <InputLabel id="material-label">Material</InputLabel>
                                      <Select
                                        labelId="material-label"
                                        value={piece.material}
                                        label="Material"
                                        onChange={(e) => handleCutPieceChange(piece.id, 'material', e.target.value)}
                                        disabled={isConfirmed}
                                      >
                                        {productDescriptions.map(description => (
                                          <MenuItem key={description} value={description}>{description}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                </TableRow>
                              )}
                              {!isConfirmed && !piece.separator && index < section.pieces.length - 1 && !section.pieces[index + 1].separator && (
                                <TableRow>
                                  <TableCell colSpan={10} align="center" style={{ padding: '4px' }}>
                                    <Box sx={{ position: 'relative', height: isMobile ? '30px' : '4px', display: 'flex', justifyContent: 'center' }}>
                                      <IconButton
                                        size="small"
                                        sx={{
                                          position: isMobile ? 'static' : 'absolute',
                                          top: isMobile ? 0 : '-14px',
                                          transform: isMobile ? 'none' : 'translateX(-50%)',
                                          zIndex: 1,
                                          backgroundColor: 'white',
                                          border: '1px solid #ddd',
                                          '&:hover': { backgroundColor: '#f5f5f5' },
                                          ...(isMobile && { width: 36, height: 36, marginTop: 1 })
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddMaterialSection(index + 1);
                                        }}
                                        disabled={isConfirmed}
                                      >
                                        <AddIcon fontSize={isMobile ? "medium" : "small"} />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
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
            onClick={() => handleAddMaterialSection()}
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
