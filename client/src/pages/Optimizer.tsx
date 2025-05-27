import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import OptimizationIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { optimizeCutting, getPdfUrl } from '../services/api';
import OptimizationResult from '../components/OptimizationResult';

interface Piece {
  width: number;
  length: number;
  amount: number;
  pattern: number;
  kind: number;
}

const Optimizer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState<number>(0);
  const [unit, setUnit] = useState<number>(0);
  const [layout, setLayout] = useState<number>(0);
  const [cutWidth, setCutWidth] = useState<number>(3);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentPiece, setCurrentPiece] = useState<Piece>({
    width: 100,
    length: 100,
    amount: 1,
    pattern: 0,
    kind: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('New Project');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [optimizationSolution, setOptimizationSolution] = useState<any>(null);

  const unitLabels = ['mm', 'inch', 'foot'];
  const patternLabels = ['none', 'parallel to width', 'parallel to length'];
  const kindLabels = ['cut piece', 'stock piece'];
  const layoutLabels = ['guillotine', 'nested'];

  const steps = [
    { label: 'Settings', icon: <SettingsIcon /> },
    { label: 'Add Pieces', icon: <FormatListBulletedIcon /> },
    { label: 'Optimize', icon: <OptimizationIcon /> }
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleUnitChange = (event: any) => {
    setUnit(Number(event.target.value));
  };

  const handleLayoutChange = (event: any) => {
    setLayout(Number(event.target.value));
  };

  const handlePieceChange = (field: keyof Piece, value: number) => {
    setCurrentPiece({
      ...currentPiece,
      [field]: value,
    });
  };

  const handleAddPiece = () => {
    setPieces([...pieces, currentPiece]);
    setCurrentPiece({
      ...currentPiece,
      width: 100,
      length: 100,
      amount: 1,
    });
  };

  const handleRemovePiece = (index: number) => {
    const newPieces = [...pieces];
    newPieces.splice(index, 1);
    setPieces(newPieces);
  };

  const handleClearPieces = () => {
    setPieces([]);
    setPdfUrl(null);
  };

  const handleOptimize = async () => {
    // Validate input
    const hasStockPieces = pieces.some(piece => piece.kind === 1);
    const hasCutPieces = pieces.some(piece => piece.kind === 0);

    if (!hasStockPieces || !hasCutPieces) {
      setError('You need at least one stock piece and one cut piece');
      return;
    }

    setLoading(true);
    setError(null);
    setPdfUrl(null);
    setOptimizationSolution(null);

    try {
      const result = await optimizeCutting({
        pieces,
        unit,
        width: cutWidth,
        layout,
      });

      setSuccess('Optimization completed successfully');
      setPdfUrl(getPdfUrl(result.pdfId));
      setOptimizationSolution(result.solution);
      // Move to the results step
      setActiveStep(2);
    } catch (err) {
      setError('Error during optimization. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{
      px: { xs: 2, sm: 3 },
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      pb: 4
    }}>
      <Box sx={{
        mt: 3,
        mb: 2,
        width: '100%'
      }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          HDS Group Cutlist Optimizer
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create optimized cutting layouts for your panels with our advanced optimization engine.
        </Typography>
      </Box>

      <Box sx={{
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>

        <Card sx={{
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          minHeight: {
            xs: '600px',  // Mobile
            sm: '700px',  // Tablet
            md: '800px'   // Desktop
          },
          maxHeight: {
            xs: 'calc(100vh - 100px)',  // Mobile
            sm: 'calc(100vh - 120px)',  // Tablet
            md: 'calc(100vh - 140px)'   // Desktop
          },
          overflow: 'auto'
        }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  variant="standard"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  sx={{
                    fontWeight: 'bold',
                    '& .MuiInputBase-input': {
                      fontSize: '1.25rem',
                      fontWeight: 600
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none'
                    }
                  }}
                />
              </Box>
            }
            subheader={
              <TextField
                variant="standard"
                placeholder="Add project description (optional)"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                fullWidth
                multiline
                sx={{ mt: 1 }}
              />
            }
          />
          <Divider />
          <CardContent sx={{
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Stepper
              activeStep={activeStep}
              alternativeLabel={!isMobile}
              orientation={isMobile ? 'vertical' : 'horizontal'}
              sx={{ mb: 4 }}
            >
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconProps={{
                      icon: step.icon
                    }}
                    onClick={() => setActiveStep(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Project Settings
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Unit</InputLabel>
                      <Select
                        value={unit}
                        label="Unit"
                        onChange={handleUnitChange}
                      >
                        {unitLabels.map((label, index) => (
                          <MenuItem key={index} value={index}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Select the measurement unit for your project
                      </Typography>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Layout</InputLabel>
                      <Select
                        value={layout}
                        label="Layout"
                        onChange={handleLayoutChange}
                      >
                        {layoutLabels.map((label, index) => (
                          <MenuItem key={index} value={index}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Choose the cutting layout algorithm
                      </Typography>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label={`Cut Width (${unitLabels[unit]})`}
                      type="number"
                      value={cutWidth}
                      onChange={(e) => setCutWidth(Number(e.target.value))}
                      inputProps={{ min: 0, max: 15, step: 0.1 }}
                      variant="outlined"
                      helperText="Width of the cutting blade"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    size="large"
                  >
                    Next: Add Pieces
                  </Button>
                </Box>
              </Box>
            )}

            {activeStep === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Add Pieces
                </Typography>
                <Card variant="outlined" sx={{ mb: 4, p: 2, bgcolor: 'background.default' }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={6} md={2}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Piece Type</InputLabel>
                        <Select
                          value={currentPiece.kind}
                          label="Piece Type"
                          onChange={(e) => handlePieceChange('kind', Number(e.target.value))}
                        >
                          {kindLabels.map((label, index) => (
                            <MenuItem key={index} value={index}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        label={`Width (${unitLabels[unit]})`}
                        type="number"
                        value={currentPiece.width}
                        onChange={(e) => handlePieceChange('width', Number(e.target.value))}
                        inputProps={{ min: 1 }}
                        size="small"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        label={`Length (${unitLabels[unit]})`}
                        type="number"
                        value={currentPiece.length}
                        onChange={(e) => handlePieceChange('length', Number(e.target.value))}
                        inputProps={{ min: 1 }}
                        size="small"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        label="Amount"
                        type="number"
                        value={currentPiece.amount}
                        onChange={(e) => handlePieceChange('amount', Number(e.target.value))}
                        inputProps={{ min: 1 }}
                        size="small"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Pattern</InputLabel>
                        <Select
                          value={currentPiece.pattern}
                          label="Pattern"
                          onChange={(e) => handlePieceChange('pattern', Number(e.target.value))}
                        >
                          {patternLabels.map((label, index) => (
                            <MenuItem key={index} value={index}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddPiece}
                        fullWidth
                        startIcon={<AddIcon />}
                        size="medium"
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                </Card>

                {pieces.length > 0 ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Piece List ({pieces.length} pieces)
                      </Typography>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleClearPieces}
                        size="small"
                        startIcon={<DeleteIcon />}
                      >
                        Clear All
                      </Button>
                    </Box>
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{
                        mb: 3,
                        maxHeight: {
                          xs: '400px',  // Mobile
                          sm: '500px',  // Tablet
                          md: '600px'   // Desktop
                        },
                        overflow: 'auto'
                      }}
                    >
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Type
                            </TableCell>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Width ({unitLabels[unit]})
                            </TableCell>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Length ({unitLabels[unit]})
                            </TableCell>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Amount
                            </TableCell>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Pattern
                            </TableCell>
                            <TableCell
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pieces.map((piece, index) => (
                            <TableRow key={index} sx={{
                              '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
                              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                            }}>
                              <TableCell>{kindLabels[piece.kind]}</TableCell>
                              <TableCell>{piece.width}</TableCell>
                              <TableCell>{piece.length}</TableCell>
                              <TableCell>{piece.amount}</TableCell>
                              <TableCell>{patternLabels[piece.pattern]}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemovePiece(index)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body1" color="text.secondary">
                      No pieces added yet. Add at least one stock piece and one cut piece.
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                  >
                    Back to Settings
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOptimize}
                    disabled={loading || pieces.length === 0}
                    startIcon={loading ? <CircularProgress size={20} /> : <OptimizationIcon />}
                  >
                    {loading ? 'Optimizing...' : 'Optimize Now'}
                  </Button>
                </Box>
              </Box>
            )}

            {activeStep === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Optimization Results
                </Typography>

                {optimizationSolution ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {pdfUrl && (
                        <Button
                          variant="contained"
                          color="primary"
                          href={pdfUrl}
                          target="_blank"
                          startIcon={<DownloadIcon />}
                        >
                          Download PDF
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setActiveStep(1);
                        }}
                      >
                        Modify Pieces
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                          setPieces([]);
                          setPdfUrl(null);
                          setOptimizationSolution(null);
                          setActiveStep(0);
                        }}
                      >
                        New Project
                      </Button>
                    </Box>

                    {/* Interactive Web-based Optimization Result */}
                    <OptimizationResult
                      solution={optimizationSolution}
                      unit={unit}
                      layout={layout}
                      cutWidth={cutWidth}
                    />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" gutterBottom>
                      No optimization results yet
                    </Typography>
                    <Typography variant="body1" paragraph color="text.secondary">
                      Go back to add pieces and run the optimization
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(1)}
                    >
                      Back to Pieces
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)} variant="filled">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)} variant="filled">
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Optimizer;
