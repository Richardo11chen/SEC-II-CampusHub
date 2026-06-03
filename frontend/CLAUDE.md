# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampusHub (校园互助服务平台) — React 18 + TypeScript + Vite 8 单页应用，面向南京大学学生。全部 12 个页面已完成开发（前端A + 前端B + 聊天），部署于 `P4` 分支。

## Page Inventory

| Page | Route | Key Features |
|------|-------|-------------|
| HomePage | `/` | 需求卡片列表 + 排序(发布时间↕/报酬↕) + 分类多选 + 状态筛选(开放中/进行中/已完成) + 报酬范围(预设+自定义min/max) + 默认仅开放中 + 搜索防抖 + 分页 + 骨架屏 |
| LoginPage | `/login` | 学号+密码登录，表单非空校验 |
| RegisterPage | `/register` | 学号10位/密码8-32位混合/确认一致校验 |
| DemandDetailPage | `/demands/:id` | 图片画廊 + 标签(分类/状态/紧急/匿名) + 发布者卡片 + 接单按钮 + 删除需求（发布者） |
| CreateDemandPage | `/demands/new` | 发布表单 + 9分类 + 紧急/匿名开关 + 逐张图片上传 |
| ProfilePage | `/users/me` | 头像上传 + 查看/编辑双模式 + 学号/手机号脱敏显示 |
| UserPublicPage | `/users/:id` | 公开资料 + 信用分 + 评价列表(Rating) |
| OrderListPage | `/orders` | Tab切换(我发布的/我承接的) + 未接单需求混排 + 状态筛选 + 分页 |
| OrderDetailPage | `/orders/:id` | Stepper状态时间线 + 提交完成/确认/取消/纠纷 + 评价入口(自动回显已有评价) + 聊天入口 |
| ChatPage | `/orders/:id/chat` | 实时聊天 + 3s轮询新消息 + 分页加载历史 + 发送/Enter快捷发送 + 固定浮动布局 + 16px字体 + 圆角气泡 + 返回上一页 + 订单详情跳转按钮 |
| NotificationsPage | `/notifications` | 通知列表 + 未读标记 + 红点再读 + 点击跳转订单 + 新消息通知 |
| AdminPage | `/admin` | 5标签页(概览/用户管理/需求管理/纠纷处理/管理员申请) |

测试覆盖：200 tests / 17 files（format / DemandCard / PageTransition / Layout / client / AuthProvider / DemandDetailPage / OrderDetailPage / OrderListPage / NotificationsPage / UserPublicPage / ProfilePage / CreateDemandPage / LoginPage / RegisterPage / ProtectedRoute / useAuth）

## Development Commands

```bash
# 后端（两服务分终端）
# 修改 shared/src/ 后必须先编译
cd backend/shared && npx tsc && cd ..
node --import tsx/esm service-b/src/app.ts   # 3002 (auth/user/upload)
node --import tsx/esm service-a/src/app.ts   # 3001 (demand/order)

# 前端
cd frontend && pnpm dev                       # 5173

# 提交前必跑
pnpm lint       # ESLint
pnpm check      # tsc -b --noEmit
pnpm test       # Vitest (jsdom)
pnpm build      # tsc -b && vite build
```

> Windows 注意：npm workspace hoisting 导致 `npx tsx` 不可用，用 `node --import tsx/esm` 替代。

## Vite Proxy

| Frontend Path | Target | Service |
|--------------|--------|---------|
| `/api/auth/*` | `localhost:3002` | service-b |
| `/api/users/*` | `localhost:3002` | service-b |
| `/api/upload` | `localhost:3002` | service-b |
| `/uploads/*` | `localhost:3002` | service-b |
| `/api/reviews/*` | `localhost:3002` | service-b |
| `/api/notifications/*` | `localhost:3002` | service-b |
| `/api/messages/*` | `localhost:3002` | service-b |
| `/api/admin/*` | `localhost:3002` | service-b |
| `/api/demands/*` | `localhost:3001` | service-a |
| `/api/orders/*` | `localhost:3001` | service-a |

