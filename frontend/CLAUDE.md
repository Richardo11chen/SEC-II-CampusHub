# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampusHub (校园互助服务平台) — React 18 + TypeScript (Vite) 单页应用。面向南京大学学生，提供需求发布/浏览、接单/订单管理、信用评价等互助功能。

**当前状态**：前端项目尚未初始化（`frontend/` 目录为空）。后端已在 P4 分支完整实现，是两个独立运行的 Express 服务。

## 开发环境

- **包管理器**: pnpm（全局安装 `@pnpm/exe@11.1.1`，`pnpm runtime set node lts -g`）
- **Node**: 24.15.0（由 pnpm runtime 管理）
- **TypeScript**: 6.0.3（全局）
- **后端运行端口**: service-a=3001, service-b=3002

## 后端服务架构（关键！）

后端是两个独立 Express 服务，没有统一 API 网关：

| 服务 | 端口 | 路由前缀 | 负责模块 | 开发者 |
|------|------|---------|---------|--------|
| `service-a` | 3001 | `/api/demands`, `/api/orders` | Demand CRUD + Order 流程 | 陈奕澎 |
| `service-b` | 3002 | `/api/auth`, `/api/users`, `/api/upload` | Auth/User/Upload | 张少逸 |

**开发时需同时启动两个服务**：

```bash
cd backend
# 同时启动两个服务
pnpm dev    # 默认只启动 service-a
pnpm dev:a  # 启动 service-a（3001）
pnpm dev:b  # 启动 service-b（3002）

# 或者用 concurrently 启动两个
pnpm add -D concurrently -w
concurrently "pnpm dev:a" "pnpm dev:b"
```

## 前端项目搭建命令

```bash
cd frontend

# 初始化 Vite + React + TypeScript
pnpm create vite . --template react-ts

# 安装核心依赖
pnpm add react-router-dom axios

# 安装开发依赖（可选）
pnpm add -D tailwindcss @tailwindcss/vite  # 如使用 Tailwind
# 或 pnpm add antd-mobile                    # 如使用 Ant Design Mobile

# 开发
pnpm dev          # Vite 开发服务器（默认 5173）

# 构建
pnpm build        # 生产构建
pnpm preview      # 预览生产构建
```

### Vite 代理配置（解决双服务跨域）

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': 'http://localhost:3002',
      '/api/users': 'http://localhost:3002',
      '/api/upload': 'http://localhost:3002',
      '/uploads': 'http://localhost:3002',
      '/api/demands': 'http://localhost:3001',
      '/api/orders': 'http://localhost:3001',
    },
  },
});
```

这样前端开发时只用 `fetch('/api/auth/login')` 等相对路径，Vite 自动转发到对应后端。

## 后端 TypeScript 版本说明

后端使用 **TypeScript 5.8.3**（各 service 的 devDependencies 中定义），与前端无关。前端使用全局 **TypeScript 6.0.3** 或项目本地安装的版本均可。

---

## Tech Stack

- **Framework**: React 18 + TypeScript (Vite)
- **Routing**: react-router-dom v6+（HashRouter 或 BrowserRouter）
- **HTTP Client**: axios（拦截器自动附加 JWT、处理 401 刷新 Token）
- **State Management**: React Context（AuthContext 存 token/user 信息）+ 组件本地 state
- **Styling**: 待定（推荐 Tailwind CSS / Ant Design Mobile / CSS Modules）

---

## 完整 API 端点清单

### 认证模块（Auth）- service-b:3002

| 方法 | 路径 | 说明 | 认证 | 限流 |
|------|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 | IP 限流 |
| POST | `/api/auth/login` | 登录 | 否 | 20次/分钟 |
| POST | `/api/auth/refresh` | 刷新 Token 对 | 否 | 30次/分钟 |
| POST | `/api/auth/logout` | 登出 | JWT | — |

### 用户模块（User）- service-b:3002

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/users/me` | 获取个人信息 | JWT |
| PUT | `/api/users/me` | 更新个人信息 | JWT |
| GET | `/api/users/:userId/profile` | 用户公开资料 | JWT |

