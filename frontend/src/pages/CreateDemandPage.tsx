import { Container, Typography, Box } from '@mui/material';

export default function CreateDemandPage() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          发布需求
        </Typography>
        <Typography variant="body1" color="text.secondary">
          需求发布表单（T14 实现）
        </Typography>
      </Box>
    </Container>
  );
}
