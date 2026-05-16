import { useState, useRef } from 'react';
import {
  Container, Typography, Box, Avatar, Card, CardContent, Chip,
  Divider, Button, TextField, IconButton, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, PhotoCamera as CameraIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { updateMe } from '@/api/users';
import { uploadImage } from '@/api/upload';
import { maskStudentId, maskPhone } from '@/utils/format';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nickname: '', college: '', phone: '', showRealName: false });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const startEdit = () => {
    setForm({ nickname: user.nickname, college: user.college || '', phone: user.phone || '', showRealName: user.showRealName });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const validate = (): string | null => {
    if (!form.nickname.trim()) return '昵称不能为空';
    if (form.nickname.length > 20) return '昵称最多20个字符';
    if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) return '手机号格式不正确';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setSnackbar({ open: true, message: err, severity: 'error' }); return; }
    setSaving(true);
    const res = await updateMe({
      nickname: form.nickname.trim(),
      college: form.college.trim() || undefined,
      phone: form.phone.trim() || undefined,
      showRealName: form.showRealName,
    });
    setSaving(false);
    if (res.data) {
      updateUser(res.data);
      setEditing(false);
      setSnackbar({ open: true, message: '保存成功', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: res.error || '保存失败', severity: 'error' });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadImage(file);
    setUploading(false);
    if (res.data) {
      const updateRes = await updateMe({ avatar: res.data.url });
      if (updateRes.data) {
        updateUser(updateRes.data);
        setSnackbar({ open: true, message: '头像更新成功', severity: 'success' });
      }
    } else {
      setSnackbar({ open: true, message: res.error || '上传失败', severity: 'error' });
    }
    e.target.value = '';
  };

  return (
    <Container maxWidth="sm">
      {/* 头像 & 昵称 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, position: 'relative' }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar src={user.avatar} sx={{ width: 88, height: 88, mb: 2, bgcolor: 'secondary.main', fontSize: 36 }}>
            {user.nickname[0]}
          </Avatar>
          {uploading && (
            <CircularProgress size={88} sx={{ position: 'absolute', top: 0, left: 0 }} />
          )}
          <IconButton
            size="small"
            sx={{ position: 'absolute', bottom: 8, right: 4, bgcolor: 'background.paper', boxShadow: 1 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <CameraIcon fontSize="small" />
          </IconButton>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{user.nickname}</Typography>
        <Chip label={`信用分 ${user.creditScore}`} color="primary" size="small" sx={{ mt: 1 }} />
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>个人信息</Typography>
            {!editing && (
              <Button size="small" startIcon={<EditIcon />} onClick={startEdit}>编辑</Button>
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />

          {editing ? (
            <>
              <TextField label="昵称" fullWidth value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                size="small" sx={{ mb: 2 }} />
              <TextField label="学院" fullWidth value={form.college}
                onChange={(e) => setForm({ ...form, college: e.target.value })}
                size="small" sx={{ mb: 2 }} />
              <TextField label="手机号" fullWidth value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                size="small" helperText="11位手机号" sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="body2" sx={{ mr: 2 }}>对外展示真实姓名</Typography>
                <Chip
                  label={form.showRealName ? '已开启' : '已关闭'}
                  color={form.showRealName ? 'primary' : 'default'}
                  size="small"
                  clickable
                  onClick={() => setForm({ ...form, showRealName: !form.showRealName })}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </Button>
                <Button variant="outlined" startIcon={<CloseIcon />} onClick={cancelEdit} disabled={saving}>取消</Button>
              </Box>
            </>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
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
