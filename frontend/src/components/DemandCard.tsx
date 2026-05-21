import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Avatar } from '@mui/material';
import type { DemandSummary } from '@/types';
import { formatReward, formatRelativeTime, demandStatusColor } from '@/utils/format';

interface DemandCardProps {
  demand: DemandSummary;
}

export default function DemandCard({ demand }: DemandCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
      }}
      onClick={() => navigate(`/demands/${demand.id}`)}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* 标题行 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, mr: 1, lineHeight: 1.4 }}>
            {demand.title}
          </Typography>
          <Typography
            variant="subtitle1"
            color={demand.reward === 0 ? 'text.secondary' : 'primary'}
            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {formatReward(demand.reward)}
          </Typography>
        </Box>

        {/* 标签行 */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip label={demand.category} size="small" variant="outlined" />
          <Chip label={demand.status} size="small" color={demandStatusColor(demand.status)} />
          {demand.isUrgent && <Chip label="紧急" size="small" color="error" />}
        </Box>

        {/* 底部：发布者 + 时间 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={demand.publisher.avatar || undefined}
              sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'secondary.main' }}
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
