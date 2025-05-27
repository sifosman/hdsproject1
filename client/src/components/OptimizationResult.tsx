import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Divider, Chip } from '@mui/material';

interface PlacedPiece {
  id: number;
  width: number;
  length: number;
  x: number;
  y: number;
  canRotate: boolean;
  externalId: string;
}

interface StockPiece {
  id: number;
  width: number;
  length: number;
  cutPieces: PlacedPiece[];
}

interface OptimizationSolution {
  stockPieces: StockPiece[];
  wastePercentage: number;
  totalArea: number;
  usedArea: number;
  wasteArea: number;
}

interface OptimizationResultProps {
  solution: OptimizationSolution;
  unit: number; // 0 = mm, 1 = inches, 2 = feet
  layout: number; // 0 = guillotine, 1 = nested
  cutWidth: number;
}

// Helper function to convert units
const convertUnit = (value: number, fromUnit: number, toUnit: number): number => {
  // Convert to mm first
  let valueInMm = value;
  if (fromUnit === 1) valueInMm = value * 25.4; // inches to mm
  if (fromUnit === 2) valueInMm = value * 304.8; // feet to mm

  // Convert from mm to target unit
  if (toUnit === 0) return valueInMm; // mm
  if (toUnit === 1) return valueInMm / 25.4; // mm to inches
  if (toUnit === 2) return valueInMm / 304.8; // mm to feet
  return value; // default case
};

// Generate a pastel color based on index
const getPastelColor = (index: number): string => {
  const colors = [
    '#FFD6D6', // light pink
    '#D6FFDB', // light green
    '#D6F0FF', // light blue
    '#FFF7D6', // light yellow
    '#EBD6FF', // light purple
    '#FFE4D6', // light orange
    '#D6FFFF'  // light cyan
  ];
  return colors[index % colors.length];
};