### 需求模块（Demand）- service-a:3001

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/demands` | 发布需求 | JWT |
| GET | `/api/demands` | 需求列表（筛选/分页/排序）| 否 |
| GET | `/api/demands/:demandId` | 需求详情 | 否 |
| PUT | `/api/demands/:demandId` | 更新需求 | JWT |
| DELETE | `/api/demands/:demandId` | 删除需求 | JWT |

### 订单模块（Order）- service-a:3001

| 方法 | 路径 | 说明 | 认证 | 限流 |
|------|------|------|------|------|
| POST | `/api/orders` | 接单 | JWT | 60次/分钟 |
| GET | `/api/orders` | 我的订单列表 | JWT | — |
| GET | `/api/orders/:orderId` | 订单详情 | JWT | — |
| PUT | `/api/orders/:orderId/complete` | 服务方提交完成 | JWT | — |
| PUT | `/api/orders/:orderId/confirm` | 需求方确认完成 | JWT | — |

### 文件上传（Upload）- service-b:3002

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload` | 上传文件（multipart/form-data）| JWT |

### P1 后续接口（后端已实现或待实现）

| 方法 | 路径 | 说明 | 优先级 |
|------|------|------|--------|
| PUT | `/api/orders/:orderId/cancel` | 取消订单 | P1 |
| POST | `/api/orders/:orderId/dispute` | 发起纠纷 | P1 |
| POST | `/api/reviews` | 提交评价 | P1 |
| GET | `/api/users/:userId/reviews` | 用户评价列表 | P1 |
| GET | `/api/notifications` | 通知列表 | P1 |
| PATCH | `/api/notifications/:id` | 标记已读 | P1 |

### P2 后续接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/messages` | 订单聊天 |
| GET | `/api/recommendations/demands` | 推荐需求 |
| GET/PUT/DELETE | `/api/admin/*` | 管理后台全部接口 |

---

## API 请求/响应格式

### 通用成功响应

```json
{ "code": 200, "message": "操作成功", "data": { ... } }
```

### 通用错误响应

```json
{
  "code": 400,
  "message": "错误描述",
  "errors": [{ "field": "password", "message": "密码长度至少 8 位" }],
  "timestamp": "2026-05-12T10:00:00Z"
}
```

### 分页响应

```json
{
  "code": 200,
  "data": {
    "items": [ ... ],
    "pagination": { "page": 1, "pageSize": 20, "total": 156, "totalPages": 8 }
  }
}
```

---

## TypeScript 类型定义

对应 `docs/P3/api-spec.yaml` 中的全部 Schema，应在 `frontend/src/types/` 中定义。

### 通用类型

```typescript
// API 响应包装
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  errors?: FieldError[];
  timestamp?: string;
}

interface FieldError {
  field: string;
  message: string;
}

interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

### 用户相关

```typescript
interface UserProfile {
  id: number;
  studentId: string;        // 脱敏展示: "2024*****456"
  nickname: string;
  name?: string;            // 受 showRealName 控制
  college?: string;
  phone?: string;           // 脱敏展示: "138****1234"
  email?: string;
  avatar?: string;
  creditScore: number;      // 0-100
  role: 'student' | 'admin';
  showRealName: boolean;
  createdAt: string;        // ISO 8601
}

interface PublicUserProfile {
  id: number;
  nickname: string;
  name: string | null;      // 仅当用户允许时返回
  college?: string;
  avatar?: string;
  creditScore: number;
  totalOrders: number;
  joinedAt: string;
}

// 登录响应
interface LoginResult {
  token: string;
  refreshToken: string;
  expiresIn: number;        // 3600
  user: UserProfile;
}

// Token 刷新响应
interface RefreshResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 需求相关

```typescript
type DemandCategory = '快递代取' | '学习辅导' | '二手交易' | '活动组队'
  | '失物招领' | '拼车拼单' | '找搭子' | '咨询答疑' | '其他';

type DemandStatus = '开放' | '进行中' | '已完成' | '已关闭';

interface Demand {
  id: number;
  title: string;
  description: string;
  category: DemandCategory;
  location?: string;
  expectedTime?: string;
  reward: number;           // 0 = 无偿
  status: DemandStatus;
  isUrgent: boolean;
  isAnonymous: boolean;
  images: string[];
  publisher: PublicUserProfile;
  currentOrder?: {          // 进行中时返回
    id: number;
    provider: PublicUserProfile;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface DemandSummary {
  id: number;
  title: string;
  category: DemandCategory;
  location?: string;
  reward: number;
  status: DemandStatus;
  isUrgent: boolean;
  isAnonymous: boolean;
  publisher: {
    id: number;
    nickname: string;
    avatar?: string;
    creditScore: number;
  };
  createdAt: string;
}
```

