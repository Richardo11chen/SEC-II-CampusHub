# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampusHub (校园互助服务平台) — React + TypeScript + Vite + MUI v9 单页应用。面向南京大学学生，提供需求发布/浏览、接单/订单管理、信用评价等互助功能。

## 当前状态（2026-05-16）

前端项目骨架已搭建完毕 (`feat/frontend` 分支)，CI 流水线全部通过：

- Vite 8 + React 19 + TypeScript 6 + MUI v9 + react-router-dom v7 + axios
- Vitest 已配置，placeholder 测试通过
- ESLint v10 flat config + typescript-eslint + react-hooks 插件
- `@/` path alias 配置完成 (`./src/*`)
- Vite proxy 已配置（服务端双端口代理）
- GitLab CI: lint → build → test (node:lts, npm)

**下一步**：开始开发 P0 前端页面（第一阶段任务 T05-T09）。

## 开发环境

```bash
# 启动前端开发服务器（默认 5173）
cd frontend && pnpm dev

# 后端需同时启动（可在根目录 backend 中）
cd backend
pnpm dev:a  # service-a (3001) — demand + order
pnpm dev:b  # service-b (3002) — auth + user + upload

# 代码检查
pnpm lint       # ESLint
pnpm check      # tsc -b --noEmit
pnpm test       # Vitest
pnpm build      # tsc -b && vite build
```

## Vite 代理配置

| 前端路径 | 代理目标 | 后端服务 |
|---------|---------|---------|
| `/api/auth/*` | `localhost:3002` | service-b |
| `/api/users/*` | `localhost:3002` | service-b |
| `/api/upload` | `localhost:3002` | service-b |
| `/uploads/*` | `localhost:3002` | service-b |
| `/api/demands/*` | `localhost:3001` | service-a |
| `/api/orders/*` | `localhost:3001` | service-a |

## 前端开发分工

> 前后端均无显式文件夹拆分。前端按任务粒度分为 A / B 两部分，但代码放在同一 `src/` 目录下，两人各自按任务认领。

### 前端A（孙正奇）— 本次开发

