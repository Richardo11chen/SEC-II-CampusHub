import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, TextField, Button,
  MenuItem, FormControlLabel, Switch, Snackbar, Alert, Chip, Stack,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { createDemand } from '@/api/demands';
import { uploadImage } from '@/api/upload';
import { DEMAND_CATEGORIES } from '@/types';
import type { CreateDemandInput, DemandCategory } from '@/types';

export default function CreateDemandPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateDemandInput>({
    title: '', description: '', category: '' as DemandCategory,
    reward: 0, isUrgent: false, isAnonymous: false,
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (field: keyof CreateDemandInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const validate = (): string | null => {
    if (!form.title.trim()) return '请输入需求标题';
    if (form.title.length > 100) return '标题最多100个字符';
    if (!form.description.trim()) return '请输入需求描述';
    if (form.description.length > 2000) return '描述最多2000个字符';
    if (!form.category) return '请选择需求分类';
    if (Number(form.reward) < 0) return '报酬不能为负数';
    return null;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const res = await uploadImage(file);
      if (res.data) {
        setImages((prev) => [...prev, res.data!.url]);
      } else {
        setSnackbar({ open: true, message: `上传失败: ${res.error}`, severity: 'error' });
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setSnackbar({ open: true, message: err, severity: 'error' }); return; }
    setSaving(true);
    const res = await createDemand({
      ...form,
      reward: Number(form.reward),
      images: images.map((url, i) => ({ url, sortOrder: i })),
    });
    setSaving(false);
    if (res.data) {
      setSnackbar({ open: true, message: '发布成功！', severity: 'success' });
      setTimeout(() => navigate(`/demands/${res.data!.id}`), 800);
    } else {
      setSnackbar({ open: true, message: res.error || '发布失败', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>发布需求</Typography>

      <Card>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField label="标题" fullWidth value={form.title} onChange={setField('title')}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            helperText={`${form.title.length}/100`} />

          <TextField label="详细描述" fullWidth multiline rows={4} value={form.description}
            onChange={setField('description')}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            helperText={`${form.description.length}/2000`} />

          <TextField label="分类" fullWidth select value={form.category} onChange={setField('category')}>
            {DEMAND_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="地点（选填）" fullWidth value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <TextField label="报酬" type="number" sx={{ width: 200 }}
              value={form.reward} onChange={setField('reward')}
              slotProps={{ htmlInput: { min: 0 } }} helperText="0 = 无偿" />
          </Box>

          <TextField label="期望完成时间（选填）" type="datetime-local" fullWidth
            value={form.expectedTime || ''}
            onChange={(e) => setForm({ ...form, expectedTime: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }} />

          <Box sx={{ display: 'flex', gap: 3 }}>
            <FormControlLabel control={<Switch checked={form.isUrgent}
              onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })} />}
              label="紧急需求（置顶展示）" />
            <FormControlLabel control={<Switch checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />}
              label="匿名发布" />
          </Box>

          {/* 图片上传 */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>图片（选填）</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {images.map((url) => (
                <Chip key={url} label="已上传" onDelete={() => removeImage(url)}
                  deleteIcon={<CloseIcon />} variant="outlined" color="primary" />
              ))}
              <Button size="small" variant="outlined" component="span"
                startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '上传中…' : '选择图片'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={handleImageSelect} />
            </Stack>
          </Box>

          <Button variant="contained" size="large" onClick={handleSubmit}
            disabled={saving} sx={{ mt: 1 }}>
            {saving ? '发布中…' : '发布需求'}
          </Button>
        </CardContent>
      </Card>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}