### 订单相关

```typescript
type OrderStatus = '进行中' | '待确认' | '已完成' | '已取消' | '纠纷中';

interface Order {
  id: number;
  demandId: number;
  demandTitle: string;
  publisherId: number;
  providerId: number;
  status: OrderStatus;
  reward: number;
  isPaid: boolean;
  createdAt: string;
  completedAt?: string;
}

interface OrderDetail extends Order {
  publisher: PublicUserProfile;
  provider: PublicUserProfile;
  demand: DemandSummary;
}
```

### 评价相关

```typescript
interface Review {
  id: number;
  orderId: number;
  fromUser: PublicUserProfile;
  toUserId: number;
  rating: number;           // 1-5
  content?: string;
  createdAt: string;
}
```

### 通知相关

```typescript
type NotificationType = 'order_taken' | 'order_completed' | 'order_confirmed'
  | 'order_cancelled' | 'review_received' | 'dispute_update';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
}
```

### 请求体类型（对应后端 Zod 校验规则）

```typescript
// 注册请求
interface RegisterInput {
  studentId: string;        // 10位数字
  password: string;         // 8-32位，含字母+数字
  nickname: string;         // 1-20字
  name?: string;            // 最多20字
  email?: string;           // 邮箱格式
  avatar?: string;          // URL，最多500字
}

// 登录请求
interface LoginInput {
  studentId: string;
  password: string;
}

// 更新个人信息
interface UpdateUserInput {
  nickname?: string;
  avatar?: string;
  college?: string;
  phone?: string;           // 11位，^1[3-9]\d{9}$
  showRealName?: boolean;
}

// 发布需求
interface CreateDemandInput {
  title: string;            // 1-100字
  description: string;      // 1-2000字
  category: DemandCategory;
  location?: string;
  expectedTime?: string;
  reward?: number;          // >= 0，默认0
  isUrgent?: boolean;
  isAnonymous?: boolean;
  images?: string[];
}

// 需求列表查询参数
interface DemandQueryParams {
  category?: DemandCategory;
  status?: DemandStatus;
  keyword?: string;
  sortBy?: 'newest' | 'oldest' | 'reward_high' | 'reward_low';
  isUrgent?: boolean;
  page?: number;
  pageSize?: number;
}

// 接单
interface CreateOrderInput {
  demandId: number;
  message?: string;         // 最多500字
}

// 订单列表查询
interface OrderQueryParams {
  role?: 'publisher' | 'provider';
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

// 提交评价
interface CreateReviewInput {
  orderId: number;
  rating: number;           // 1-5
  content?: string;         // 最多1000字
}
```

---

## 关键业务规则

### 表单验证规则（与后端一致）

| 字段 | 规则 | 错误提示 |
|------|------|---------|
| studentId | 10位数字 `/^\d{10}$/` | "学号必须为10位数字" |
| password | 8-32位，含字母+数字 `/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/` | "密码必须包含字母和数字" |
| nickname | 1-20字符 | "昵称不能为空"/"昵称最多20个字符" |
| phone | 11位 `/^1[3-9]\d{9}$/` | "手机号格式不正确" |
| reward | >= 0 | "报酬不能为负数" |
| email | 邮箱格式 | "邮箱格式不正确" |

### 需求分类枚举（9种）

```typescript
const DEMAND_CATEGORIES = [
  '快递代取', '学习辅导', '二手交易', '活动组队',
  '失物招领', '拼车拼单', '找搭子', '咨询答疑', '其他',
] as const;
```

### 订单状态流转

```
接单 → [进行中] → 提交完成 → [待确认] → 需求方确认 → [已完成]
                                    ↘ 48h 未确认 → 自动确认
[进行中] → 取消 → [已取消]
[进行中/待确认] → 纠纷 → [纠纷中]
```

