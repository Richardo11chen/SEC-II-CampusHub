import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Avatar,
  Button, Divider, CircularProgress, Alert, Snackbar, Dialog,
  DialogContent, IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  AccessTime as TimeIcon, Place as PlaceIcon, MonetizationOn as RewardIcon,
  ArrowBack as BackIcon, HandshakeOutlined as HandshakeIcon,
  DeleteOutlined as DeleteIcon,
} from '@mui/icons-material';
import { getDemand, deleteDemand } from '@/api/demands';
import { createOrder } from '@/api/orders';
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
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [takingOrder, setTakingOrder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'error',
  });

  useEffect(() => {
    if (!id) return;
    getDemand(Number(id)).then((res) => {
      if (res.data) {
        setDemand(res.data);
        if (res.data.images.length > 0) setSelectedImage(res.data.images[0].url);
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
  const canTake = demand.status === '开放' && !!user && !isOwn;
  const isOrderParticipant = demand.currentOrder && (isOwn || user?.id === demand.currentOrder.provider.id);

  const handleTakeOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setTakingOrder(true);
    const res = await createOrder(Number(id));
    if (res.data) {
      navigate(`/orders/${res.data.id}`);
    } else {
      setTakingOrder(false);
      setSnackbar({ open: true, message: res.error || '操作失败', severity: 'error' });
    }
  };

  const handleDeleteDemand = async () => {
    if (!window.confirm('确定要删除这个需求吗？删除后不可恢复。')) return;
    setDeleting(true);
    const res = await deleteDemand(Number(id));
    if (!res.error) {
      setSnackbar({ open: true, message: '需求已删除', severity: 'success' });
      setTimeout(() => navigate('/orders', { replace: true }), 1000);
    } else {
      setDeleting(false);
      setSnackbar({ open: true, message: res.error, severity: 'error' });
    }
  };

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
              onClick={() => setPreviewOpen(true)}
              sx={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block', bgcolor: 'grey.100', cursor: 'pointer' }}
            />
          )}
          {demand.images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 0.5, p: 1, overflow: 'auto' }}>
              {demand.images.map((img) => (
                <Box
                  key={img.id}
                  component="img"
                  src={img.url}
                  onClick={() => setSelectedImage(img.url)}
                  sx={{
                    width: 64, height: 64, objectFit: 'cover', borderRadius: 1, cursor: 'pointer',
                    border: selectedImage === img.url ? 2 : 0, borderColor: 'primary.main',
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

        </CardContent>
      </Card>

      {/* 发布者信息 */}
      <Card sx={{ mt: 2, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: 'primary.main' } }}>
        <CardContent sx={{ p: 3, pl: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={publisher.avatar || undefined}
            sx={{ width: 48, height: 48, bgcolor: 'secondary.main', fontWeight: 600 }}
          >
            {publisher.nickname[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {demand.isAnonymous ? '匿名用户' : publisher.nickname}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              信用分 {publisher.creditScore}
            </Typography>
          </Box>
          {!demand.isAnonymous && (
            <Button size="small" onClick={() => navigate(`/users/${publisher.id}`)}>
              查看主页
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 当前订单状态 */}
      {demand.currentOrder && demand.currentOrder.status !== '已取消' && (
        <Card sx={{ mt: 2, bgcolor: 'primary.main', color: '#fff' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                当前订单：{demand.currentOrder.provider.nickname} 已接单
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                状态：{demand.status}
              </Typography>
            </Box>
            {isOrderParticipant && (
              <Button
                variant="contained"
                size="small"
                sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                onClick={() => navigate(`/orders/${demand.currentOrder!.id}`)}
              >
                查看订单
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 底部操作栏 — 发布者删除 */}
      {isOwn && demand.status === '开放' && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            mt: 2,
            py: 2,
            px: { xs: 2, sm: 3 },
            bgcolor: '#FAF8FC',
            borderTop: '1px solid',
            borderColor: 'divider',
            borderRadius: '16px 16px 0 0',
            zIndex: 10,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            fullWidth
            size="large"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteDemand}
            loading={deleting}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 700 }}
          >
            删除需求
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            删除后将无法恢复
          </Typography>
        </Box>
      )}

      {/* 底部操作栏 — 接单 */}
      {!isOwn && (canTake || (!user && demand.status === '开放')) && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            mt: 2,
            py: 2,
            px: { xs: 2, sm: 3 },
            bgcolor: '#FAF8FC',
            borderTop: '1px solid',
            borderColor: 'divider',
            borderRadius: '16px 16px 0 0',
            zIndex: 10,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            startIcon={<HandshakeIcon />}
            onClick={handleTakeOrder}
            loading={takingOrder}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 700 }}
          >
            {user ? '接单' : '登录后接单'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            报酬 {formatReward(demand.reward)}{user ? '' : ' · 登录后即可接单'}
          </Typography>
        </Box>
      )}

      {/* 图片放大预览 */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth={false} sx={{ '& .MuiDialog-paper': { bgcolor: 'black', maxWidth: '95vw', maxHeight: '95vh' } }}>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' }, zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
          <Box component="img" src={selectedImage} alt="预览" sx={{ maxWidth: '100%', maxHeight: '90vh', display: 'block' }} />
        </DialogContent>
      </Dialog>

      {/* 操作反馈 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
