import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  SquareFoot as SquareFootIcon,
  Straighten as StraightenIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { getProject, optimizeCutting, getPdfUrl } from '../services/api';

interface Piece {
  width: number;
  length: number;
  amount: number;
  pattern: number;
  kind: number;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  unit: number;
  layout: number;
  width: number;
  pieces: Piece[];
  createdAt: string;
  updatedAt: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  const unitLabels = ['mm', 'inch', 'foot'];
  const patternLabels = ['none', 'parallel to width', 'parallel to length'];
  const kindLabels = ['cut piece', 'stock piece'];
  const layoutLabels = ['guillotine', 'nested'];

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const data = await getProject(id);
        setProject(data);
      } catch (err) {
        setError('Failed to load project');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleOptimize = async () => {
    if (!project) return;

    setOptimizing(true);
    setError(null);
    setPdfUrl(null);

    try {
      const result = await optimizeCutting({
        pieces: project.pieces,
        unit: project.unit,
        width: project.width,
        layout: project.layout,
      });

      setSuccess('Optimization completed successfully');
      setPdfUrl(getPdfUrl(result.pdfId));
    } catch (err) {
      setError('Error during optimization. Please try again.');
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStockPiecesCount = () => {
    if (!project) return 0;
    return project.pieces.filter(p => p.kind === 1).length;
  };

  const getCutPiecesCount = () => {
    if (!project) return 0;
    return project.pieces.filter(p => p.kind === 0).length;
  };

  const getTotalPiecesCount = () => {
    if (!project) return 0;
    return project.pieces.reduce((sum, piece) => sum + piece.amount, 0);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography variant="h5" gutterBottom>
              Project Not Found
            </Typography>
            <Typography variant="body1" paragraph>
              The project you're looking for doesn't exist or has been deleted.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/projects')}
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 2 }}
            >
              Back to Projects
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box sx={{ my: 4, width: '100%' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            color="inherit"
            href="/projects"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <ArrowBackIcon sx={{ mr: 0.5 }} fontSize="small" />
            Projects
          </Link>
          <Typography color="text.primary">{project.name}</Typography>
        </Breadcrumbs>

        {/* Project Header */}
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {project.name}
              </Typography>
            }
            subheader={
              project.description && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <DescriptionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    {project.description}
                  </Typography>
                </Box>
              )
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to={`/projects/${project._id}/edit`}
                  startIcon={<EditIcon />}
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOptimize}
                  disabled={optimizing}
                  startIcon={optimizing ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {optimizing ? 'Optimizing...' : 'Optimize'}
                </Button>
                <IconButton
                  color="secondary"
                  component={RouterLink}
                  to={`/projects/${project._id}/edit`}
                  sx={{ display: { xs: 'flex', sm: 'none' } }}
                >
                  <EditIcon />
                </IconButton>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Chip
                    label={unitLabels[project.unit]}
                    color="primary"
                    sx={{ mb: 1, px: 1, fontWeight: 'bold' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Unit
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {layoutLabels[project.layout]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Layout Algorithm
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {project.width} {unitLabels[project.unit]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cut Width
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatDate(project.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Pieces Section */}
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  Pieces
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip
                    label={`${getStockPiecesCount()} Stock Pieces`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${getCutPiecesCount()} Cut Pieces`}
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${getTotalPiecesCount()} Total Items`}
                    color="default"
                    variant="outlined"
                  />
                </Box>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Width ({unitLabels[project.unit]})</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Length ({unitLabels[project.unit]})</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pattern</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.pieces.map((piece, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'background.default' },
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={kindLabels[piece.kind]}
                          color={piece.kind === 1 ? 'primary' : 'secondary'}
                          size="small"
                          variant={piece.kind === 1 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{piece.width}</TableCell>
                      <TableCell>{piece.length}</TableCell>
                      <TableCell>{piece.amount}</TableCell>
                      <TableCell>{patternLabels[piece.pattern]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Optimization Results */}
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Optimization Results
              </Typography>
            }
            action={
              pdfUrl && (
                <Button
                  variant="contained"
                  color="primary"
                  href={pdfUrl}
                  target="_blank"
                  startIcon={<DownloadIcon />}
                >
                  Download PDF
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
            {pdfUrl ? (
              <Box
                className="pdf-viewer"
                sx={{
                  height: 600,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <iframe
                  src={pdfUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Optimization Result"
                />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" gutterBottom>
                  No optimization results yet
                </Typography>
                <Typography variant="body1" paragraph color="text.secondary">
                  Click the Optimize button to generate cutting layouts for this project.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOptimize}
                  disabled={optimizing}
                  startIcon={optimizing ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {optimizing ? 'Optimizing...' : 'Run Optimization'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Snackbars for notifications */}
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

export default ProjectDetail;
