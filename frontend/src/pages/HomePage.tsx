import { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, TextField, Chip, ToggleButtonGroup, ToggleButton,
  Pagination, Alert, Stack, InputAdornment, Skeleton, Card, CardContent,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { getDemands } from '@/api/demands';
import DemandCard from '@/components/DemandCard';
import { DEMAND_CATEGORIES } from '@/types';
import type { DemandCategory, DemandSummary, DemandQueryParams, PaginatedData } from '@/types';

const PAGE_SIZE = 10;
const ALL = '全部';

type SortBy = NonNullable<DemandQueryParams['sortBy']>;

export default function HomePage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedData<DemandSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params: DemandQueryParams = {
      page,
      pageSize: PAGE_SIZE,
      sortBy,
    };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (category !== ALL) params.category = category as DemandCategory;

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
  }, [page, sortBy, category, keyword]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setKeyword(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (cat: string) => {
    setLoading(true);
    setCategory(cat);
    setPage(1);
  };

  const handleSortChange = (_: unknown, val: SortBy | null) => {
    if (val) {
      setLoading(true);
      setSortBy(val);
      setPage(1);
    }
  };

  const handlePageChange = (_: unknown, p: number) => {
    setLoading(true);
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

      {/* 分类筛选 */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 1.5,
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
            color={category === cat ? 'primary' : 'default'}
            variant={category === cat ? 'filled' : 'outlined'}
            onClick={() => handleCategoryChange(cat)}
          />
        ))}
      </Box>

      {/* 排序切换 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {data ? `共 ${data.pagination.total} 条需求` : ''}
        </Typography>
        <ToggleButtonGroup
          value={sortBy}
          exclusive
          onChange={handleSortChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.5,
              fontSize: '0.8rem',
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: '#fff',
                borderColor: 'primary.main',
              },
            },
          }}
        >
          <ToggleButton value="newest">最新</ToggleButton>
          <ToggleButton value="reward_high">报酬↓</ToggleButton>
          <ToggleButton value="reward_low">报酬↑</ToggleButton>
        </ToggleButtonGroup>
      </Box>

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
            {keyword || category !== ALL ? '试试调整筛选条件' : '成为第一个发布需求的人吧'}
          </Typography>
        </Box>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <Stack spacing={1.5}>
            {data.items.map((demand) => (
              <DemandCard key={demand.id} demand={demand} />
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