| 任务 | 页面/模块 | 核心功能 | 后端依赖 |
|------|----------|---------|---------|
| T05 | 项目初始化 | 路由、AuthContext、axios 拦截器、ProtectedRoute | — |
| T06 | RegisterPage | 注册表单 + 前端校验 | POST /api/auth/register |
| T07 | LoginPage | 登录表单 + token 存储 | POST /api/auth/login |
| T09 | ProfilePage | 个人信息展示/编辑 + 脱敏 | GET/PUT /api/users/me |
| T14 | CreateDemandPage | 发布需求表单 + 图片上传 | POST /api/demands + /api/upload |
| T16 | DemandDetailPage | 需求详情 + 发布者信息 + 标签 + 图片画廊 | GET /api/demands/:id |
| T28 | UserPublicPage | 用户公开主页（信用分/评价） | GET /api/users/:id/profile |
| T39 | Admin pages | 管理后台（用户/需求/纠纷/统计） | 全部 /api/admin/* 接口 |

### 前端B（宋丞轩）— 后续开发

| 任务 | 页面 | 核心功能 |
|------|------|---------|
| T15 | HomePage (需求广场) | 需求卡片列表 + 筛选/排序/分页/搜索 |
| T22 | DemandDetailPage | 添加"接单"按钮（逻辑扩展） |
| T23 | OrderListPage | 我的订单（Tab + 状态筛选） |
| T24 | OrderDetailPage | 订单详情 + 状态流转操作 |
| T27 | ReviewForm | 评价入口 + 评分组件 |
| T34 | NotificationsPage | 通知列表 |
| T40 | 前端完善 | 紧急标签/匿名发布/纠纷入口/错误提示统一 |

---

## 实现规划（第一阶段 - 前端A）

### 开发顺序与依赖关系

```
T05 (基础架构)
  ├── T06 (注册) → T07 (登录)
  └── T09 (个人资料)
T14 (发布需求) ← 依赖 T07 的 token
T16 (需求详情) ← 依赖 T14 的数据
T28 (用户主页) ← 依赖 T07 的 auth
T39 (管理后台) ← 最后
```

### T05：项目初始化（基础架构）

需要创建的文件：

```
src/
├── api/
│   ├── client.ts           # axios 实例 + 拦截器（token 附加 + 401 刷新）
│   ├── auth.ts             # register / login / refresh / logout
│   └── users.ts            # getMe / updateMe / getUserProfile
├── types/
│   └── index.ts            # 全部 TS 类型（从 CLAUDE.md 迁移）
├── store/
│   └── AuthContext.tsx      # AuthProvider + useAuth
├── components/
│   ├── Layout.tsx           # AppBar + BottomNav + 布局
│   └── ProtectedRoute.tsx   # 路由守卫
├── App.tsx                  # 路由配置（替换模板内容）
├── main.tsx                 # 入口（注入 MUI ThemeProvider）
└── theme.ts                # MUI 主题（主色/辅色/字体）
```

关键实现要点：

- **AuthContext**：管理 `user` / `accessToken` / `refreshToken` / `isLoading`，localStorage 持久化
- **axios 401 拦截器**：捕获 401 → 尝试 `/auth/refresh` 刷新 → 重放请求 → 刷新失败清登录态跳 `/login`
- **Promise 锁**：防止并发刷新（单个 pending 请求，其他请求等待其完成）
- **ProtectedRoute**：检查 `user` 是否存在，不存在且非 loading 时 Navigate to `/login`
- **MUI 主题**：主色 `#1976d2` (blue)，备用 `#388e3c` (green)

Layout 结构：

```
<AppBar position="sticky">
  └─ 左: 首页 / 右: 通知铃铛 + 用户头像下拉菜单
<Box component="main" sx={{ pb: 7 }}>
  └─ <Outlet /> (路由内容)
</Box>
<BottomNavigation>  (移动端底部导航)
  └─ 首页 / 发布 / 订单 / 我的
```

## MUI 组件选型

| 场景 | MUI 组件 |
|------|---------|
| 布局容器 | `Container`, `Box`, `Stack`, `Grid2` |
| 导航 | `AppBar`, `BottomNavigation`, `Tabs` |
| 表单 | `TextField`, `Select`, `Checkbox`, `Switch`, `Button`, `IconButton` |
| 反馈 | `Snackbar`, `Alert`, `Dialog`, `CircularProgress` |
| 数据展示 | `Card`, `Chip`, `Avatar`, `Badge`, `List` |
| 排版 | `Typography`, `Divider` |

**注意**：MUI v9 使用 `@mui/material` 新包名，API 与 v5/v6 基本兼容。Grid 改用 `Grid2`（即 `import { Grid2 } from '@mui/material'`）。

## 前端目录结构

```
frontend/src/
├── api/                    # API 函数（按模块拆分）
│   ├── client.ts           #    axios 实例 + 拦截器
│   ├── auth.ts             #    登录/注册/刷新/登出
│   ├── demands.ts          #    需求 CRUD + 列表
│   ├── orders.ts           #    订单 CRUD
│   ├── users.ts            #    用户信息/公开资料
│   ├── upload.ts           #    文件上传
│   └── notifications.ts    #    通知（预留）
├── types/
│   └── index.ts            # 全部 TypeScript 类型定义
├── store/
│   └── AuthContext.tsx      # 认证上下文（token/user）
├── components/             # 可复用 UI 组件
│   ├── Layout.tsx           #   全局布局（AppBar + BottomNav）
│   ├── ProtectedRoute.tsx   #   路由守卫
│   ├── DemandCard.tsx       #   需求卡片（供 T15 用，可选）
│   └── ...                  #   其他通用组件
├── pages/                  # 页面组件
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ProfilePage.tsx
│   ├── CreateDemandPage.tsx
│   ├── DemandDetailPage.tsx
│   └── ...                  # 按任务逐步添加
├── hooks/                  # 自定义 Hooks
│   └── useAuth.ts          #   useAuth hook（从 AuthContext 导出）
├── utils/
│   ├── format.ts            # 脱敏/日期格式化等工具函数
│   └── __tests__/           # 测试文件
├── theme.ts                 # MUI 主题配置
├── App.tsx                  # 路由配置
└── main.tsx                 # 入口
```

## 路由配置

```typescript
<Routes>
  {/* 公开路由 */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={<HomePage />} />            {/* 需求广场 - 前端B */}
  <Route path="/demands/:id" element={<DemandDetailPage />} />

  {/* 需认证路由（前端A 实现以下） */}
  <Route element={<ProtectedRoute />}>
    <Route path="/demands/new" element={<CreateDemandPage />} />
    <Route path="/demands/:id/edit" element={<CreateDemandPage />} />
    <Route path="/users/me" element={<ProfilePage />} />
    <Route path="/users/:id" element={<UserPublicPage />} />
    <Route path="/orders" element={<OrderListPage />} />      {/* 前端B */}
    <Route path="/orders/:id" element={<OrderDetailPage />} /> {/* 前端B */}
    <Route path="/notifications" element={<NotificationsPage />} /> {/* 前端B */}
  </Route>
