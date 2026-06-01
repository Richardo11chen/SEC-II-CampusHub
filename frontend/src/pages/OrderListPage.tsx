import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Chip, Tabs, Tab,
  CircularProgress, Alert, Pagination, Stack,
} from '@mui/material';
import { getOrders } from '@/api/orders';
import { getDemands } from '@/api/demands';
import { useAuth } from '@/hooks/useAuth';
import { formatReward, formatRelativeTime, orderStatusColor } from '@/utils/format';
import { ORDER_STATUSES } from '@/types';
import type { Order, OrderStatus, PaginatedData, DemandSummary } from '@/types';

const ALL = '全部';
const PAGE_SIZE = 10;

const ROLE_TABS = [
  { label: '我发布的', value: 'publisher' as const },
  { label: '我承接的', value: 'provider' as const },
];

export default function OrderListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [role, setRole] = useState<'publisher' | 'provider'>('publisher');
  const [statusFilter, setStatus] = useState<OrderStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData<Order> | null>(null);
  const [demands, setDemands] = useState<DemandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = {
      role,
      page,
      pageSize: PAGE_SIZE,
      ...(statusFilter !== ALL ? { status: statusFilter } : {}),
    };

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

  // 发布者 Tab — 同时拉取"未被接单"的需求
  useEffect(() => {
    if (role !== 'publisher' || !user) return;
    let cancelled = false;
    getDemands({ publisherId: user.id, status: '开放', pageSize: 50, page: 1 }).then((res) => {
      if (!cancelled && res.data) {
        setDemands(res.data.items.filter((d) => d.status === '开放'));
      }
    });
    return () => { cancelled = true; };
  }, [role, user]);

  const handleRoleChange = (_: unknown, val: string) => {
    if (!val) return;
    setLoading(true);
    setRole(val as 'publisher' | 'provider');
    setPage(1);
  };

  const handleStatusChange = (newStatus: OrderStatus | typeof ALL) => {
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
        {([ALL, ...ORDER_STATUSES] as (OrderStatus | typeof ALL)[]).map((s) => (
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

      {/* 空状态 — 无订单且无需求 */}
      {!loading && !error && data && data.items.length === 0 && demands.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            暂无订单
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {statusFilter !== ALL ? '试试其他筛选条件' : '还没有订单'}
          </Typography>
        </Box>
      )}

      {/* 订单列表（发布者 Tab 合并未接单需求） */}
      {!loading && data && (data.items.length > 0 || (role === 'publisher' && statusFilter === ALL && page === 1 && demands.length > 0)) && (
        <>
          <Stack spacing={1.5}>
            {/* 未接单需求（仅"我发布的" + 全部 + 第1页） */}
            {role === 'publisher' && statusFilter === ALL && page === 1 && demands.map((demand) => (
              <Card
                key={`demand-${demand.id}`}
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                  '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: 'warning.main' },
                }}
                onClick={() => navigate(`/demands/${demand.id}`)}
              >
                <CardContent sx={{ p: 2.5, pl: 3.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, mr: 1, lineHeight: 1.4 }}>
                      {demand.title}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      color={demand.reward === 0 ? 'text.secondary' : 'primary'}
                      sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {formatReward(demand.reward)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                    <Chip label="开放中" size="small" color="warning" />
                  </Box>

                  <Typography variant="caption" color="text.disabled">
                    {formatRelativeTime(demand.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {/* 已有订单 */}
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