## Architecture

```
src/
├── api/              # axios + 按模块拆分
│   ├── client.ts     #   实例、401 自动刷新（Promise 并发锁）、refreshHandler 注入
│   ├── auth.ts/users.ts/demands.ts/orders.ts/messages.ts/...
├── types/index.ts    # 全部 TS 类型 + 枚举常量（DEMAND_CATEGORIES 等）
├── store/            # 全局认证状态（仅 AuthContext，无全局状态库）
│   ├── authContext.ts    # Context 定义
│   └── AuthProvider.tsx  # Provider + 会话恢复 + token 管理
├── hooks/useAuth.ts      # useAuth hook
├── components/           # 可复用 UI
│   ├── Layout.tsx        # AppBar + BottomNav + 用户菜单
│   ├── ProtectedRoute.tsx# 路由守卫（loading → 未登录跳转）
│   ├── DemandCard.tsx    # 需求卡片（分类色条 + 脉冲紧急标签）
│   └── PageTransition.tsx# 页面过渡动画
├── pages/                # 12 个页面（见上表）
├── utils/
│   └── format.ts         # 脱敏/日期/相对时间/报酬/状态→颜色
├── theme.ts              # MUI 主题（南大紫 #6B2FA0 主色）
├── App.tsx               # 路由配置
└── main.tsx              # 入口
```

## Key Patterns

### API Layer
- All functions return `{ data: T | null; error: string | null }`
- Error extraction via `extractMessage(err, fallback)` guard — never `as any`
- Backend `reward` is `string` type → must `Number()` convert in API layer
- Backend `images` is `[{ id, url, sortOrder }]` → not `string[]`

### Page Pattern (three-state)
```typescript
const [loading, setLoading] = useState(true);   // 初始 true，无需 effect 内 set
const [error, setError] = useState('');
const [data, setData] = useState<T | null>(null);

useEffect(() => {
  api().then(r => {
    if (r.data) { setData(r.data); setError(''); }
    else { setError(r.error || '加载失败'); }
  }).catch(() => setError('加载失败'))
  .finally(() => setLoading(false));
}, []);

if (loading) return <CircularProgress />;
if (error) return <Alert severity="error">{error}</Alert>;
if (!data?.items.length) return <EmptyState />;
return <List data={data.items} />;
```

### Snackbar Pattern (for mutations)
```typescript
const [snackbar, setSnackbar] = useState<{
  open: boolean; message: string; severity: 'success' | 'error';
}>({ open: false, message: '', severity: 'success' });

// Usage
setSnackbar({ open: true, message: '操作成功', severity: 'success' });

// JSX
<Snackbar open={snackbar.open} autoHideDuration={3000}
  onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
  <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
</Snackbar>
```

### Auth & 401 Refresh
- `ProtectedRoute`: check `isLoading` → `<CircularProgress />`, then `isAuthenticated` → `<Navigate to="/login">`
- axios 401 interceptor: exclusive refresh queue via `pendingRefresh` Promise lock (prevents concurrent refresh calls)
- On refresh failure: `window.dispatchEvent(new Event('auth:logout'))` → AuthProvider catches and clears state
- Session restore: `useState` lazy initializer reads localStorage, then async-validates token via `getMe()` or `refresh()`
- ESLint rule `react-hooks/set-state-in-effect` prohibits sync `setState` in effect body → use lazy initializer or move to async callback

### Notification Badge (Layout bell)
- Layout polls `getNotifications(1, 1).unreadCount` every 30s + on `window focus`
- NotificationsPage dispatches `window.dispatchEvent(new Event('notifications:update'))` after marking read → Layout catches and refreshes badge
- Different notification types route to different pages: `new_message` → `/orders/:id/chat`, others → `/orders/:id`

