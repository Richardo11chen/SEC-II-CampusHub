import { Container, Typography, Box } from '@mui/material';

export default function HomePage() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          需求广场
        </Typography>
        <Typography variant="body1" color="text.secondary">
          这里将展示所有互助需求（T15 实现）
        </Typography>
        <Typography variant="caption" color="primary" sx={{ mt: 2, display: 'block' }}>
          CampusHub v0.1
        </Typography>
      </Box>
    </Container>
  );
}