</Routes>
```

---

## MUI 主题设计

```typescript
// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },    // 校园蓝
    secondary: { main: '#388e3c' },   // 活力绿
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Roboto", "Noto Sans SC", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } },
    },
  },
});
```

## 设计与代码规范

- **UI 风格**：Material Design，简洁干净的白底卡片设计
- **色彩**：主色蓝色 `#1976d2`，强调绿色 `#388e3c`，紧急/危险红色 `#d32f2f`
- **组件颗粒度**：页面级别的表单/详情直接写在 page 文件中，仅当跨页面的共享 UI 才提取到 `components/`
- **状态管理**：全局只用 AuthContext，其余状态就地用 `useState`/`useReducer`，不做全局状态库
- **样式方案**：MUI `sx` prop 优先，复杂样式用 `styled()` 组件；避免 CSS 文件
- **错误处理**：API 函数返回统一类型 `{ data: T | null; error: string | null }`，页面层负责展示 Snackbar/Alert
- **代码组织**：每个页面组件放在 `pages/` 下一个文件，附属子组件可内联或同文件内定义

## 完整 API 端点清单

参见 `docs/P3/api-spec.yaml`（OpenAPI 3.0，~2790 行）。

### Auth (service-b:3002)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/refresh` | 刷新 Token | 否 |
| POST | `/api/auth/logout` | 登出 | JWT |

### User (service-b:3002)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/users/me` | 个人信息 | JWT |
| PUT | `/api/users/me` | 更新信息 | JWT |
| GET | `/api/users/:userId/profile` | 公开资料 | JWT |

### Demand (service-a:3001)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/demands` | 发布需求 | JWT |
| GET | `/api/demands` | 列表（筛选/分页/排序） | 否 |
| GET | `/api/demands/:demandId` | 详情 | 否 |
| PUT | `/api/demands/:demandId` | 更新 | JWT |
| DELETE | `/api/demands/:demandId` | 删除 | JWT |

### Order (service-a:3001)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/orders` | 接单 | JWT |
| GET | `/api/orders` | 我的订单 | JWT |
| GET | `/api/orders/:orderId` | 订单详情 | JWT |
| PUT | `/api/orders/:orderId/complete` | 提交完成 | JWT |
| PUT | `/api/orders/:orderId/confirm` | 确认完成 | JWT |

### Upload (service-b:3002)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload` | 上传图片 | JWT |

---

## 通用 API 响应格式

```typescript
// 成功
{ code: 200, message: "操作成功", data: T }

// 失败
{ code: 400, message: "错误描述", errors?: [{ field, message }], timestamp: string }

// 分页
{ code: 200, data: { items: T[], pagination: { page, pageSize, total, totalPages } } }
```

## 关键业务规则

- **订单状态**：接单→进行中→待确认→已完成（48h 自动确认）
- **信用分**：0-100，初始 70，< 40 禁止发布需求
- **图片上传**：10MB 限制，jpg/png/gif/webp
- **脱敏展示**：学号前4后3 (`2024*****456`)，手机号前3后4 (`138****1234`)
- **需求分类**：快递代取/学习辅导/二手交易/活动组队/失物招领/拼车拼单/找搭子/咨询答疑/其他

## 错误码处理

| 状态码 | 前端动作 |
|--------|---------|
| 400 | 展示字段级错误信息 |
| 401 | 刷新 Token；刷新失败跳转 /login |
| 403 | 展示具体错误原因 |
| 404 | 展示 404 提示 |
| 409 | 展示冲突信息（如"已被接走"） |
| 413 | 提示"文件大小不能超过 10MB" |
| 429 | 提示"操作过于频繁" |

## TypeScript 类型定义

完整类型见 `src/types/index.ts`（在 T05 中创建）。

## 参考文档

- `docs/P2/架构设计文档.md` — 架构决策
- `docs/P3/详细设计文档.md` — 类图/DB Schema/状态机/信用分
- `docs/P3/api-spec.yaml` — OpenAPI 3.0 完整规范
- `docs/P4/Sprint合并任务看板.md` — Sprint 任务拆分