## MUI v9 vs v5/v6

| v5/v6 | v9 |
|-------|----|
| `inputProps` | `slotProps.htmlInput` |
| `InputLabelProps` | `slotProps.inputLabel` |
| `Stack justifyContent`/`flexWrap` | put into `sx` |
| `AddCircleOutline` | `AddCircleOutlined` |
| `CheckCircleOutline` | `CheckCircleOutlined` |
| `Grid2 from @mui/material/Grid2` | `Grid2 from @mui/material` |

## Known Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Avatar upload says success but shows old image | Zod `avatar: z.string().url()` rejects relative path `/uploads/...` | Remove `.url()` validation, avatar is a relative path |
| Page white screen | `formatReward("0")` calls `"0".toFixed()` — TypeError | API layer `Number()` conversion before passing to formatters |
| ESLint `no-explicit-any` in tests | Mock user with `as any` | Use typed `UserProfile` const |
| ESLint `set-state-in-effect` | Sync `setState()` in `useEffect` body | Lazy initializer or move setState to `.then()` callback |
| Vite stall after many restarts | Windows `TIME_WAIT` on port 5173 | `pnpm dev --port 5176` |
| Chat bubble text gray on purple bg | Theme `body2: { color: TEXT_SECONDARY }` overrides Paper's `color: #fff` via CSS specificity | Remove `variant="body2"`, use `sx={{ color: 'inherit' }}` instead |

## Theme

南大紫主题 (`src/theme.ts`):
- Primary: `#6B2FA0` (purple) | Secondary: `#C8965C` (warm gold)
- Cards: `borderRadius: 16`, left color bar via `&::before`
- BottomNav: 62px height, purple selected state
- Buttons: `borderRadius: 10`, no uppercase (`textTransform: 'none'`)

## Testing

- 200 tests across 17 files (Vitest + jsdom + @testing-library/react)
- 覆盖率配置：`@vitest/coverage-v8`，通过 `pnpm test:coverage` 查看 text 报告
- Mock pattern: full `AuthContextType` interface, never `as any`
- 纯函数（utils）与组件测试分离：纯函数不 mock，组件 mock 非确定性依赖（Date.now、router）
- Setup file: `src/utils/__tests__/setup.ts` imports `@testing-library/jest-dom/vitest`

### Coverage (当前 ~47.7% statements)

| 文件 | Statements | 说明 |
|------|-----------|------|
| `format.ts` | 100% | 8 函数全部覆盖 |
| `DemandCard.tsx` | 100% | 14 渲染态 + 交互 |
| `PageTransition.tsx` | 100% | 结构渲染 |
| `useAuth.ts` | 100% | 正常 + 越界抛错 |
| `ProtectedRoute.tsx` | 100% | 路由守卫 |
| `UserPublicPage.tsx` | ~92% | 公开资料/评价列表 |
| `OrderListPage.tsx` | ~91% | Tab切换/状态筛选/开放需求混排 |
| `Layout.tsx` | ~91% | AppBar/菜单/通知铃铛/登出/管理员 |
| `NotificationsPage.tsx` | ~89% | 通知列表/标记已读/筛选/导航 |
| `ProfilePage.tsx` | ~82% | 查看/编辑双模式/头像上传/保存 |
| `CreateDemandPage.tsx` | ~79% | 表单验证/图片上传/发布 |
| `client.ts` | ~92% | 401 刷新队列全路径 |
| `AuthProvider.tsx` | ~83% | 认证状态机 |
| `OrderDetailPage.tsx` | ~70% | 订单状态流转/操作按钮/评价 |
| `DemandDetailPage.tsx` | ~71% | 图片预览/接单/删除/发布者卡片 |
| `LoginPage.tsx` | ~95% | 登录表单 + loading + 错误态 |
| `RegisterPage.tsx` | ~94% | 表单校验 100% 分支 |
