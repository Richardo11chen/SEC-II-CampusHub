import { Container, Typography, Box, Avatar, Card, CardContent, Chip, Divider } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { maskStudentId, maskPhone } from '@/utils/format';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Container maxWidth="sm">
      {/* 头像 & 昵称 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <Avatar src={user.avatar} sx={{ width: 80, height: 80, mb: 2, bgcolor: 'secondary.main', fontSize: 32 }}>
          {user.nickname[0]}
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{user.nickname}</Typography>
        <Chip label={`信用分 ${user.creditScore}`} color="primary" size="small" sx={{ mt: 1 }} />
      </Box>

      <Card>
        <CardContent>
          <InfoRow label="学号" value={maskStudentId(user.studentId)} />
          <Divider />
          <InfoRow label="学院" value={user.college || '未设置'} />
          <Divider />
          <InfoRow label="手机号" value={user.phone ? maskPhone(user.phone) : '未绑定'} />
          <Divider />
          <InfoRow label="邮箱" value={user.email || '未设置'} />
          <Divider />
          <InfoRow label="真实姓名" value={user.showRealName ? (user.name || '未设置') : '已隐藏'} />
          <Divider />
          <InfoRow label="注册时间" value={new Date(user.createdAt).toLocaleDateString('zh-CN')} />
        </CardContent>
      </Card>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, px: 1 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}
