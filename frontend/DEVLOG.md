# CampusHub 前端开发日志

> 开发周期：2026-05-16
> 分支：`feat/frontend`
> 开发者：前端A（孙正奇）
> 说明：完整记录每次会话的关键决策、问题、解决方案和后续注意事项

---

## 目录

1. [项目初始化与配置](#1-项目初始化与配置)
2. [T05 基础架构搭建](#2-t05-基础架构搭建)
3. [T09 个人资料页编辑](#3-t09-个人资料页编辑)
4. [T14 发布需求页面](#4-t14-发布需求页面)
5. [T16 需求详情页](#5-t16-需求详情页)
6. [T28 用户公开主页](#6-t28-用户公开主页)
7. [T39 管理后台](#7-t39-管理后台)
8. [后端环境配置与联调](#8-后端环境配置与联调)
9. [组件测试集成](#9-组件测试集成)
10. [UI 美化](#10-ui-美化)
11. [附录](#11-附录)

---

## 1. 项目初始化与配置

### 1.1 环境信息

| 项目 | 值 |
|------|-----|
| 包管理器 | pnpm 11.1.1（本地开发），npm（CI） |
| Node | 24.15.0（pnpm runtime 管理） |
| TypeScript | 6.0.3（全局） / 5.8.3（后端） |
| 后端服务 | service-a (3001, 需求/订单), service-b (3002, 认证/用户) |

### 1.2 仓库状态

项目根目录已存在：
- `backend/` — npm workspaces 三包结构（shared/service-a/service-b），Express 5 + Prisma + MySQL
- `docs/` — 设计文档（P2 架构设计、P3 详细设计 + api-spec.yaml）
- `.gitlab/` — CI 配置（backend.yml + frontend.yml）
- `.gitignore` — 全局忽略规则

CLAUDE.md 已由 `/init` 生成，包含架构说明、API 端点清单、TypeScript 类型定义

### 1.3 关键约定

- **不改后端代码**：只做前端，后端是已完成的服务
- **pnpm 本地 / npm CI**：本地用 pnpm，CI 流水线用 npm（用户明确要求）
- **node:lts**：CI 镜像用 node:lts（moving tag），不是固定 22.x

### 1.4 MUI v9 发现的问题

在后续开发中发现的 MUI v9 与 v5/v6 的关键差异：

1. **`inputProps` → `slotProps.htmlInput`**：MUI v9 弃用了直接的 `inputProps` prop
2. **`InputLabelProps` → `slotProps.inputLabel`**：同理
3. **Stack 不支持 `justifyContent`/`flexWrap`**：这些不是有效的 Stack prop，需要放入 `sx` 中
4. **图标名变更**：`AddCircleOutline` → `AddCircleOutlined`，`CheckCircleOutline` → `CheckCircleOutlined`
5. **`Grid2` 导入路径**：从 `@mui/material` 导入

---

## 2. T05 基础架构搭建

### 2.1 文件结构

本次创建了前端应用的核心骨架：

```
src/
├── types/index.ts           # 完整类型定义
├── theme.ts                 # MUI 主题配置
├── utils/
│   ├── format.ts            # 工具函数
│   └── __tests__/format.test.ts
├── api/
│   ├── client.ts            # axios 实例 + 拦截器
│   ├── auth.ts              # 认证 API
│   └── users.ts             # 用户 API
├── store/
│   ├── authContext.ts       # 上下文对象
│   └── AuthProvider.tsx     # 认证 Provider
├── hooks/useAuth.ts         # useAuth hook
├── components/
│   ├── Layout.tsx           # 全局布局
│   └── ProtectedRoute.tsx   # 路由守卫
├── pages/                   # 全部页面占位
├── App.tsx                  # 路由配置
└── main.tsx                 # 入口文件
```

### 2.2 API 设计模式

所有 API 函数采用统一的返回类型：

```typescript
{ data: T | null; error: string | null }
```

catch 块中提取错误信息的方式：

```typescript
// ❌ 之前：err: any → CI lint 报错 no-explicit-any
catch (err: any) {
  return { data: null, error: err.response?.data?.message || 'fallback' };
}

// ✅ 之后：err: unknown，用守卫函数
function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}
catch (err: unknown) {
  return { data: null, error: extractMessage(err, 'fallback') };
}
```

### 2.3 axios 拦截器设计

请求拦截器：自动附加 `Authorization: Bearer <token>`

响应拦截器关键逻辑：
1. 捕获 401 错误
2. 排除认证相关接口（避免死循环）
3. 从 localStorage 获取 refreshToken
4. 用 Promise 锁防并发刷新
5. 刷新成功后重放原始请求
6. 刷新失败时 dispatch `auth:logout` 事件

```typescript
// 并发锁实现
let pendingRefresh: Promise<...> | null = null;

if (!pendingRefresh) {
  pendingRefresh = refreshHandler(refreshToken).finally(() => {
    pendingRefresh = null;
  });
}
return pendingRefresh.then(...)
```

### 2.4 AuthContext 设计

| 功能 | 实现方式 |
|------|---------|
| 状态 | user, accessToken, refreshToken, isLoading, isAuthenticated |
| 持久化 | localStorage（accessToken + refreshToken） |
| 会话恢复 | 初始化时 read localStorage → getMe() → 过期则 refresh |
| 刷新回调注册 | `setRefreshHandler()` 注入到 axios 拦截器 |
| 登出事件 | `window.dispatchEvent(new Event('auth:logout'))` |
| 状态更新 | `updateUser(user)` 方法供 Profile 编辑后刷新 |

会话恢复的 lazy initializer（避免 ESLint set-state-in-effect）：

```typescript
function createInitialState(): AuthState {
  const tokens = loadTokens();
  if (!tokens.accessToken) {
    return { isLoading: false, ... }  // 无 token 直接完成加载
  }
  return { accessToken: tokens.accessToken, isLoading: true, ... }  // 有 token 异步验证
}

const [state, setState] = useState<AuthState>(createInitialState);
```

### 2.5 ESLint 问题记录

**问题 1：`no-explicit-any`**
- 位置：所有 catch 块、类型转换
- 解决：`err: any` → `err: unknown`，用守卫函数 + 类型断言

**问题 2：`react-hooks/set-state-in-effect`**
- 位置：AuthContext 初始化 effect、数据获取 effect
- 原因：React 19 的 eslint-plugin-react-hooks 新增规则，禁止在 effect body 中同步调用 setState
- 解决：使用 `useState` lazy initializer 消除同步 setState；移除多余的 `setLoading(true)`

```typescript
// ❌ 触发规则
useEffect(() => {
  setLoading(true);  // 同步 setState——禁止！
  fetchData().then(setData).finally(() => setLoading(false));
}, []);

// ✅ 合规：loading 初始值为 true，无需在 effect 中再设置
useEffect(() => {
  fetchData().then((r) => {
    setData(r.data);
    setLoading(false);  // 在异步回调中，安全
  });
}, []);
```

**问题 3：`react-refresh/only-export-components`**
- 原因：一个文件同时 export 组件和 hook/context
- 解决：添加 `allowConstantExport: true` 到 ESLint 配置

```typescript
// eslint.config.js
rules: {
  'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
},
```

### 2.6 文件命名冲突

在 Windows 上，`store/authContext.ts` 和 `store/AuthContext.tsx` 造成 TypeScript 编译器混淆：

```
error TS1149: File name 'AuthContext.ts' differs from already included
file name 'authContext.ts' only in casing
```

解决方案：Provider → `AuthProvider.tsx`，Context 对象 → `authContext.ts`

### 2.7 页面功能（登录 + 注册）

LoginPage 和 RegisterPage 在 T05 中作为功能完整的页面实现，不是占位：

**LoginPage：**
- 表单：学号 + 密码
- 校验：非空检查
- 流程：调 `login()` → 存储 token → navigate('/')
- 错误：Alert 展示后端错误信息

**RegisterPage：**
- 表单：学号 + 昵称 + 密码 + 确认密码 + 真实姓名(选填) + 邮箱(选填)
- 校验：学号10位数字、密码8-32位+字母数字混合、确认一致
- 流程：调 `register()` → navigate('/login')

---

## 3. T09 个人资料页编辑

### 3.1 功能清单

| 功能 | 技术实现 |
|------|---------|
| 查看模式 | InfoRow 组件展示字段，脱敏显示学号/手机号 |
| 编辑模式 | 点击"编辑"按钮切换，TextField + Chip 开关 |
| 头像上传 | IconButton → hidden file input → POST /api/upload → PUT /api/users/me |
| 手机号校验 | `/^1[3-9]\d{9}$/` |
| 保存反馈 | Snackbar + Alert（成功/失败） |
| 状态同步 | `AuthContext.updateUser()` 更新全局用户状态 |

### 3.2 新增/修改文件

| 文件 | 变更 |
|------|------|
| `src/api/upload.ts` | 新增 — 文件上传 API（FormData + multipart） |
| `src/store/authContext.ts` | `AuthContextType` 添加 `updateUser` |
| `src/store/AuthProvider.tsx` | 实现 `updateUser` |
| `src/pages/ProfilePage.tsx` | 完全重写 — 查看/编辑双模式 |

---

## 4. T14 发布需求页面

### 4.1 功能清单

| 功能 | 说明 |
|------|------|
| 标题 | TextField, maxLength 100 |
| 描述 | TextField multiline, maxLength 2000 |
| 分类 | Select + MenuItem, 9 种枚举值 |
| 地点/报酬 | 并行输入，报酬 type=number, min=0 |
| 期望时间 | type=datetime-local |
| 紧急/匿名 | Switch 开关 |
| 图片上传 | 选择 → 逐张 POST /api/upload → 显示已上传 Chip |
| 表单校验 | 标题非空、描述非空、分类必选、报酬≥0 |

### 4.2 关键模式

图片上传流程：
```
用户选择文件 → uploadImage(file) → 暂存 URL → 提交时作为 images 数组发送
```

### 4.3 数据格式问题

后端期望的 images 格式与前端定义不一致：

| 维度 | 前端原来 | 后端期望 | 修复后 |
|------|---------|---------|--------|
| images 类型 | `string[]`（URL 数组） | `{ url: string; sortOrder: number }[]` | `CreateDemandInput.images` 改为联合类型 |
| 提交时转换 | 无 | — | `images.map((url, i) => ({ url, sortOrder: i }))` |

---

## 5. T16 需求详情页

### 5.1 功能清单

| 功能 | 说明 |
|------|------|
| 图片画廊 | 大图展示 + 缩略图行，点击切换选中 |
| 信息卡片 | 标签（分类/状态/紧急/匿名）、标题、描述、元信息 |
| 发布者卡片 | 头像/昵称/信用分 + "查看主页"按钮 |
| 发布者判断 | 当前用户是否发布者、是否可接单 |
| 加载/错误状态 | CircularProgress / Alert |

### 5.2 后端响应格式适配

后端返回的 Demand 对象与前端类型有差异，在 API 层做转换：

```typescript
// api/demands.ts
function normalizeDemand(d: Demand): Demand {
  return { ...d, reward: Number(d.reward) };
}
```

差异汇总：

| 字段 | 后端实际格式 | 前端最初类型 | 处理方式 |
|------|------------|------------|---------|
| `reward` | `string`（如 `"0"`） | `number` | API 层 `Number()` 转换 |
| `images` | `[{id, url, sortOrder}]` | `string[]` | 改为 `DemandImage[]`（含 id/url/sortOrder） |
| `publisher.joinedAt` | 不存在 | `string` (required) | 从需求相关类型中移除 |
| `publisher.totalOrders` | 不存在 | `number` (required) | 从需求相关类型中移除 |

**严重问题**：如果不做 reward 转换，`formatReward("0")` 内部调用 `"0".toFixed()` 会抛出 `TypeError`，导致页面崩溃白屏。

---

## 6. T28 用户公开主页

### 6.1 功能清单

| 功能 | 说明 |
|------|------|
| 资料卡片 | 头像/昵称/真实姓名/信用分/订单数/学院/加入时间 |
| 评价列表 | 按时间倒序，评分星标（Rating）+ 文字内容 |

### 6.2 新增文件

| 文件 | 内容 |
|------|------|
| `src/api/reviews.ts` | `getUserReviews(userId, page)` |

---

## 7. T39 管理后台

### 7.1 功能清单

| 标签页 | 功能 |
|--------|------|
| 概览 | 5 个统计卡片（总用户/需求/订单/待处理纠纷/待审批申请） |
| 用户管理 | 表格 + 禁用/启用（IconButton） |
| 需求管理 | 表格 + 删除（IconButton） |
| 纠纷处理 | 表格 + 处理弹窗（Dialog + TextField） |
| 管理员申请 | 表格 + 通过/拒绝（两个 IconButton） |

### 7.2 权限控制

- 路由：放在 `ProtectedRoute` 下
- 页面级：`user.role !== 'admin'` 时显示"无权访问"
- 导航：用户菜单中"管理后台"仅 role=admin 可见

### 7.3 新增文件

| 文件 | 内容 |
|------|------|
| `src/api/admin.ts` | 8 个 API 函数 + AdminStatistics/AdminDispute/AdminApplication 类型 |
| `src/pages/AdminPage.tsx` | ~380 行，5 个 Tab 子组件，全功能 CRUD |

### 7.4 分页取数模式

管理后台的 Tab 中，数据获取模式需要特别注意 ESLint 规则：

```typescript
// ❌ 触发 set-state-in-effect
const fetch = (p: number) => {
  setLoading(true);  // 同步 setState！违规
  api(p).then(r => setItems(r.data.items));
};
useEffect(() => { fetch(page); }, [page]);

// ✅ 合规：effect 中直接发起 Promise，不在 effect 体内同步 setState
useEffect(() => {
  api(page + 1).then(r => {
    if (r.data) setItems(r.data.items);
  });
}, [page]);

// 允许点击操作后直接 reload（不在 effect 中）
const reload = () => api(page + 1).then(r => {
  if (r.data) setItems(r.data.items);
});
```

---

## 8. 后端环境配置与联调

### 8.1 MySQL 安装与配置流程

1. **卸载 MySQL Server 8.4** → `winget uninstall "MySQL Server 8.4"`
   - 问题：`mysqld.exe` 进程残留，仍占 3306 端口
   - 诊断：`netstat -ano | Select-String ":3306 "` 发现 PID 16444
   - `Get-Process -Id 16444` 显示为 `C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe`
   - 解决：`Stop-Process -Id 16444 -Force`

2. **安装 Docker Desktop** → `winget install Docker.DockerDesktop`
   - 下载 617MB，UAC 管理员确认
   - 安装后 Docker Engine 需等待数十秒初始化
   - 安装路径：`C:\Program Files\Docker\Docker\resources\bin\docker.exe`
   - docker 命令初始不在 PATH，需手动 `$env:Path += ";..."` 或重启终端

3. **启动 MySQL 容器**
   ```bash
   docker run -d --name campushub-mysql \
     -e MYSQL_ROOT_PASSWORD=password \
     -e MYSQL_DATABASE=campushub \
     -p 3306:3306 mysql:8.0
   ```
   - 问题：`--default-authentication-plugin=mysql_native_password` 作为 CMD 参数会覆盖 MySQL 镜像的默认 CMD（`mysqld`），导致端口映射 `-p 3306:3306` 不生效
   - 表现：`docker ps` 显示 `3306/tcp`（无 `0.0.0.0:3306->3306/tcp`）
   - 解决：启动时不传此参数，容器启动后 ALTER USER

4. **配置认证**
   ```sql
   ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
   FLUSH PRIVILEGES;
   ```

### 8.2 Prisma 配置

```bash
# 生成 Client（从 backend 根目录）
node node_modules/prisma/build/index.js generate --schema=shared/prisma/schema.prisma

# 建表
node node_modules/prisma/build/index.js db push --schema=shared/prisma/schema.prisma
```

> 不能用 `npm run prisma:generate`：npm workspace 从 `shared/node_modules/` 找 prisma，但依赖被 hoist 到根 `node_modules/`

### 8.3 后端启动

```bash
# service-b (认证/用户, 3002)
cd backend && node --import tsx/esm service-b/src/app.ts

# service-a (需求/订单, 3001)
cd backend && node --import tsx/esm service-a/src/app.ts

# 前端
cd frontend && pnpm dev
```

> 不能用 `npx tsx watch src/app.ts`：npm workspace hoisting 导致 `service-a/node_modules/tsx` 不存在

### 8.4 前端端口冲突

多次 start/stop Vite dev server 后，端口 5173 累积大量 `TIME_WAIT` 连接（Windows 上持续 2-4 分钟）。
解决：`pnpm dev --port 5176`

---

## 9. 组件测试集成

### 9.1 安装

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 9.2 配置

**vite.config.ts** 添加：
```typescript
/// <reference types="vitest/config" />
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/utils/__tests__/setup.ts',
}
```

**setup.ts**：
```typescript
import '@testing-library/jest-dom/vitest';
```

### 9.3 测试清单（27 个测试，5 文件）

| 文件 | 测试数 | 覆盖 |
|------|--------|------|
| `format.test.ts` | 7 | maskStudentId（正常/短输入）、maskPhone（正常/短输入）、formatReward（无偿/整数/小数） |
| `LoginPage.test.tsx` | 4 | 渲染（heading+输入框+按钮）、空提交校验、导航链接(href)、调用login |
| `RegisterPage.test.tsx` | 7 | 渲染、空提交、学号格式、密码长度、字母要求、确认一致、调用register |
| `ProtectedRoute.test.tsx` | 3 | 加载态(progressbar)、未登录跳转(/login)、已登录渲染(children) |
| `Layout.test.tsx` | 4 | 导航栏渲染、登录图标、用户头像、子路由 |

### 9.4 Mock 模式

```typescript
// 完整 AuthContext mock
const mockAuth: AuthContextType = {
  user: null, accessToken: null, isLoading: false, isAuthenticated: false,
  login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
};

// 正确的 mock user（必须用类型常量，不能用 as any）
import type { UserProfile } from '@/types';
const mockUser: UserProfile = {
  id: 1, nickname: 'test', studentId: '2024000001',
  creditScore: 70, role: 'student', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};
```

### 9.5 CI Lint 教训

测试文件中 `user: { ... } as any` 会导致 CI ESLint 报 `no-explicit-any`，本地漏跑 `pnpm lint` 则无法发现。

**预防措施**：每次提交前执行 `pnpm lint && pnpm check && pnpm test && pnpm build`

---

## 10. UI 美化

### 10.1 改动汇总

| 文件 | 改动 |
|------|------|
| `theme.ts` | 主色 `#1976d2`→`#2563eb`，辅色 `#388e3c`→`#059669`；卡片阴影；底部导航样式 |
| `Layout.tsx` | AppBar 蓝绿渐变背景 |
| `HomePage.tsx` | 从占位重写为品牌 Hero + 三个特性卡片 + 注册/登录入口 |

### 10.2 当前配色

```
primary:   #2563eb → #60a5fa → #1d4ed8  (blue-600/400/700)
secondary: #059669 → #34d399 → #047857  (emerald-600/400/700)
error:     #dc2626  |  warning: #d97706  |  bg: #f8fafc
AppBar: gradient 135deg #2563eb → #059669
```

---

## 11. 附录

### 11.1 所有 Commits

| commit | 消息 | 说明 |
|--------|------|------|
| `5785978` | feat: 搭建前端项目骨架 (Vite+React+TS+MUI) | 初始项目创建 |
| `22fd804` | feat: T05 前端基础架构 — types/api/auth/Layout/路由配置/测试 | 基础架构 |
| `372a30c` | feat: T09 个人资料页 — 编辑表单/头像上传/Snackbar反馈 | 个人资料 |
| `a62c1fb` | feat: T14 发布需求页面 — 表单/分类下拉/图片上传/校验 | 发布需求 |
| `6619ac6` | feat: T16 需求详情页 — 图片画廊/标签/发布者卡片/元信息 | 需求详情 |
| `ed0d098` | feat: T28 用户公开主页 — 资料卡片/信用分/评价列表 | 用户主页 |
| `0ffa68e` | feat: T39 管理后台 — 概览/用户/需求/纠纷/申请审批 | 管理后台 |
| `b6d4c18` | test: 添加组件测试 — RegisterPage/Layout/ProtectedRoute 全面覆盖 | 组件测试 |
| `d749c25` | style: UI美化 — 蓝绿渐变主题/AppBar/首页Hero/卡片阴影 | UI 美化 |

### 11.2 文件统计

```
src/api/        7 files  ~  600行   (admin/auth/client/demands/reviews/upload/users)
src/components/ 2 + 2 tests          (Layout/ProtectedRoute)
src/hooks/      1 file               (useAuth)
src/pages/      11 + 2 tests  ~1100行 (全部页面)
src/store/      2 files     ~160行   (authContext/AuthProvider)
src/types/      1 file      ~170行   (index.ts)
src/utils/      1 + 2 tests ~100行   (format/format.test/setup)
src/            3 files     ~120行   (App/main/theme)
```

### 11.3 后续前端B 任务

| 任务 | 页面 | 说明 |
|------|------|------|
| T15 | HomePage（需求广场） | 卡片列表 + 筛选/排序/分页/搜索 |
| T22 | DemandDetailPage 接单 | "接单"按钮 + 409 冲突处理 |
| T23 | OrderListPage | 我的订单（Tab + 状态筛选） |
| T24 | OrderDetailPage | 订单详情 + 状态流转操作 |
| T27 | ReviewForm | 评价入口 + 评分组件 |
| T34 | NotificationsPage | 通知列表 |
| T40 | 前端完善 | 紧急标签/匿名发布/纠纷入口/错误提示统一 |

### 11.4 常见问题速查

| 症状 | 原因 | 解决 |
|------|------|------|
| ESLint `no-explicit-any` | catch 块或类型断言使用 `any` | 用 `unknown` + 守卫函数 |
| ESLint `set-state-in-effect` | useEffect 中同步调用 setState | lazy initializer / 移除多余 setState |
| ESLint `only-export-components` | 组件文件导出非组件 | `allowConstantExport: true` |
| TS 文件名大小写冲突 | Windows 不区分，但编译器区分 | 避免仅大小写不同的文件名 |
| 页面白屏 | 后端返回类型不匹配（如 reward 是 string） | API 层做 `Number()` 转换 |
| `formatReward()` 报错 | `"0".toFixed()` 不存在 | API 层转换 string→number |
| `npx tsx` 找不到模块 | npm workspace hoisting | 用 `node --import tsx/esm` |
| Docker `-p` 映射不生效 | CMD 参数干扰 | 不加额外参数，容器启动后 ALTER USER |
| 端口 5173 被占 | TIME_WAIT | `pnpm dev --port 5176` |
| CI lint 不过但本地过 | 测试文件用了 `as any` | 必须用 `UserProfile` 类型常量 |
