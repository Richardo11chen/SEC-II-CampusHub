import { Container, Typography, Box } from '@mui/material';

export default function OrderDetailPage() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          订单详情
        </Typography>
        <Typography variant="body1" color="text.secondary">
          订单详情页（T24 实现）
        </Typography>
      </Box>
    </Container>
  );
}