// Component to render a single stock piece with its cut pieces
const StockPieceRenderer: React.FC<{
  stockPiece: StockPiece;
  index: number;
  unit: number;
}> = ({ stockPiece, index, unit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get unit label
  const getUnitLabel = () => {
    return unit === 0 ? 'mm' : unit === 1 ? 'in' : 'ft';
  };

  // Calculate waste
  const calculateWaste = () => {
    const stockArea = stockPiece.width * stockPiece.length;
    let usedArea = 0;
    stockPiece.cutPieces.forEach(piece => {
      usedArea += piece.width * piece.length;
    });
    const wasteArea = stockArea - usedArea;
    const wastePercentage = ((wasteArea / stockArea) * 100).toFixed(2);
    return {
      wasteArea: convertUnit(wasteArea, 0, unit).toFixed(2),
      wastePercentage
    };
  };

  // Group similar pieces
  const groupPieces = () => {
    const groups = new Map<string, {
      width: number;
      length: number;
      count: number;
      pieces: PlacedPiece[];
    }>();

    stockPiece.cutPieces.forEach(piece => {
      const key = `${piece.width}-${piece.length}`;
      if (!groups.has(key)) {
        groups.set(key, {
          width: piece.width,
          length: piece.length,
          count: 1,
          pieces: [piece]
        });
      } else {
        const group = groups.get(key)!;
        group.count++;
        group.pieces.push(piece);
      }
    });

    return Array.from(groups.values());
  };

  // Draw the stock piece and cut pieces on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on container width for responsiveness
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const aspectRatio = stockPiece.length / stockPiece.width;

    // Adjust canvas size based on container width
    canvas.width = containerWidth;
    canvas.height = containerWidth * aspectRatio;

    if (canvas.height > 600) {
      canvas.height = 600;
      canvas.width = 600 / aspectRatio;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit canvas
    const padding = 40; // Padding for labels and dimension lines
    const maxWidth = canvas.width - (padding * 2);
    const maxHeight = canvas.height - (padding * 2);

    const scale = Math.min(
      maxWidth / stockPiece.width,
      maxHeight / stockPiece.length
    );

    // Draw stock piece outline
    const startX = padding;
    const startY = padding;

    // Draw a subtle grid background
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(
      startX,
      startY,
      stockPiece.width * scale,
      stockPiece.length * scale
    );

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Vertical grid lines
    const gridSize = 100; // Grid size in mm
    for (let x = 0; x <= stockPiece.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX + x * scale, startY);
      ctx.lineTo(startX + x * scale, startY + stockPiece.length * scale);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = 0; y <= stockPiece.length; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + y * scale);
      ctx.lineTo(startX + stockPiece.width * scale, startY + y * scale);
      ctx.stroke();
    }

    // Draw stock piece border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      startX,
      startY,
      stockPiece.width * scale,
      stockPiece.length * scale
    );

    // Draw stock dimensions
    const stockWidthLabel = convertUnit(stockPiece.width, 0, unit).toFixed(0);
    const stockLengthLabel = convertUnit(stockPiece.length, 0, unit).toFixed(0);

    // Width dimension on top
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${stockWidthLabel} ${getUnitLabel()}`,
      startX + (stockPiece.width * scale / 2),
      startY - 15
    );

    // Length dimension on left
    ctx.save();
    ctx.translate(startX - 15, startY + (stockPiece.length * scale / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(
      `${stockLengthLabel} ${getUnitLabel()}`,
      0,
      0
    );
    ctx.restore();

    // Draw cut pieces
    stockPiece.cutPieces.forEach((cutPiece, pieceIndex) => {
      // Assign a letter ID (A, B, C, etc.) based on dimensions
      const partName = String.fromCharCode(65 + (pieceIndex % 26));
      cutPiece.externalId = partName;

      // Fill with pastel color
      ctx.fillStyle = getPastelColor(pieceIndex);
      ctx.fillRect(
        startX + cutPiece.x * scale,
        startY + cutPiece.y * scale,
        cutPiece.width * scale,
        cutPiece.length * scale
      );

      // Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        startX + cutPiece.x * scale,
        startY + cutPiece.y * scale,
        cutPiece.width * scale,
        cutPiece.length * scale
      );

      // Draw part ID in center
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        partName,
        startX + cutPiece.x * scale + (cutPiece.width * scale / 2),
        startY + cutPiece.y * scale + (cutPiece.length * scale / 2)
      );

      // Draw dimensions
      const widthLabel = convertUnit(cutPiece.width, 0, unit).toFixed(0);
      const lengthLabel = convertUnit(cutPiece.length, 0, unit).toFixed(0);

      // Only draw dimensions if the piece is large enough
      if (cutPiece.width * scale > 40) {
        // Width dimension on top
        ctx.font = '10px Arial';
        ctx.fillText(
          widthLabel,
          startX + cutPiece.x * scale + (cutPiece.width * scale / 2),
          startY + cutPiece.y * scale - 10
        );

        // Draw dimension lines
        ctx.beginPath();
        // Top width line
        ctx.moveTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 5);
        ctx.lineTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 5);
        ctx.stroke();

        // Top width ticks
        ctx.beginPath();
        ctx.moveTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 3);
        ctx.lineTo(startX + cutPiece.x * scale, startY + cutPiece.y * scale - 7);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 3);
        ctx.lineTo(startX + cutPiece.x * scale + cutPiece.width * scale, startY + cutPiece.y * scale - 7);
        ctx.stroke();
      }

      if (cutPiece.length * scale > 40) {
        // Length dimension on left
        ctx.fillText(
          lengthLabel,
          startX + cutPiece.x * scale - 15,
          startY + cutPiece.y * scale + (cutPiece.length * scale / 2)
        );

        // Left length line
        ctx.beginPath();
        ctx.moveTo(startX + cutPiece.x * scale - 5, startY + cutPiece.y * scale);
        ctx.lineTo(startX + cutPiece.x * scale - 5, startY + cutPiece.y * scale + cutPiece.length * scale);
        ctx.stroke();

        // Left length ticks
        ctx.beginPath();
        ctx.moveTo(startX + cutPiece.x * scale - 3, startY + cutPiece.y * scale);
        ctx.lineTo(startX + cutPiece.x * scale - 7, startY + cutPiece.y * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startX + cutPiece.x * scale - 3, startY + cutPiece.y * scale + cutPiece.length * scale);
        ctx.lineTo(startX + cutPiece.x * scale - 7, startY + cutPiece.y * scale + cutPiece.length * scale);
        ctx.stroke();
      }
    });
  }, [stockPiece, unit]);

  const waste = calculateWaste();
  const groupedPieces = groupPieces();

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 4,
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Case header with gradient */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          p: { xs: 1.5, sm: 2 },
          mx: { xs: -2, sm: -3 },
          mt: { xs: -2, sm: -3 },
          mb: 3,
          borderRadius: '2px 2px 0 0',
          background: 'linear-gradient(45deg, #003366 30%, #1976d2 90%)',
          textAlign: 'center'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          CASE {index + 1}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Cutting diagram - full width on mobile, left side on desktop */}
        <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              textAlign: { xs: 'center', md: 'left' }
            }}
          >
            Cutting Diagram
          </Typography>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid #eee',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.03)'
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </Box>
        </Grid>

        {/* Information tables - full width on mobile, right side on desktop */}
        <Grid item xs={12} md={5}>
          {/* Stock Information */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Stock Information
            </Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderRadius: 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Resource</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Width</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Length</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Area</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Case {index + 1}</TableCell>
                    <TableCell>{convertUnit(stockPiece.width, 0, unit).toFixed(1)} {getUnitLabel()}</TableCell>
                    <TableCell>{convertUnit(stockPiece.length, 0, unit).toFixed(1)} {getUnitLabel()}</TableCell>
                    <TableCell>
                      {(convertUnit(stockPiece.width, 0, unit) * convertUnit(stockPiece.length, 0, unit)).toFixed(2)} {getUnitLabel()}²
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Cut Parts */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Cut Parts
            </Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderRadius: 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                maxHeight: 200,
                overflow: 'auto'
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      Part
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      Width
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      Length
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      Count
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedPieces.map((group, idx) => (
                    <TableRow
                      key={idx}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{String.fromCharCode(65 + (idx % 26))}</TableCell>
                      <TableCell>{convertUnit(group.width, 0, unit).toFixed(1)} {getUnitLabel()}</TableCell>
                      <TableCell>{convertUnit(group.length, 0, unit).toFixed(1)} {getUnitLabel()}</TableCell>
                      <TableCell>{group.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Waste Information */}
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Waste Information
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'rgba(255, 0, 0, 0.05)',
                borderRadius: 1,
                borderColor: 'rgba(255, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-around',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Waste Area
                </Typography>
                <Typography variant="h6" color="error.main" sx={{ fontWeight: 600 }}>
                  {waste.wasteArea} {getUnitLabel()}²
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Divider sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Waste Percentage
                </Typography>
                <Typography variant="h6" color="error.main" sx={{ fontWeight: 600 }}>
                  {waste.wastePercentage}%
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

const OptimizationResult: React.FC<OptimizationResultProps> = ({ solution, unit, layout, cutWidth }) => {
  // Calculate overall statistics
  const calculateOverallStats = () => {
    let totalStockArea = 0;
    let totalUsedArea = 0;

    solution.stockPieces.forEach(stockPiece => {
      const stockArea = stockPiece.width * stockPiece.length;
      totalStockArea += stockArea;

      stockPiece.cutPieces.forEach(cutPiece => {
        totalUsedArea += cutPiece.width * cutPiece.length;
      });
    });

    const totalWasteArea = totalStockArea - totalUsedArea;
    const wastePercentage = ((totalWasteArea / totalStockArea) * 100).toFixed(2);

    return {
      totalStockPieces: solution.stockPieces.length,
      totalCutPieces: solution.stockPieces.reduce((sum, sp) => sum + sp.cutPieces.length, 0),
      totalStockArea: convertUnit(totalStockArea, 0, unit).toFixed(2),
      totalUsedArea: convertUnit(totalUsedArea, 0, unit).toFixed(2),
      totalWasteArea: convertUnit(totalWasteArea, 0, unit).toFixed(2),
      wastePercentage
    };
  };

  const stats = calculateOverallStats();
  const unitLabel = unit === 0 ? 'mm' : unit === 1 ? 'in' : 'ft';

  return (
    <Box sx={{
      mt: 4,
      maxWidth: '1200px',
      mx: 'auto', // Center the content
      px: { xs: 2, sm: 3 } // Responsive padding
    }}>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
          mb: 4,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header with gradient background */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            p: { xs: 2, sm: 3 },
            mx: { xs: -2, sm: -3, md: -4 }, // Extend to full width
            mt: { xs: -2, sm: -3, md: -4 }, // Extend to top edge
            mb: 4,
            borderRadius: '2px 2px 0 0',
            background: 'linear-gradient(45deg, #003366 30%, #1976d2 90%)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' } // Responsive font size
            }}
          >
            HDS Group Cutlist
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              opacity: 0.9,
              mt: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' } // Responsive font size
            }}
          >
            Optimization Results
          </Typography>
        </Box>

        {/* Summary Information */}
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              color: 'primary.main',
              mb: 3,
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60px',
                height: '3px',
                bgcolor: 'primary.main',
                borderRadius: '2px'
              }
            }}
          >
            Summary Information
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} md={6}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Parameter</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>Stock Pieces Used</TableCell>
                      <TableCell>{stats.totalStockPieces}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Cut Pieces Placed</TableCell>
                      <TableCell>{stats.totalCutPieces}</TableCell>
                    </TableRow>
                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>Total Stock Area</TableCell>
                      <TableCell>{stats.totalStockArea} {unitLabel}²</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Total Used Area</TableCell>
                      <TableCell>{stats.totalUsedArea} {unitLabel}²</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'rgba(255, 0, 0, 0.05)' }}>
                      <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>Total Waste Area</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {stats.totalWasteArea} {unitLabel}² ({stats.wastePercentage}%)
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={6}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Cutting Parameters</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>Layout Type</TableCell>
                      <TableCell>{layout === 0 ? 'Guillotine' : 'Nested'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Cut Width</TableCell>
                      <TableCell>{convertUnit(cutWidth, 0, unit).toFixed(2)} {unitLabel}</TableCell>
                    </TableRow>
                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>Unit</TableCell>
                      <TableCell>{unit === 0 ? 'Millimeters' : unit === 1 ? 'Inches' : 'Feet'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Box>

        <Divider
          sx={{
            my: 4,
            '&::before, &::after': {
              borderColor: 'primary.light',
            }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              px: 2,
              fontWeight: 500
            }}
          >
            CUTTING DETAILS
          </Typography>
        </Divider>

        <Typography
          variant="h5"
          gutterBottom
          sx={{
            textAlign: 'center',
            fontWeight: 600,
            color: 'primary.main',
            mb: 3,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '3px',
              bgcolor: 'primary.main',
              borderRadius: '2px'
            }
          }}
        >
          Cutting Layouts
        </Typography>

        {solution.stockPieces.map((stockPiece, index) => (
          <StockPieceRenderer
            key={index}
            stockPiece={stockPiece}
            index={index}
            unit={unit}
          />
        ))}
      </Paper>
    </Box>
  );
};

export default OptimizationResult;
