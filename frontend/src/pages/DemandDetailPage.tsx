import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Avatar,
  Button, Divider, CircularProgress, Alert,
} from '@mui/material';
import {
  AccessTime as TimeIcon, Place as PlaceIcon, MonetizationOn as RewardIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { getDemand } from '@/api/demands';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatReward, demandStatusColor } from '@/utils/format';
import type { Demand } from '@/types';

export default function DemandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDemand(Number(id)).then((res) => {
      if (res.data) {
        setDemand(res.data);
        if (res.data.images.length > 0) setSelectedImage(res.data.images[0]);
      } else {
        setError(res.error || '需求不存在');
      }
    }).catch(() => setError('加载失败')).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !demand) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Alert severity="error" action={<Button size="small" onClick={() => navigate('/')}>返回首页</Button>}>
          {error || '需求不存在'}
        </Alert>
      </Container>
    );
  }

  const publisher = demand.publisher;
  const isOwn = user?.id === publisher.id;
  const canTake = demand.status === '开放' && !isOwn;

  return (
    <Container maxWidth="md">
      {/* 返回 */}
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>返回</Button>

      {/* 图片画廊 */}
      {demand.images.length > 0 && (
        <Card sx={{ mb: 2, overflow: 'hidden' }}>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="需求图片"
              sx={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block', bgcolor: 'grey.100' }}
            />
          )}
          {demand.images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 0.5, p: 1, overflow: 'auto' }}>
              {demand.images.map((img) => (
                <Box
                  key={img}
                  component="img"
                  src={img}
                  onClick={() => setSelectedImage(img)}
                  sx={{
                    width: 64, height: 64, objectFit: 'cover', borderRadius: 1, cursor: 'pointer',
                    border: selectedImage === img ? 2 : 0, borderColor: 'primary.main',
                  }}
                />
              ))}
            </Box>
          )}
        </Card>
      )}

      {/* 主信息 */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={demand.category} size="small" color="primary" variant="outlined" />
            <Chip label={demand.status} size="small" color={demandStatusColor(demand.status)} />
            {demand.isUrgent && <Chip label="紧急" size="small" color="error" />}
            {demand.isAnonymous && <Chip label="匿名" size="small" variant="outlined" />}
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{demand.title}</Typography>

          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.8 }}>
            {demand.description}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* 元信息 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RewardIcon fontSize="small" color="primary" />
              <Typography variant="body2">{formatReward(demand.reward)}</Typography>
            </Box>
            {demand.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlaceIcon fontSize="small" color="action" />
                <Typography variant="body2">{demand.location}</Typography>
              </Box>
            )}
            {demand.expectedTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="body2">期望 {formatDateTime(demand.expectedTime)}</Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.disabled">
              发布于 {formatDateTime(demand.createdAt)}
            </Typography>
          </Box>

          {/* 接单按钮 */}
          {canTake && (
            <Button variant="contained" fullWidth size="large" sx={{ mt: 1 }}>
              接单
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 发布者信息 */}
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={publisher.avatar} sx={{ width: 48, height: 48, bgcolor: 'secondary.main' }}>
            {publisher.nickname[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {demand.isAnonymous ? '匿名用户' : publisher.nickname}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              信用分 {publisher.creditScore} · 加入于 {new Date(publisher.joinedAt).toLocaleDateString('zh-CN')}
            </Typography>
          </Box>
          {!demand.isAnonymous && (
            <Button size="small" onClick={() => navigate(`/users/${publisher.id}`)}>
              查看主页
            </Button>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
