import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  CalendarToday as CalendarIcon,
  SquareFoot as SquareFootIcon,
  Straighten as StraightenIcon,
} from '@mui/icons-material';
import { getProjects, deleteProject } from '../services/api';

interface Project {
  _id: string;
  name: string;
  description?: string;
  unit: number;
  layout: number;
  width: number;
  pieces: any[];
  createdAt: string;
  updatedAt: string;
}

const ProjectList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const unitLabels = ['mm', 'inch', 'foot'];
  const layoutLabels = ['guillotine', 'nested'];

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter projects based on search term
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort projects
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'pieces') {
        return sortDirection === 'asc'
          ? a.pieces.length - b.pieces.length
          : b.pieces.length - a.pieces.length;
      }
      return 0;
    });

    setFilteredProjects(sorted);
  }, [projects, searchTerm, sortBy, sortDirection]);

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete);
      setSuccess('Project deleted successfully');
      fetchProjects();
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box sx={{ my: 4, width: '100%' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Project Library
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your HDS Group Cutlist projects and access your saved cutting layouts.
          </Typography>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SortIcon />}
                  onClick={() => handleSort('date')}
                  color={sortBy === 'date' ? 'primary' : 'inherit'}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SortIcon />}
                  onClick={() => handleSort('name')}
                  color={sortBy === 'name' ? 'primary' : 'inherit'}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SortIcon />}
                  onClick={() => handleSort('pieces')}
                  color={sortBy === 'pieces' ? 'primary' : 'inherit'}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Pieces {sortBy === 'pieces' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/optimizer"
                  startIcon={<AddIcon />}
                  size="small"
                >
                  New Project
                </Button>
              </Grid>
            </Grid>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 6, py: 6 }}>
                <CircularProgress />
              </Box>
            ) : filteredProjects.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.default' }}>
                {searchTerm ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      No matching projects found
                    </Typography>
                    <Typography variant="body1" paragraph color="text.secondary">
                      Try adjusting your search terms or clear the search.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      No projects found
                    </Typography>
                    <Typography variant="body1" paragraph color="text.secondary">
                      Start by creating a new project in the optimizer.
                    </Typography>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/optimizer"
                      startIcon={<AddIcon />}
                    >
                      Create First Project
                    </Button>
                  </>
                )}
              </Paper>
            ) : (
              <>
                {isMobile ? (
                  // Mobile card view
                  <Grid container spacing={3}>
                    {filteredProjects.map((project) => (
                      <Grid item xs={12} sm={6} key={project._id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                {project.name}
                              </Typography>
                              <Chip
                                label={unitLabels[project.unit]}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>

                            {project.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {project.description}
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(project.createdAt)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <SquareFootIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {layoutLabels[project.layout]}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <StraightenIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {project.pieces.length} pieces
                                </Typography>
                              </Box>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Tooltip title="View">
                                <IconButton
                                  component={RouterLink}
                                  to={`/projects/${project._id}`}
                                  color="primary"
                                  size="small"
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  component={RouterLink}
                                  to={`/projects/${project._id}/edit`}
                                  color="secondary"
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  onClick={() => handleDeleteClick(project._id)}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  // Desktop table view
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ bgcolor: 'primary.main' }}>
                        <TableRow>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Layout</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pieces</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Created</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow
                            key={project._id}
                            sx={{
                              '&:nth-of-type(odd)': { bgcolor: 'background.default' },
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500 }}>{project.name}</TableCell>
                            <TableCell>{project.description || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={unitLabels[project.unit]}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{layoutLabels[project.layout]}</TableCell>
                            <TableCell>{project.pieces.length}</TableCell>
                            <TableCell>{formatDate(project.createdAt)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="View Project">
                                  <IconButton
                                    component={RouterLink}
                                    to={`/projects/${project._id}`}
                                    color="primary"
                                    size="small"
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Project">
                                  <IconButton
                                    component={RouterLink}
                                    to={`/projects/${project._id}/edit`}
                                    color="secondary"
                                    size="small"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Project">
                                  <IconButton
                                    onClick={() => handleDeleteClick(project._id)}
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleDeleteCancel}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              autoFocus
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

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

export default ProjectList;