各状态下的可操作按钮：

| 订单状态 | 服务方可操作 | 需求方可操作 |
|---------|-------------|-------------|
| 进行中 | 提交完成、取消 | 取消、发起纠纷 |
| 待确认 | — | 确认完成、发起纠纷 |
| 已完成 | 评价 | 评价 |
| 已取消 | — | — |
| 纠纷中 | — | — |

### 信用分规则（前端展示参考）

| 事件 | 变化 |
|------|------|
| 收到 5 星评价 | +3 |
| 收到 4 星评价 | +1 |
| 收到 3 星评价 | 0 |
| 收到 1-2 星评价 | -5 |
| 服务方取消订单（爽约）| -10 |

- 初始分：70，上限 100，下限 0
- 信用分 < 40 禁止发布需求（后端返回 403）

### 错误码处理策略

| 状态码 | 含义 | 前端动作 |
|--------|------|---------|
| 400 | 参数错误 | 展示 `errors` 中字段级错误信息 |
| 401 | Token 失效 | 尝试用 refreshToken 刷新；刷新失败则清除登录态跳转登录页 |
| 403 | 权限不足 | 展示具体错误原因（如信用分不足） |
| 404 | 资源不存在 | 展示 404 提示 |
| 409 | 资源冲突 | 如"该需求已被其他人接走""已评价过该订单" |
| 413 | 文件过大 | 提示"文件大小不能超过 10MB" |
| 422 | 业务校验失败 | 展示业务错误信息 |
| 429 | 限流 | 提示"操作过于频繁，请稍后再试" |

---

## JWT 认证与 Token 管理

### axios 拦截器实现要点

```typescript
// 1. 请求拦截器：自动附加 Authorization 头
// 2. 响应拦截器：捕获 401 后尝试刷新 Token
//    刷新成功 → 重放原始请求
//    刷新失败 → 清除 token 跳转 /login
// 3. 防止并发刷新：用 Promise 队列或锁变量
```

### Storage 方案

```typescript
// 登录成功后存储
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);
// 或使用内存变量 + 定期持久化
```

---

## 图片上传流程

1. 用户选择图片（前端预览）
2. POST `/api/upload`（multipart/form-data，`Authorization: Bearer`）
3. 后端返回上传结果：`{ code: 201, data: { url: "http://..." } }`
4. 将返回的 URL 存入需求/头像字段

**限制**：单文件最大 10MB，仅允许常见图片格式（jpg/png/gif/webp）

---

## 推荐的项目目录结构

```
frontend/
├── public/
├── src/
│   ├── api/                  # axios 实例 + 按模块拆分的 API 函数
│   │   ├── client.ts         # axios 实例（拦截器配置）
│   │   ├── auth.ts           # 登录/注册/刷新/登出
│   │   ├── demands.ts        # 需求 CRUD + 列表
│   │   ├── orders.ts         # 订单 CRUD
│   │   ├── users.ts          # 用户信息
│   │   ├── upload.ts         # 文件上传
│   │   └── notifications.ts  # 通知（P1）
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts          # 以上全部类型
│   ├── store/                # 全局状态
│   │   └── AuthContext.tsx    # 认证上下文（token/user）
│   ├── components/           # 可复用 UI 组件
│   │   ├── Layout.tsx        # 全局布局（导航栏）
│   │   ├── ProtectedRoute.tsx # 路由守卫
│   │   ├── DemandCard.tsx    # 需求卡片
│   │   ├── StarRating.tsx    # 星级评分
│   │   ├── ImageGallery.tsx  # 图片画廊
│   │   ├── Pagination.tsx    # 分页控件
│   │   └── ...
│   ├── pages/                # 页面组件
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── HomePage.tsx          # 需求广场
│   │   ├── DemandDetailPage.tsx
│   │   ├── CreateDemandPage.tsx
│   │   ├── ProfilePage.tsx       # 我的资料
│   │   ├── UserPublicPage.tsx    # 用户公开主页
│   │   ├── OrderListPage.tsx     # 我的订单
│   │   ├── OrderDetailPage.tsx
│   │   ├── NotificationsPage.tsx # P1
│   │   └── admin/               # P2
│   ├── hooks/                # 自定义 Hooks
│   │   └── useAuth.ts
│   ├── utils/                # 工具函数（脱敏、格式化等）
│   │   └── format.ts
│   ├── App.tsx               # 路由配置
│   └── main.tsx              # 入口
├── CLAUDE.md
└── package.json
```

