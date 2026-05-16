import { Container, Typography, Box } from '@mui/material';

export default function NotificationsPage() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          通知
        </Typography>
        <Typography variant="body1" color="text.secondary">
          通知列表（T34 实现）
        </Typography>
      </Box>
    </Container>
  );
}
