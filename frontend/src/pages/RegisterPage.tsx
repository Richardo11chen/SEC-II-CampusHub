import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Link,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import type { RegisterInput } from '@/types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterInput & { confirmPassword: string }>({
    studentId: '', password: '', nickname: '', confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!form.studentId || !form.password || !form.nickname) {
      setError('请填写所有必填字段');
      return;
    }
    if (!/^\d{10}$/.test(form.studentId)) {
      setError('学号必须为10位数字');
      return;
    }
    if (form.password.length < 8 || form.password.length > 32) {
      setError('密码长度需在8-32位之间');
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
      setError('密码必须包含字母和数字');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await register({
        studentId: form.studentId,
        password: form.password,
        nickname: form.nickname,
        name: form.name,
        email: form.email,
        avatar: form.avatar,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
            注册
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            加入 CampusHub 校园互助平台
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField label="学号" fullWidth value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            helperText="10位数字学号" sx={{ mb: 2 }} />
          <TextField label="昵称" fullWidth value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            helperText="1-20个字符" sx={{ mb: 2 }} />
          <TextField label="密码" type="password" fullWidth value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            helperText="8-32位，包含字母和数字" sx={{ mb: 2 }} />
          <TextField label="确认密码" type="password" fullWidth value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} sx={{ mb: 2 }} />
          <TextField label="真实姓名（选填）" fullWidth value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} />
          <TextField label="邮箱（选填）" fullWidth value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })} sx={{ mb: 3 }} />

          <Button variant="contained" fullWidth size="large"
            onClick={handleSubmit} disabled={loading}>
            {loading ? '注册中…' : '注册'}
          </Button>

          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            已有账号？
            <Link component={RouterLink} to="/login" underline="hover">去登录</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
