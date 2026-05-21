import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Tabs, Tab,
  CircularProgress, Alert, Pagination, Stack,
} from '@mui/material';
import { getOrders } from '@/api/orders';
import { formatReward, formatRelativeTime, orderStatusColor } from '@/utils/format';
import { ORDER_STATUSES } from '@/types';
import type { Order, PaginatedData } from '@/types';

const ALL = '全部';
const PAGE_SIZE = 10;

const ROLE_TABS = [
  { label: '我发布的', value: 'publisher' as const },
  { label: '我承接的', value: 'provider' as const },
];

export default function OrderListPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<'publisher' | 'provider'>('publisher');
  const [statusFilter, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params: { role: string; page: number; pageSize: number; status?: string } = {
      role,
      page,
      pageSize: PAGE_SIZE,
    };
    if (statusFilter !== ALL) params.status = statusFilter;

    getOrders(params)
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
  }, [role, statusFilter, page]);

  const handleRoleChange = (_: unknown, val: string) => {
    if (!val) return;
    setLoading(true);
    setRole(val as 'publisher' | 'provider');
    setPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setLoading(true);
    setStatus(newStatus);
    setPage(1);
  };

  const handlePageChange = (_: unknown, p: number) => {
    setLoading(true);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>我的订单</Typography>

      {/* 角色 Tabs */}
      <Tabs value={role} onChange={handleRoleChange} sx={{ mb: 2 }}>
        {ROLE_TABS.map((t) => (
          <Tab key={t.value} label={t.label} value={t.value} />
        ))}
      </Tabs>

      {/* 状态筛选 */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
        {[ALL, ...ORDER_STATUSES].map((s) => (
          <Chip
            key={s}
            label={s}
            size="small"
            clickable
            color={statusFilter === s ? 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
            onClick={() => handleStatusChange(s)}
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
      {!loading && !error && data && data.items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            暂无订单
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {statusFilter !== ALL ? '试试其他筛选条件' : '还没有订单'}
          </Typography>
        </Box>
      )}

      {/* 订单列表 */}
      {!loading && data && data.items.length > 0 && (
        <>
          <Stack spacing={1.5}>
            {data.items.map((order) => (
              <Card
                key={order.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, mr: 1, lineHeight: 1.4 }}>
                      {order.demandTitle}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      color={order.reward === 0 ? 'text.secondary' : 'primary'}
                      sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {formatReward(order.reward)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                    <Chip label={order.status} size="small" color={orderStatusColor(order.status)} />
                  </Box>

                  <Typography variant="caption" color="text.disabled">
                    {formatRelativeTime(order.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {data.pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
