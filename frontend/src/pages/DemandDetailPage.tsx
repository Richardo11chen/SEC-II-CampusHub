import { useParams } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

export default function DemandDetailPage() {
  const { id } = useParams();

  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          需求详情
        </Typography>
        <Typography variant="body1" color="text.secondary">
          需求 #{id} 的详细信息（T16 实现）
        </Typography>
      </Box>
    </Container>
  );
}
