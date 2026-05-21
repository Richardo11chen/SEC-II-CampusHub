import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Avatar, Chip,
  Button, CircularProgress, Alert, Rating,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { getUserProfile } from '@/api/users';
import { getUserReviews } from '@/api/reviews';
import { formatDateTime } from '@/utils/format';
import type { PublicUserProfile, Review } from '@/types';

export default function UserPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const userId = Number(id);
    Promise.all([
      getUserProfile(userId),
      getUserReviews(userId),
    ]).then(([profileRes, reviewsRes]) => {
      if (profileRes.data) {
        setProfile(profileRes.data);
      } else {
        setError(profileRes.error || '用户不存在');
      }
      if (reviewsRes.data) {
        setReviews(reviewsRes.data.items);
      }
    }).catch(() => setError('加载失败'))
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  if (error || !profile) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Alert severity="error" action={<Button size="small" onClick={() => navigate('/')}>返回首页</Button>}>
          {error || '用户不存在'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>返回</Button>

      {/* 用户信息 */}
      <Card>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar src={profile.avatar} sx={{ width: 80, height: 80, mb: 2, bgcolor: 'secondary.main', fontSize: 32 }}>
            {profile.nickname[0]}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{profile.nickname}</Typography>
          {profile.name && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{profile.name}</Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1, gap: 0.5 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
              {profile.creditScore}
            </Typography>
            <Typography variant="caption" color="text.secondary">信用分</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Chip label={`${profile.totalOrders} 单`} variant="outlined" size="small" />
          </Box>
          {profile.college && (
            <Typography variant="body2" color="text.secondary">{profile.college}</Typography>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
            加入于 {new Date(profile.joinedAt).toLocaleDateString('zh-CN')}
          </Typography>
        </CardContent>
      </Card>

      {/* 评价列表 */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>收到的评价</Typography>

      {reviews.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          暂无评价
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar src={review.fromUser.avatar} sx={{ width: 28, height: 28, fontSize: 14 }}>
                    {review.fromUser.nickname[0]}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{review.fromUser.nickname}</Typography>
                  <Rating value={review.rating} readOnly size="small" sx={{ ml: 'auto' }} />
                </Box>
                {review.content && (
                  <Typography variant="body2" color="text.secondary">{review.content}</Typography>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  {formatDateTime(review.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
