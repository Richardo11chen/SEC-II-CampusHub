import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Avatar, Button,
  Divider, CircularProgress, Alert, Snackbar, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Rating,
} from '@mui/material';
import { ArrowBack as BackIcon, ChatOutlined as ChatIcon } from '@mui/icons-material';
import {
  getOrder, completeOrder, confirmOrder, cancelOrder, disputeOrder,
} from '@/api/orders';
import { createReview, getMyReview } from '@/api/reviews';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatReward, orderStatusColor } from '@/utils/format';
import type { OrderDetail, Review } from '@/types';

const STEPS = ['进行中', '待确认', '已完成'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [cancelDialog, setCancelDialog] = useState({ open: false, reason: '' });
  const [disputeDialog, setDisputeDialog] = useState({ open: false, reason: '' });

  // 评价状态
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const refreshOrder = () => {
    if (!id) return;
    getOrder(Number(id))
      .then((res) => {
        if (res.data) setOrder(res.data);
      });
  };

  useEffect(() => {
    if (!id) return;
    getOrder(Number(id))
      .then((res) => {
        if (res.data) {
          setOrder(res.data);
          setError('');
        } else {
          setError(res.error || '订单不存在');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  // 加载已有评价（订单已完成时）
  useEffect(() => {
    if (!order || order.status !== '已完成') return;
    getMyReview(order.id).then((res) => {
      if (res.data) setExistingReview(res.data);
    });
  }, [order]);

  if (!id) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Alert severity="error" action={<Button size="small" onClick={() => navigate('/orders')}>返回订单列表</Button>}>
          订单 ID 无效
        </Alert>
      </Container>
    );
  }

  const isPublisher = user?.id === order?.publisherId;
  const isProvider = user?.id === order?.providerId;
  const status = order?.status;

  const showComplete = isProvider && status === '进行中';
  const showConfirm = isPublisher && status === '待确认';
  const showCancel = status === '进行中';
  const showDispute = status === '进行中' || status === '待确认';
  const showChat = (status === '进行中' || status === '待确认') && (isPublisher || isProvider);
  const handleComplete = async () => {
    if (!order) return;
    setActionLoading(true);
    const res = await completeOrder(order.id);
    if (res.data) {
      setSnackbar({ open: true, message: '已提交完成，等待发布者确认', severity: 'success' });
      refreshOrder();
    } else {
      setSnackbar({ open: true, message: res.error || '操作失败', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleConfirm = async () => {
    if (!order) return;
    setActionLoading(true);
    const res = await confirmOrder(order.id);
    if (res.data) {
      setSnackbar({ open: true, message: '已确认完成', severity: 'success' });
      refreshOrder();
    } else {
      setSnackbar({ open: true, message: res.error || '操作失败', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!order) return;
    setActionLoading(true);
    const res = await cancelOrder(order.id, cancelDialog.reason.trim() || undefined);
    if (res.data) {
      setSnackbar({ open: true, message: '订单已取消', severity: 'success' });
      setCancelDialog({ open: false, reason: '' });
      refreshOrder();
    } else {
      setSnackbar({ open: true, message: res.error || '操作失败', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleDispute = async () => {
    if (!order || !disputeDialog.reason.trim()) return;
    setActionLoading(true);
    const res = await disputeOrder(order.id, disputeDialog.reason.trim());
    if (res.data) {
      setSnackbar({ open: true, message: '纠纷已提交', severity: 'success' });
      setDisputeDialog({ open: false, reason: '' });
      refreshOrder();
    } else {
      setSnackbar({ open: true, message: res.error || '操作失败', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!order || rating === 0) {
      setSnackbar({ open: true, message: '请选择评分', severity: 'error' });
      return;
    }
    setReviewSubmitting(true);
    const res = await createReview({
      orderId: order.id,
      rating,
      content: reviewContent.trim() || undefined,
    });
    if (res.data) {
      setExistingReview(res.data);
      setSnackbar({ open: true, message: '评价成功', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: res.error || '提交评价失败', severity: 'error' });
    }
    setReviewSubmitting(false);
  };

  const activeStep = status ? STEPS.indexOf(status) : -1;

  return (
    <Container maxWidth="md">
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        返回
      </Button>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" action={
          <Button size="small" onClick={() => navigate('/orders')}>返回订单列表</Button>
        }>
          {error}
        </Alert>
      )}

      {!loading && !error && order && (
        <>
          {/* 需求信息卡片 */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip label={order.demand.category} size="small" variant="outlined" />
                <Chip label={order.status} size="small" color={orderStatusColor(order.status)} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {order.demandTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                报酬：{formatReward(order.reward)}
              </Typography>
            </CardContent>
          </Card>

          {/* 状态时间线 */}
          {['已取消', '纠纷中'].includes(order.status) ? (
            <Alert
              severity={order.status === '纠纷中' ? 'error' : 'warning'}
              sx={{ mb: 3 }}
            >
              {order.status === '已取消'
                ? '该订单已取消'
                : '该订单正在纠纷处理中'}
            </Alert>
          ) : (
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {/* 发布者卡片 */}
          <Card sx={{ mb: 1.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                发布者
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={order.publisher.avatar || undefined}
                  sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}
                >
                  {order.publisher.nickname[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {order.publisher.nickname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    信用分 {order.publisher.creditScore}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 承接者卡片 */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                承接者
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={order.provider.avatar || undefined}
                  sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}
                >
                  {order.provider.nickname[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {order.provider.nickname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    信用分 {order.provider.creditScore}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Box sx={{ mb: 2 }}>
            {showComplete && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleComplete}
                loading={actionLoading}
                sx={{ mb: 1 }}
              >
                提交完成
              </Button>
            )}
            {showConfirm && (
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleConfirm}
                loading={actionLoading}
                sx={{ mb: 1 }}
              >
                确认完成
              </Button>
            )}
            {showChat && (
              <Button
                variant="outlined"
                startIcon={<ChatIcon />}
                fullWidth
                onClick={() => navigate(`/orders/${order.id}/chat`)}
                sx={{ mb: 1 }}
              >
                聊天
              </Button>
            )}
            {showCancel && (
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={() => setCancelDialog({ open: true, reason: '' })}
                sx={{ mb: 1 }}
              >
                取消订单
              </Button>
            )}
            {showDispute && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => setDisputeDialog({ open: true, reason: '' })}
                sx={{ mb: 1 }}
              >
                发起纠纷
              </Button>
            )}
          </Box>

          {/* 评价区 (T27) */}
          {status === '已完成' && (isPublisher || isProvider) && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>评价</Typography>

                {existingReview ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2">你的评分：</Typography>
                      <Rating value={existingReview.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(existingReview.createdAt)}
                      </Typography>
                    </Box>
                    {existingReview.content && (
                      <Typography variant="body2" color="text.secondary">
                        {existingReview.content}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2">评分：</Typography>
                      <Rating
                        value={rating}
                        onChange={(_, val) => setRating(val || 0)}
                        size="large"
                      />
                      {rating > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {['', '非常差', '较差', '一般', '较好', '非常好'][rating]}
                        </Typography>
                      )}
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="写下你的评价（选填）…"
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      sx={{ mb: 2 }}
                      slotProps={{ htmlInput: { maxLength: 1000 } }}
                      helperText={`${reviewContent.length}/1000`}
                    />

                    <Button
                      variant="contained"
                      onClick={handleSubmitReview}
                      loading={reviewSubmitting}
                      disabled={rating === 0}
                    >
                      提交评价
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          <Divider sx={{ mb: 1.5 }} />

          {/* 时间信息 */}
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
            创建时间：{formatDateTime(order.createdAt)}
          </Typography>
          {order.completedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
              完成时间：{formatDateTime(order.completedAt)}
            </Typography>
          )}
        </>
      )}

      {/* 取消订单对话框 */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, reason: '' })}>
        <DialogTitle>取消订单</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={2}
            label="取消原因（选填）"
            value={cancelDialog.reason}
            onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mt: 1, minWidth: 320 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, reason: '' })}>返回</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleCancel}
            loading={actionLoading}
          >
            确认取消
          </Button>
        </DialogActions>
      </Dialog>

      {/* 发起纠纷对话框 */}
      <Dialog open={disputeDialog.open} onClose={() => setDisputeDialog({ open: false, reason: '' })}>
        <DialogTitle>发起纠纷</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="纠纷原因"
            required
            value={disputeDialog.reason}
            onChange={(e) => setDisputeDialog(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mt: 1, minWidth: 320 }}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeDialog({ open: false, reason: '' })}>返回</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDispute}
            disabled={!disputeDialog.reason.trim()}
            loading={actionLoading}
          >
            提交纠纷
          </Button>
        </DialogActions>
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
