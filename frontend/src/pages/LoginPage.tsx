import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Link,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import type { LoginInput } from '@/types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<LoginInput>({ studentId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!form.studentId || !form.password) {
      setError('请填写学号和密码');
      return;
    }
    setLoading(true);
    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
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
          minHeight: { xs: 140, md: '100vh' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰性梧桐叶圆点图案 */}
        <Box
          sx={{
            position: 'absolute',
            top: -90, right: -90,
            width: 375, height: 375,
            borderRadius: '50%',
            bgcolor: 'primary.dark',
            opacity: 0.35,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60, left: -60,
            width: 240, height: 240,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            opacity: 0.25,
          }}
        />
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>
            CampusHub
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, fontWeight: 400 }}>
            校园互助服务平台
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
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 560, borderRadius: 0 }}>
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              登录
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              欢迎回到 CampusHub
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <TextField
              label="学号"
              fullWidth
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              sx={{ mb: 3 }}
            />
            <TextField
              label="密码"
              type="password"
              fullWidth
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              sx={{ mb: 4 }}
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ py: 1.8, fontSize: '1.1rem' }}
            >
              {loading ? '登录中…' : '登录'}
            </Button>

            <Typography variant="body1" sx={{ mt: 3, textAlign: 'center' }}>
              还没有账号？
              <Link component={RouterLink} to="/register" underline="hover" color="secondary" sx={{ fontWeight: 600 }}>
                立即注册
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
