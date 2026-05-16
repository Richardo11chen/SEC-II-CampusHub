import { Container, Typography, Box } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function UserPublicPage() {
  const { id } = useParams();
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          用户主页
        </Typography>
        <Typography variant="body1" color="text.secondary">
          用户 #{id} 的公开资料（T28 实现）
        </Typography>
      </Box>
    </Container>
  );
}
