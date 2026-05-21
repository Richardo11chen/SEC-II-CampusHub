import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Avatar } from '@mui/material';
import type { DemandSummary } from '@/types';
import { formatReward, formatRelativeTime, demandStatusColor } from '@/utils/format';

// 分类 → 左侧色条颜色
const CATEGORY_COLOR: Record<string, string> = {
  '快递代取': '#C8965C',
  '学习辅导': '#6B2FA0',
  '二手交易': '#3A8C6E',
  '活动组队': '#4A90D9',
  '失物招领': '#C8404B',
  '拼车拼单': '#D4863E',
  '找搭子': '#E07B8C',
  '咨询答疑': '#5096B5',
  '其他': '#8A8A8A',
};

interface DemandCardProps {
  demand: DemandSummary;
}

export default function DemandCard({ demand }: DemandCardProps) {
  const navigate = useNavigate();
  const barColor = CATEGORY_COLOR[demand.category] || '#8A8A8A';

  return (
    <Card
      sx={{
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          boxShadow: `0 8px 30px rgba(107,47,160,0.10), 0 2px 8px rgba(107,47,160,0.06)`,
          transform: 'translateY(-3px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: barColor,
          borderRadius: '4px 0 0 4px',
        },
      }}
      onClick={() => navigate(`/demands/${demand.id}`)}
    >
      <CardContent sx={{ p: 2.5, pl: 3.5, '&:last-child': { pb: 2.5 } }}>
        {/* 标题行 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, flex: 1, mr: 1, lineHeight: 1.4, fontSize: '0.95rem' }}
          >
            {demand.title}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: demand.reward === 0 ? 'text.disabled' : 'secondary.main',
              fontSize: '1rem',
            }}
          >
            {formatReward(demand.reward)}
          </Typography>
        </Box>

        {/* 标签行 */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip label={demand.category} size="small" variant="outlined" />
          <Chip
            label={demand.status}
            size="small"
            color={demandStatusColor(demand.status)}
            variant="outlined"
          />
          {demand.isUrgent && (
            <Chip
              label="紧急"
              size="small"
              sx={{
                bgcolor: '#C8404B',
                color: '#fff',
                fontWeight: 600,
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                },
              }}
            />
          )}
        </Box>

        {/* 底部：发布者 + 时间 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={demand.publisher.avatar || undefined}
              sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'secondary.main', fontWeight: 600 }}
            >
              {demand.publisher.nickname[0]}
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              {demand.isAnonymous ? '匿名用户' : demand.publisher.nickname}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled">
            {formatRelativeTime(demand.createdAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
