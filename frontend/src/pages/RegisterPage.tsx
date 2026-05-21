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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* 左侧装饰区 — 南大紫 */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          flex: { md: '0 0 42%' },
          minHeight: { xs: 120, md: '100vh' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -60, left: -60,
            width: 300, height: 300,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            opacity: 0.3,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -75, right: -75,
            width: 270, height: 270,
            borderRadius: '50%',
            bgcolor: 'primary.dark',
            opacity: 0.3,
          }}
        />
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>
            CampusHub
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85 }}>
            加入校园互助社区
          </Typography>
        </Box>
      </Box>

      {/* 右侧表单 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 600, borderRadius: 0 }}>
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              注册
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              加入 CampusHub 校园互助平台
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <TextField label="学号" fullWidth value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              helperText="10位数字学号" sx={{ mb: 2.5 }} />
            <TextField label="昵称" fullWidth value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              helperText="1-20个字符" sx={{ mb: 2.5 }} />
            <TextField label="密码" type="password" fullWidth value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="8-32位，包含字母和数字" sx={{ mb: 2.5 }} />
            <TextField label="确认密码" type="password" fullWidth value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} sx={{ mb: 2.5 }} />
            <TextField label="真实姓名（选填）" fullWidth value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2.5 }} />
            <TextField label="邮箱（选填）" fullWidth value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })} sx={{ mb: 4 }} />

            <Button variant="contained" fullWidth size="large"
              onClick={handleSubmit} disabled={loading}
              sx={{ py: 1.8, fontSize: '1.1rem' }}>
              {loading ? '注册中…' : '注册'}
            </Button>

            <Typography variant="body1" sx={{ mt: 3, textAlign: 'center' }}>
              已有账号？
              <Link component={RouterLink} to="/login" underline="hover" color="secondary" fontWeight={600}>去登录</Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
