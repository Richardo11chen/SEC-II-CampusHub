import { useState, type MouseEvent } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Avatar, Box,
  BottomNavigation, BottomNavigationAction, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, Container,
} from '@mui/material';
import {
  Home as HomeIcon,
  AddCircleOutlined as AddIcon,
  ListAlt as OrdersIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Notifications as NotifIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { label: '首页', icon: <HomeIcon />, path: '/' },
  { label: '发布', icon: <AddIcon />, path: '/demands/new' },
  { label: '订单', icon: <OrdersIcon />, path: '/orders' },
  { label: '我的', icon: <PersonIcon />, path: '/users/me' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const currentTab = NAV_ITEMS.findIndex((item) => location.pathname.startsWith(item.path));

  const handleNav = (_: unknown, index: number) => {
    navigate(NAV_ITEMS[index].path);
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="sticky" elevation={0} sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)' }}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }}
            onClick={() => navigate('/')}
          >
            CampusHub
          </Typography>

          {isAuthenticated ? (
            <>
              <IconButton color="inherit" size="small" sx={{ mr: 1 }} onClick={() => navigate('/notifications')}>
                <NotifIcon />
              </IconButton>
              <IconButton size="small" onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}>
                <Avatar src={user?.avatar} sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user?.nickname?.[0]}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {user?.nickname}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/users/me'); }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>个人资料</ListItemText>
                </MenuItem>
                {user?.role === 'admin' && (
                  <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin'); }}>
                    <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>管理后台</ListItemText>
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>退出登录</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <IconButton color="inherit" size="small" onClick={() => navigate('/login')}>
              <LoginIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* 内容区 */}
      <Container component="main" sx={{ flexGrow: 1, py: 2, pb: 9 }}>
        <Outlet />
      </Container>

      {/* 底部导航 */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
        <BottomNavigation
          value={currentTab >= 0 ? currentTab : 0}
          onChange={handleNav}
          showLabels
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
          ))}
        </BottomNavigation>
      </Box>
    </Box>
  );
}
