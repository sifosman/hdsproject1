import { Container, Typography, Button, Box, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SquareFootIcon from '@mui/icons-material/SquareFoot';

const Home = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 140px)', // Adjust for header and footer
        textAlign: 'center',
        px: 2
      }}
    >
      <Typography
        variant="h2"
        component="h1"
        gutterBottom
        sx={{
          fontWeight: 700,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
          mb: 3
        }}
      >
        HDS Group Cutlist
      </Typography>

      <Typography
        variant="h5"
        paragraph
        sx={{
          mb: 4,
          maxWidth: '800px',
          color: 'text.secondary'
        }}
      >
        Professional panel cutting optimization software with API integration
      </Typography>

      <Button
        variant="contained"
        component={RouterLink}
        to="/optimizer"
        size="large"
        sx={{
          px: 4,
          py: 1.5,
          fontSize: '1.1rem'
        }}
        startIcon={<SquareFootIcon />}
      >
        Start Optimizing
      </Button>
    </Box>
  );
};

export default Home;