---

## 推荐的路由配置

```typescript
// App.tsx
<Routes>
  {/* 公开路由 */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={<HomePage />} />
  <Route path="/demands/:id" element={<DemandDetailPage />} />

  {/* 需认证路由 */}
  <Route element={<ProtectedRoute />}>
    <Route path="/demands/new" element={<CreateDemandPage />} />
    <Route path="/demands/:id/edit" element={<CreateDemandPage />} />
    <Route path="/users/me" element={<ProfilePage />} />
    <Route path="/users/:id" element={<UserPublicPage />} />
    <Route path="/orders" element={<OrderListPage />} />
    <Route path="/orders/:id" element={<OrderDetailPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
  </Route>
</Routes>
```

---

## Sprint 实现顺序（按任务编号）

### 第一阶段：基础架构与用户核心（前端 A — 孙正奇）

| 任务 | 页面 | 核心功能 | 预估 |
|------|------|---------|------|
| T05 | 项目初始化 | Vite 搭建、路由守卫、axios 拦截器配置、AuthContext | 3h |
| T06 | RegisterPage | 注册表单（学号/密码/昵称），前端校验，对接 `POST /api/auth/register` | 2h |
| T07 | LoginPage | 登录表单，存储 token 跳转首页，错误提示，对接 `POST /api/auth/login` | 2h |
| T09 | ProfilePage | 展示个人信息（脱敏手机号），编辑表单，对接 `GET/PUT /api/users/me` | 3h |

### 第二阶段：需求发布与浏览（前端 A + 前端 B）

| 任务 | 页面 | 核心功能 | 负责人 | 预估 |
|------|------|---------|--------|------|
| T14 | CreateDemandPage | 需求表单（分类下拉/报酬/图片上传），对接 `POST /api/demands` | 前端A | 3h |
| T15 | HomePage | 需求卡片列表，分类筛选器，排序切换，分页，搜索框 | 前端B | 4h |
| T16 | DemandDetailPage | 需求详情 + 发布者信息 + 匿名/紧急标签 + 图片画廊 | 前端A | 2h |

### 第三阶段：订单流程（前端 B）

| 任务 | 页面 | 核心功能 | 预估 |
|------|------|---------|------|
| T22 | DemandDetailPage | 添加"接单"按钮（仅开放状态 + 非发布者），409 冲突处理 | 2h |
| T23 | OrderListPage | "我发布的"/"我承接的"Tab，状态筛选，订单卡片 | 3h |
| T24 | OrderDetailPage | 订单信息 + 状态流转 + 提交完成/确认完成按钮 | 3h |

### 后续阶段

| 任务 | 页面 | 优先级 | 预估 |
|------|------|--------|------|
| T27/T28 | 评价表单 + 用户公开主页 | P1 | 3h |
| T34 | NotificationsPage | P1 | 2h |
| T39/T40 | 管理后台 + UI 完善 | P2 | 4h |

---

## 前端 A / 前端 B 分工（仅参考）

- **前端 A（孙正奇）**: Login, Register, Profile, CreateDemand, DemandDetail, UserPublicPage, Admin
- **前端 B（宋丞轩）**: HomePage（需求广场）, OrderList, OrderDetail, Reviews, Notifications

---

## 脱敏展示规则（安全要求）

| 字段 | 展示方式 |
|------|---------|
| studentId | `2024*****456`（显示前4后3） |
| phone | `138****1234`（显示前3后4） |
| name | 仅当 `showRealName === true` 时显示 |
| 匿名发布者 | 显示"匿名用户" |

---

## 设计参考文档

- `docs/P2/架构设计文档.md` — 架构决策、模块划分
- `docs/P3/详细设计文档.md` — 类图、DB Schema、订单状态机、信用分规则
- `docs/P3/api-spec.yaml` — **完整 OpenAPI 3.0 规范（2791行，所有端点/Schema/错误定义）**
- `docs/P4/Sprint合并任务看板.md` — Sprint 任务拆分和时间预估
