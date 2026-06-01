import { useState, useEffect, type MouseEvent } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Avatar, Box, Badge,
  BottomNavigation, BottomNavigationAction, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, Container,
} from '@mui/material';
import {
  Home as HomeIcon,
  HomeOutlined as HomeOutlinedIcon,
  AddCircleOutlined as AddIcon,
  ListAlt as OrdersIcon,
  ListAltOutlined as OrdersOutlinedIcon,
  Person as PersonIcon,
  PersonOutlined as PersonOutlinedIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  NotificationsOutlined as NotifIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { getNotifications } from '@/api/notifications';

const NAV_ITEMS = [
  { label: '首页', icon: <HomeOutlinedIcon />, activeIcon: <HomeIcon />, path: '/' },
  { label: '发布', icon: <AddIcon />, activeIcon: <AddIcon />, path: '/demands/new' },
  { label: '订单', icon: <OrdersOutlinedIcon />, activeIcon: <OrdersIcon />, path: '/orders' },
  { label: '我的', icon: <PersonOutlinedIcon />, activeIcon: <PersonIcon />, path: '/users/me' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 轮询未读通知数（铃铛红点）
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () => {
      getNotifications(1, 1).then((res) => {
        if (res.data) setUnreadCount(res.data.unreadCount);
      });
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const currentTab = NAV_ITEMS.findIndex((item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

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
      {/* AppBar — 南大紫 */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          borderBottom: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 56 } }}>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
            }}
            onClick={() => navigate('/')}
          >
            CampusHub
          </Typography>

          {isAuthenticated ? (
            <>
              <IconButton
                color="inherit"
                size="small"
                sx={{ mr: 0.5, transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
                onClick={() => navigate('/notifications')}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotifIcon />
                </Badge>
              </IconButton>
              <IconButton
                size="small"
                onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
                sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
              >
                <Avatar
                  src={user?.avatar}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'secondary.main',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {user?.nickname?.[0]}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: -6, horizontal: 'right' }}
                slotProps={{ paper: { sx: { borderRadius: 3, mt: 0.5, minWidth: 180 } } }}
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

      {/* 内容区 — 带淡入动画 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 2,
          pb: 9,
          animation: 'fadeInUp 0.35s ease',
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Container>
          <Outlet />
        </Container>
      </Box>

      {/* 底部导航 — 白底 + 选中态紫色圆点 */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
        <BottomNavigation
          value={currentTab >= 0 ? currentTab : 0}
          onChange={handleNav}
          showLabels
          sx={{
            backgroundColor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {NAV_ITEMS.map((item, index) => {
            const active = currentTab === index;
            return (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active ? item.activeIcon : item.icon}
                    {active && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                        }}
                      />
                    )}
                  </Box>
                }
                sx={{
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                }}
              />
            );
          })}
        </BottomNavigation>
      </Box>
    </Box>
  );
}
