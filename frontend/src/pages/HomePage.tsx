import { useState, useEffect, useRef, Fragment } from 'react';
import {
  Container, Typography, Box, TextField, Chip,
  Pagination, Alert, Stack, InputAdornment, Skeleton, Card, CardContent, Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ArrowUpward as ArrowUp,
  ArrowDownward as ArrowDown,
} from '@mui/icons-material';
import { getDemands } from '@/api/demands';
import DemandCard from '@/components/DemandCard';
import { useAuth } from '@/hooks/useAuth';
import { DEMAND_CATEGORIES } from '@/types';
import type { DemandCategory, DemandStatus, DemandSummary, DemandQueryParams, PaginatedData } from '@/types';

const PAGE_SIZE = 10;
const ALL = '全部';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '开放中', value: '开放' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
] as const;
const REWARD_OPTIONS = [
  { label: '全部', min: undefined, max: undefined },
  { label: '免费', min: 0, max: 0 },
  { label: '1-50', min: 1, max: 50 },
  { label: '50-100', min: 50, max: 100 },
  { label: '100+', min: 100, max: undefined },
] as const;

type SortKey = 'createdAt' | 'reward';

function SortButton({
  label, active, dir, onClick,
}: {
  label: string; active: boolean; dir: 'desc' | 'asc'; onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.25, height: 28,
        cursor: 'pointer', userSelect: 'none', px: 1.5,
        borderRadius: 2, fontSize: '0.85rem', fontWeight: active ? 600 : 400,
        bgcolor: active ? 'primary.main' : 'grey.100',
        color: active ? '#fff' : 'text.secondary',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: active ? 'primary.dark' : 'grey.200' },
      }}
    >
      {label}
      {active && (dir === 'desc' ? <ArrowDown sx={{ fontSize: 16 }} /> : <ArrowUp sx={{ fontSize: 16 }} />)}
    </Box>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');

  // 分类多选
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  // 排序
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  // 更多筛选
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('开放');
  const [rewardIdx, setRewardIdx] = useState(0);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');

  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedData<DemandSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const sortByMap: Record<string, DemandQueryParams['sortBy']> = {
      'createdAt_desc': 'newest',
      'createdAt_asc': 'oldest',
      'reward_desc': 'reward_high',
      'reward_asc': 'reward_low',
    };
    const params: DemandQueryParams = {
      page,
      pageSize: PAGE_SIZE,
      sortBy: sortByMap[`${sortKey}_${sortDir}`],
    };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (selectedCats.length > 0) params.categories = selectedCats as DemandCategory[];
    if (statusFilter) params.status = statusFilter as DemandStatus;
    if (rewardIdx >= 0) {
      const reward = REWARD_OPTIONS[rewardIdx];
      if (reward.min !== undefined) params.minReward = reward.min;
      if (reward.max !== undefined) params.maxReward = reward.max;
    } else {
      const cm = Number(customMin);
      const cx = Number(customMax);
      if (customMin && !isNaN(cm)) params.minReward = cm;
      if (customMax && !isNaN(cx)) params.maxReward = cx;
    }

    getDemands(params)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.data) {
          setData(res.data);
          setError('');
        } else {
          setError(res.error || '加载失败');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, sortKey, sortDir, selectedCats, statusFilter, rewardIdx, keyword, customMin, customMax]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== keyword) {
        setKeyword(searchInput);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, keyword]);

  const handleCategoryClick = (cat: string) => {
    if (cat === ALL) {
      setSelectedCats([]);
    } else {
      setSelectedCats((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
      );
    }
    setPage(1);
  };

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handlePageChange = (_: unknown, p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="md">
      {/* 搜索框 */}
      <TextField
        fullWidth
        placeholder="搜索需求标题…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            bgcolor: 'background.paper',
            transition: 'box-shadow 0.2s ease',
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(107,47,160,0.12)',
            },
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* 分类筛选（多选，全部为独占） */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 1,
          overflowX: 'auto',
          pb: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {[ALL, ...DEMAND_CATEGORIES].map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            clickable
            color={selectedCats.length === 0 && cat === ALL ? 'primary' : selectedCats.includes(cat) ? 'primary' : 'default'}
            variant={selectedCats.length === 0 && cat === ALL ? 'filled' : selectedCats.includes(cat) ? 'filled' : 'outlined'}
            onClick={() => handleCategoryClick(cat)}
            sx={{ height: 28, fontSize: '0.85rem', '& .MuiChip-label': { px: 1.2 } }}
          />
        ))}
      </Box>

      {/* 排序 + 更多筛选按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <SortButton label="发布时间" active={sortKey === 'createdAt'} dir={sortDir} onClick={() => handleSortClick('createdAt')} />
          <SortButton label="报酬" active={sortKey === 'reward'} dir={sortDir} onClick={() => handleSortClick('reward')} />
        </Box>
        <Box
          onClick={() => setFilterOpen(!filterOpen)}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.25,
            cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2,
            color: filterOpen ? 'primary.main' : 'text.secondary',
            fontSize: '0.85rem', fontWeight: 500,
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          更多筛选
          <ExpandIcon
            sx={{
              fontSize: 18,
              transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </Box>
      </Box>

      {/* 展开的更多筛选 */}
      <Collapse in={filterOpen}>
        <Box sx={{ mb: 1.5 }}>
          {/* 接单情况 */}
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 0.5, fontWeight: 600 }}>
            接单情况
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                size="small"
                clickable
                color={statusFilter === s.value ? 'primary' : 'default'}
                variant={statusFilter === s.value ? 'filled' : 'outlined'}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                sx={{ height: 28, fontSize: '0.85rem', '& .MuiChip-label': { px: 1.2 } }}
              />
            ))}
          </Box>

          {/* 报酬数额 */}
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 0.5, fontWeight: 600 }}>
            报酬数额
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {REWARD_OPTIONS.map((opt, i) => (
              <Chip
                key={opt.label}
                label={opt.label}
                size="small"
                clickable
                color={rewardIdx === i ? 'primary' : 'default'}
                variant={rewardIdx === i ? 'filled' : 'outlined'}
                onClick={() => { setRewardIdx(i); setCustomMin(''); setCustomMax(''); setPage(1); }}
                sx={{ height: 28, fontSize: '0.85rem', '& .MuiChip-label': { px: 1.2 } }}
              />
            ))}
            {[
              { placeholder: '最低', val: customMin, set: setCustomMin },
              { placeholder: '∞', val: customMax, set: setCustomMax },
            ].map((field, fi) => (
              <Fragment key={fi}>
                {fi === 1 && <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>—</Typography>}
                <TextField
                  placeholder={field.placeholder}
                  type="number"
                  size="small"
                  value={field.val}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== '' && Number(v) < 0) return;
                    field.set(v); setRewardIdx(-1); setPage(1);
                  }}
                  onBlur={() => {
                    if (fi === 1 && !customMin && field.val) setCustomMin('0');
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 0, style: { fontSize: '0.85rem', width: 52, padding: '4px 6px', textAlign: 'center' as const },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 16, bgcolor: 'background.paper', height: 28,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: rewardIdx === -1 ? 'primary.main' : undefined,
                        borderWidth: rewardIdx === -1 ? '1.5px' : undefined,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main', borderWidth: 2 },
                    },
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                    '& input[type=number]': { MozAppearance: 'textfield' },
                  }}
                />
              </Fragment>
            ))}
          </Box>
        </Box>
      </Collapse>

      {/* 结果统计 */}
      {!loading && data && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          共 {data.pagination.total} 条需求
        </Typography>
      )}

      {/* 骨架屏加载 */}
      {loading && (
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} sx={{ overflow: 'hidden' }}>
              <CardContent sx={{ p: 2.5, pl: 3.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width={50} height={24} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <Skeleton variant="rounded" width={56} height={24} sx={{ borderRadius: 20 }} />
                  <Skeleton variant="rounded" width={48} height={24} sx={{ borderRadius: 20 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton variant="text" width={60} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            暂无需求
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {keyword || selectedCats.length > 0 || statusFilter ? '试试调整筛选条件' : '成为第一个发布需求的人吧'}
          </Typography>
        </Box>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <Stack spacing={1.5}>
            {data.items.map((demand) => (
              <DemandCard key={demand.id} demand={demand} currentUserId={user?.id} />
            ))}
          </Stack>

          {(data.pagination.totalPages ?? 0) > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
              <Pagination
                count={data.pagination.totalPages ?? 1}
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
