import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CloseIcon from '@mui/icons-material/Close';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const navItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Projects', path: '/projects', icon: <FolderIcon /> },
    { text: 'Optimizer', path: '/optimizer', icon: <SquareFootIcon /> },
  ];

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">HDS Group Cutlist</Typography>
        <IconButton color="inherit" onClick={toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem
            button
            component={RouterLink}
            to={item.path}
            key={item.text}
            sx={{
              '&:hover': {
                bgcolor: 'primary.light',
                color: 'white'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ py: 1 }}>
          {isMobile ? (
            <>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h5"
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  fontWeight: 700,
                  color: 'white',
                  textDecoration: 'none',
                  flexGrow: 1,
                  justifyContent: 'center',
                  mr: 5 // Offset for the menu button to center the text
                }}
              >
                HDS Group Cutlist
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/"
                  sx={{
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    }
                  }}
                >
                  Home
                </Button>
              </Box>

              <Typography
                variant="h5"
                component={RouterLink}
                to="/"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  textDecoration: 'none',
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center'
                }}
              >
                HDS Group Cutlist
              </Typography>

              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                {navItems.slice(1).map((item) => (
                  <Button
                    key={item.text}
                    color="inherit"
                    component={RouterLink}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                      fontWeight: 500,
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            </>
          )}
        </Toolbar>
      </Container>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Header;
