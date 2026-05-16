import { Container, Typography, Box, Card, Stack, Chip } from '@mui/material';
import { HandshakeOutlined, SchoolOutlined, StarsOutlined } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';

const FEATURES = [
  { icon: <HandshakeOutlined sx={{ fontSize: 36 }} />, title: '互助互帮', desc: '发布需求或接单帮助同学，共建校园互助社区' },
  { icon: <StarsOutlined sx={{ fontSize: 36 }} />, title: '信用体系', desc: '完成订单积累信用分，优质服务者更受信赖' },
  { icon: <SchoolOutlined sx={{ fontSize: 36 }} />, title: '校园专属', desc: '面向南京大学学生，实名认证更安全' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth="md">
      {/* Hero */}
      <Box sx={{ textAlign: 'center', py: { xs: 6, md: 8 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          CampusHub
        </Typography>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
          校园互助服务平台
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
          快递代取、学习辅导、二手交易… 发布你的需求，或者帮助身边的同学
        </Typography>
        {!isAuthenticated && (
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Chip label="开始使用" component="a" href="/register" clickable color="primary" />
            <Chip label="已有账号？登录" component="a" href="/login" clickable variant="outlined" />
          </Stack>
        )}
      </Box>

      {/* 特性 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        {FEATURES.map((f) => (
          <Card key={f.title} sx={{ textAlign: 'center', py: 3 }}>
            <Box sx={{ color: 'primary.main', mb: 1 }}>{f.icon}</Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{f.title}</Typography>
            <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
          </Card>
        ))}
      </Box>

      {/* 占位 */}
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary">
          需求广场正在开发中，即将呈现…
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          CampusHub v0.1
        </Typography>
      </Box>
    </Container>
  );
}
