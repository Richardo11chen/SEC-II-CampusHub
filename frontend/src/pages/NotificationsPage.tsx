import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Badge,
  CircularProgress, Alert, Pagination, Stack, Button,
} from '@mui/material';
import {
  MarkEmailRead as ReadIcon,
} from '@mui/icons-material';
import { getNotifications, markNotificationRead } from '@/api/notifications';
import { formatRelativeTime } from '@/utils/format';
import type { Notification } from '@/types';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: Notification[]; total: number; unreadCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getNotifications(page, PAGE_SIZE)
      .then((res) => {
        if (res.data) {
          setData(res.data);
          setError('');
        } else {
          setError(res.error || '加载失败');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [page]);

  const handlePageChange = (_: unknown, p: number) => {
    setLoading(true);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id);
      window.dispatchEvent(new Event('notifications:update'));
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          items: prev.items.map((n) =>
            n.id === notif.id ? { ...n, isRead: true } : n,
          ),
        };
      });
    }

    if (notif.relatedId) {
      if (notif.type === 'new_message') {
        navigate(`/orders/${notif.relatedId}/chat`);
      } else {
        navigate(`/orders/${notif.relatedId}`);
      }
    }
  };

  const filteredItems = data?.items.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  }) ?? [];

  const typeLabel: Record<string, string> = {
    order_taken: '接单',
    order_completed: '完成',
    order_confirmed: '确认',
    order_cancelled: '取消',
    review_received: '评价',
    dispute_update: '纠纷',
    new_message: '消息',
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          通知
        </Typography>
        {data && data.unreadCount > 0 && (
          <Badge badgeContent={data.unreadCount} color="error">
            <ReadIcon color="action" />
          </Badge>
        )}
      </Box>

      {/* 筛选 */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
        {[
          { label: '全部', value: 'all' },
          { label: '未读', value: 'unread' },
        ].map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            size="small"
            clickable
            color={filter === f.value ? 'primary' : 'default'}
            variant={filter === f.value ? 'filled' : 'outlined'}
            onClick={() => setFilter(f.value as 'all' | 'unread')}
          />
        ))}
      </Box>

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 错误 */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* 空状态 */}
      {!loading && !error && filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            暂无通知
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {filter === 'unread' ? '没有未读通知' : '还没有收到通知'}
          </Typography>
        </Box>
      )}

      {/* 通知列表 */}
      {!loading && filteredItems.length > 0 && (
        <Stack spacing={1}>
          {filteredItems.map((notif) => (
            <Card
              key={notif.id}
              sx={{
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
                bgcolor: notif.isRead ? 'inherit' : 'action.hover',
              }}
              onClick={() => handleClick(notif)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!notif.isRead && (
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: 'primary.main', flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: notif.isRead ? 400 : 700 }}
                    >
                      {notif.title}
                    </Typography>
                  </Box>
                  <Chip
                    label={typeLabel[notif.type] || notif.type}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0, ml: 1 }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, ml: notif.isRead ? 0 : 2 }}
                >
                  {notif.content}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.disabled">
                    {formatRelativeTime(notif.createdAt)}
                  </Typography>
                  {notif.relatedId && (
                    <Button
                      size="small"
                      sx={{ minWidth: 'auto', textTransform: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${notif.relatedId}`);
                      }}
                    >
                      查看
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 分页 */}
      {data && data.total > PAGE_SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
          <Pagination
            count={Math.ceil(data.total / PAGE_SIZE)}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
}
