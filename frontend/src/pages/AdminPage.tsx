import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Tabs, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Alert, CircularProgress,
  TablePagination,
} from '@mui/material';
import {
  People as UsersIcon, Assignment as DemandsIcon, Gavel as DisputesIcon,
  HowToReg as AppsIcon, Dashboard as StatsIcon, Delete, CheckCircle,
  Block as BlockIcon, CheckCircleOutlined as ApproveIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import {
  getStatistics, getAdminUsers, toggleUserStatus,
  getAdminDemands, deleteAdminDemand,
  getDisputes, resolveDispute,
  getApplications, reviewApplication,
} from '@/api/admin';
import type { AdminStatistics, AdminDispute, AdminApplication } from '@/api/admin';
import type { UserProfile, DemandSummary } from '@/types';
import { formatDateTime, maskStudentId } from '@/utils/format';

const TABS = [
  { label: '概览', icon: <StatsIcon /> },
  { label: '用户管理', icon: <UsersIcon /> },
  { label: '需求管理', icon: <DemandsIcon /> },
  { label: '纠纷处理', icon: <DisputesIcon /> },
  { label: '管理员申请', icon: <AppsIcon /> },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="sm" sx={{ pt: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="error">无权访问管理后台</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>管理后台</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable">
        {TABS.map((t) => <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" />)}
      </Tabs>
      {tab === 0 && <StatsTab />}
      {tab === 1 && <UsersTab />}
      {tab === 2 && <DemandsTab />}
      {tab === 3 && <DisputesTab />}
      {tab === 4 && <ApplicationsTab />}
    </Container>
  );
}

/* ===== 概览 ===== */

function StatsTab() {
  const [stats, setStats] = useState<AdminStatistics | null>(null);

  useEffect(() => {
    getStatistics().then((r) => { if (r.data) setStats(r.data); });
  }, []);

  if (!stats) return <CircularProgress />;

  const cards = [
    { label: '总用户', value: stats.totalUsers, color: '#1976d2' },
    { label: '总需求', value: stats.totalDemands, color: '#388e3c' },
    { label: '总订单', value: stats.totalOrders, color: '#f57c00' },
    { label: '待处理纠纷', value: stats.pendingDisputes, color: '#d32f2f' },
    { label: '待审批申请', value: stats.pendingApplications, color: '#7b1fa2' },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
      {cards.map((c) => (
        <Card key={c.label} sx={{ borderTop: 3, borderColor: c.color }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: c.color }}>{c.value}</Typography>
            <Typography variant="body2" color="text.secondary">{c.label}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

/* ===== 用户管理 ===== */

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getAdminUsers(page + 1).then((r) => {
      if (r.data) { setUsers(r.data.items); setTotal(r.data.pagination.total); }
    });
  }, [page]);

  const reload = () => getAdminUsers(page + 1).then((r) => {
    if (r.data) { setUsers(r.data.items); setTotal(r.data.pagination.total); }
  });

  const handleToggle = async (userId: number) => {
    await toggleUserStatus(userId);
    reload();
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>学号</TableCell>
            <TableCell>昵称</TableCell>
            <TableCell>信用分</TableCell>
            <TableCell>角色</TableCell>
            <TableCell>状态</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow><TableCell colSpan={7} align="center">暂无数据</TableCell></TableRow>
          ) : users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.id}</TableCell>
              <TableCell>{maskStudentId(u.studentId)}</TableCell>
              <TableCell>{u.nickname}</TableCell>
              <TableCell>{u.creditScore}</TableCell>
              <TableCell><Chip label={u.role} size="small" variant="outlined" /></TableCell>
              <TableCell><Chip label={u.role === 'admin' ? '管理员' : '正常'} size="small" color={u.role === 'admin' ? 'primary' : 'success'} /></TableCell>
              <TableCell align="right">
                <IconButton size="small" color="error" onClick={() => handleToggle(u.id)} title="禁用/启用">
                  <BlockIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
    </TableContainer>
  );
}

/* ===== 需求管理 ===== */

function DemandsTab() {
  const [demands, setDemands] = useState<DemandSummary[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getAdminDemands(page + 1).then((r) => {
      if (r.data) { setDemands(r.data.items); setTotal(r.data.pagination.total); }
    });
  }, [page]);

  const reload = () => getAdminDemands(page + 1).then((r) => {
    if (r.data) { setDemands(r.data.items); setTotal(r.data.pagination.total); }
  });

  const handleDelete = async (id: number) => {
    await deleteAdminDemand(id);
    reload();
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>标题</TableCell>
            <TableCell>分类</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>报酬</TableCell>
            <TableCell>发布时间</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {demands.length === 0 ? (
            <TableRow><TableCell colSpan={7} align="center">暂无数据</TableCell></TableRow>
          ) : demands.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.id}</TableCell>
              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</TableCell>
              <TableCell><Chip label={d.category} size="small" variant="outlined" /></TableCell>
              <TableCell><Chip label={d.status} size="small" color={d.status === '开放' ? 'primary' : d.status === '已完成' ? 'success' : 'default'} /></TableCell>
              <TableCell>{d.reward === 0 ? '无偿' : `¥${d.reward}`}</TableCell>
              <TableCell>{formatDateTime(d.createdAt)}</TableCell>
              <TableCell align="right">
                <IconButton size="small" color="error" onClick={() => handleDelete(d.id)} title="删除">
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
    </TableContainer>
  );
}

/* ===== 纠纷处理 ===== */

function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dialog, setDialog] = useState<{ open: boolean; dispute: AdminDispute | null; resolution: string }>({
    open: false, dispute: null, resolution: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    getDisputes(page + 1).then((r) => {
      if (r.data) { setDisputes(r.data.items); setTotal(r.data.pagination.total); }
    });
  }, [page]);

  const reload = () => getDisputes(page + 1).then((r) => {
    if (r.data) { setDisputes(r.data.items); setTotal(r.data.pagination.total); }
  });

  const handleResolve = async () => {
    if (!dialog.dispute || !dialog.resolution.trim()) return;
    await resolveDispute(dialog.dispute.id, dialog.resolution);
    setDialog({ open: false, dispute: null, resolution: '' });
    setSnackbar({ open: true, message: '已处理' });
    reload();
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>发起人</TableCell>
              <TableCell>原因</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {disputes.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">暂无数据</TableCell></TableRow>
            ) : disputes.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.id}</TableCell>
                <TableCell>{d.initiator.nickname}</TableCell>
                <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</TableCell>
                <TableCell><Chip label={d.status} size="small" color={d.status === '待处理' ? 'error' : 'success'} /></TableCell>
                <TableCell>{formatDateTime(d.createdAt)}</TableCell>
                <TableCell align="right">
                  {d.status === '待处理' && (
                    <Button size="small" startIcon={<CheckCircle />} onClick={() => setDialog({ open: true, dispute: d, resolution: '' })}>
                      处理
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
      </TableContainer>

      <Dialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>处理纠纷</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>原因：{dialog.dispute?.reason}</Typography>
          <TextField label="处理结果" fullWidth multiline rows={3} value={dialog.resolution}
            onChange={(e) => setDialog((d) => ({ ...d, resolution: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog((d) => ({ ...d, open: false }))}>取消</Button>
          <Button variant="contained" onClick={handleResolve} disabled={!dialog.resolution.trim()}>确认处理</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, message: '' })}>
        <Alert severity="success" variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

/* ===== 管理员申请 ===== */

function ApplicationsTab() {
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    getApplications(page + 1).then((r) => {
      if (r.data) { setApps(r.data.items); setTotal(r.data.pagination.total); }
    });
  }, [page]);

  const reload = () => getApplications(page + 1).then((r) => {
    if (r.data) { setApps(r.data.items); setTotal(r.data.pagination.total); }
  });

  const handleReview = async (id: number, status: '已通过' | '已拒绝') => {
    await reviewApplication(id, status);
    setSnackbar({ open: true, message: status === '已通过' ? '已通过' : '已拒绝' });
    reload();
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>申请人</TableCell>
              <TableCell>学号</TableCell>
              <TableCell>理由</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>申请时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apps.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">暂无数据</TableCell></TableRow>
            ) : apps.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.applicant.nickname}</TableCell>
                <TableCell>{maskStudentId(a.applicant.studentId)}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</TableCell>
                <TableCell>
                  <Chip label={a.status} size="small"
                    color={a.status === '待审批' ? 'warning' : a.status === '已通过' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{formatDateTime(a.createdAt)}</TableCell>
                <TableCell align="right">
                  {a.status === '待审批' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton size="small" color="success" onClick={() => handleReview(a.id, '已通过')} title="通过">
                        <ApproveIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleReview(a.id, '已拒绝')} title="拒绝">
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
      </TableContainer>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, message: '' })}>
        <Alert severity="success" variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
