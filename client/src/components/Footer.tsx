import { Box, Typography, Container } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.primary.dark,
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2">
          © {new Date().getFullYear()} HDS Group Cutlist. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
