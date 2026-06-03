# CampusHub 前端开发日志

> 开发周期：2026-05-16 ~ 2026-06-01
> 分支：`feat/frontend` → `P4`
> 开发者：前端A（孙正奇）、前端B（宋丞轩）、后端A（陈奕澎）
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
12. [前端B 开发记录](#12-前端b-开发记录)
13. [P4 分支整合与维护](#13-p4-分支整合与维护)
14. [聊天功能、通知红点与前端优化](#14-聊天功能通知红点与前端优化)
15. [UI/UX 细节修复与需求订单状态](#15-uiux-细节修复与需求订单状态)
16. [首页排序筛选重构与优化](#16-首页排序筛选重构与优化)
17. [单元测试扩展](#17-单元测试扩展)
18. [测试持续推进 + CI 优化](#18-测试持续推进--ci-优化)
19. [测试持续推进(二) + CI 修复](#19-测试持续推进二--ci-修复)
20. [测试持续推进(三)](#20-测试持续推进三)

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
| `41fbb23` | feat: 前端B全部任务完成 (T15/T22/T23/T24/T27/T34/T40) | 前端B 合并 |
| `720ff03` | feat: 前端界面美化 — 南大紫主题重设计 | 南大紫主题 |
| `7362d8e` | fix: 修复订单详情白屏、首页加载卡顿、接单按钮可见性 | Bug 修复 |
| `b4bcc04` | feat: 个人信息页修复 + 字段编辑补全 + 修改次数限制 | 个人信息页 |

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

---

## 12. 前端B 开发记录

> 开发者：前端B（宋丞轩）
> 基于代码追溯，非第一手记录

### 12.1 T15 需求广场（HomePage）

| 功能 | 实现 |
|------|------|
| 需求卡片列表 | 复用 DemandCard 组件，含分类色条/紧急脉冲动画/可接单标签 |
| 分类筛选 | Chip 横向滚动，9 分类 + "全部" |
| 排序 | ToggleButtonGroup：最新 / 报酬↓ / 报酬↑ |
| 搜索 | 400ms 防抖，通过 keyword 参数请求 |
| 分页 | Pagination 组件，10 条/页 |
| 骨架屏 | 加载态展示 5 张骨架 Card |
| 取消请求 | AbortController + useEffect 清理，防止竞态 |

### 12.2 T22 接单功能（DemandDetailPage 扩展）

- 接单按钮：需求开放 + 已登录 + 非本人时展示
- 未登录显示"登录后接单"按钮，点击跳转 /login
- 接单成功后 navigate 到订单详情页
- 失败时 Snackbar 展示错误信息（含 409 冲突场景）

### 12.3 T23/T24 订单列表与详情

**OrderListPage：**
- 顶部 Tabs 切换"我发布的"/"我承接的"（role 参数）
- Chip 状态筛选（全部 + 5 种订单状态）
- Pagination 分页，10 条/页
- 卡片点击跳转订单详情

**OrderDetailPage：**
- Stepper 展示状态进度：进行中 → 待确认 → 已完成
- 已取消/纠纷中状态用 Alert 替代 Stepper
- 操作按钮按角色和状态动态展示：
  - 承接者 + 进行中 → 提交完成
  - 发布者 + 待确认 → 确认完成
  - 进行中 → 取消订单（Dialog 输入原因）
  - 进行中/待确认 → 发起纠纷（Dialog 输入原因）
- 评价区集成在同一页面，非独立页面

### 12.4 T27 评价

- 集成在 OrderDetailPage 底部，订单"已完成"时展示
- 已评价：显示评分 + 内容（只读）
- 未评价：Rating 组件 + 多行文本框 + 字符计数（1000 限制）
- 评价后乐观更新，无需刷新

### 12.5 T34 通知列表

- 全部/未读 Chip 筛选
- 点击通知标记已读（乐观更新，前端直接改 isRead）
- 有 relatedId 时跳转对应订单
- 空状态提示区分"没有未读"和"还没有通知"
- Pagination 分页

### 12.6 T40 前端完善

本次前端B 未单独提取 T40 commit，相关改进分布在各个页面中：
- 紧急标签：DemandCard 红色脉冲动画 + 详情页 Chip
- 匿名发布：详情页展示匿名 Chip，发布者卡片隐藏昵称/不展示查看主页
- 纠纷入口：OrderDetailPage "发起纠纷"按钮 + Dialog
- 错误提示统一：沿用前端A 的 Snackbar + Alert 模式

---

## 13. P4 分支整合与维护

> 开发周期：2026-05-22
> 开发者：孙正奇

### 13.1 第一次运行：依赖链断裂

**背景**：接手 P4 分支代码后，需要在本地从头跑通整个项目。

**问题 1：npm 不在 PATH 中**

本机通过 pnpm 管理 Node 运行时（`pnpm bin/node`），npm 未安装。报错 `'npm' is not recognized`。

→ `pnpm add -g npm` 安装后可用。

**问题 2：pnpm 覆盖 npm workspace**

运行 `pnpm run build -w shared` 时，pnpm 检测到 backend 使用 npm workspaces（`package.json` 的 `workspaces` 字段，非 `pnpm-workspace.yaml`），将 npm 已安装的包移入 `node_modules/.ignored` 隔离。

后果：`node-schedule`、`typescript`、`concurrently` 等模块丢失，service-a 启动时报 `ERR_MODULE_NOT_FOUND`。

→ 需要二选一：要么全用 npm 重装，要么创建 `pnpm-workspace.yaml` 转 pnpm 管理。选了前者（保持仓库原有配置），但当时环境中 npm 不可用 → 先安 npm → 删 pnpm 产生的 `.ignored` → `npm install`。

> 见 8.3 后端启动 — 已知的 `npx tsx` 寻址问题依然存在，需用 `node --import tsx/esm`。

**问题 3：`@campushub/shared` 未编译**

后端 workspace 三包结构中，`service-a/b` 的 `package.json` 中 `main: "dist/index.js"`，但 `shared/dist/` 不存在（源码在 `shared/src/`，需 tsc 编译）。

→ `cd shared && tsc` 生成 dist。

**问题 4：Prisma Client 过时**

`npm install` 后 node_modules 重建，Prisma Client 丢失。编译 shared 时报类型错误（`Prisma.xxxWhereInput` 不存在）。

→ `prisma generate` 重新生成。需注意：npm workspace hoisting 下 prisma CLI 在根 `node_modules/`，不能直接用 `npx prisma`（见 8.2）。

### 13.2 Bug 修复：头像上传不生效

**症状**：上传头像后提示"头像更新成功"，但头像未更新，仍显示旧头像或首字母占位。

**定位过程**：

1. 代码审查（`frontend/src/pages/ProfilePage.tsx:63-78`）：
   ```
   用户选图 → POST /api/upload → { url: "/uploads/.../uuid.png" }
                                   ↓
        PUT /api/users/me { avatar: "/uploads/.../uuid.png" }
                                   ↓
   updateUser(res.data) → context 更新 → UI 刷新
   ```
   流程看起来完整，上传成功了，问题可能在更新后端用户记录这一步。

2. 手动 curl 验证（避开前端）：
   - POST /api/upload → 201, 返回 `{ url: "/uploads/2026-05/uuid.png" }` ✅
   - PUT /api/users/me `{ avatar: "/uploads/2026-05/uuid.png" }` → **400**
   - 错误体：`{ errors: [{ field: "avatar", message: "Invalid url" }] }`

3. 找到根因：`backend/service-b/src/validators/user-validators.ts:5`
   ```typescript
   avatar: z.string().url().max(500).optional(),
   //               ^^^^ Zod 要求完整 URL（含协议+域名）
   ```
   但上传接口返回的是**相对路径**（无 host），Zod 拒绝通过。

4. 前端为何"提示成功"？再看 `handleAvatarChange`：
   ```typescript
   if (res.data) {               // res = upload result → 成功，进这里
     const updateRes = await updateMe({ avatar: res.data.url });
     if (updateRes.data) {       // updateRes.data = null（400 拒绝了）
       updateUser(updateRes.data);
       setSnackbar("头像更新成功");
     }
     // ← 没有 else！update 失败时既不报错也不回退
   }
   ```
   upload 成功 → 进外层 if → update 失败（400）→ updateRes.data 为 null → 内层 if 不成立 → **静默结束**，Snackbar 既不显示成功也不显示失败。

**修复**：
- 后端：`z.string().url()` → `z.string()`（avatar 字段存的是相对路径，无需 URL 校验）
- 前端：补充 `else { setSnackbar({ ..., message: updateRes.error || '更新头像失败', severity: 'error' }) }`

**涉及文件**：
- `backend/service-b/src/validators/user-validators.ts`
- `frontend/src/pages/ProfilePage.tsx`

### 13.3 首屏加载 10s 问题

**现象**：第一次访问 `http://localhost:5173` 时首屏需要约 10s 加载，后续无论用什么浏览器访问都 < 1s。

**原因**：Vite 的**依赖预构建**机制。

1. 第一次请求时，Vite 扫描 `main.tsx` 的 import 图，发现 React、React Router、MUI（数十个组件包）、axios 等依赖
2. 用 esbuild 将这些 CJS/UMD 模块批量编译为 ESM，结果写入 `node_modules/.vite/`
3. MUI 是重量级依赖（每个组件独立包），预构建耗时 5-10s
4. 构建完成后，`.vite/` 缓存持久化，后续请求跳过此步骤
5. `.vite/` 存在服务端，所以换浏览器不受影响

**与生产环境的区别**：`pnpm build`（vite build）会在构建时一次性完成所有编译，首屏加载不存在此问题。

### 13.4 Vite 冷启动观察

后端服务（service-b）日志中观察到两次访问：

| 时间 | User-Agent | 行为 |
|------|-----------|------|
| 12:19 | Edge 148 | 首页加载 → 逐一点击 9 个分类筛选，全部返回 200 |
| 12:20 | VS Code (Chrome/Electron) | 首页加载，返回 304（缓存命中） |

说明 Vite 代理正常工作，前后端通信正常。

### 13.5 管理员账号

系统无预设管理员账号（数据库中没有 `role: admin` 的用户），所有用户默认 `student` 角色。

管理员申请（AdminPage ApplicationsTab）需要已有 admin 来审批，形成鸡—蛋问题。首次使用需手动将一个用户升为 admin：

```bash
node -e "
import prisma from '@campushub/shared/dist/utils/prisma.js';
await prisma.user.update({ where: { id: <userId> }, data: { role: 'admin' } });
await prisma.\$disconnect();
"
```

本次创建的测试管理员：学号 `2024000002`，密码 `Admin1234`。

### 13.6 文档更新

- `CLAUDE.md`（根目录）：更新分支/状态信息，指向 P4，修正文件名引用
- `frontend/CLAUDE.md`：全面重写（375→210行），从历史记录型转为项目快照型。砍掉过时的 A/B 分工、T05 实现规划、API 端点清单；新增页面速查表、关键模式代码片段、踩坑速查表
- `frontend/README.md`：从 Vite 模板替换为项目简介
- `frontend/DEVLOG.md`：追加本章 + 前端B 记录 + 补全 commits + 更新目录

---

## 14. 聊天功能、通知红点与前端优化

> 日期：2026-06-01
> 开发者：陈奕澎（后端聊天API + 前端ChatPage），孙正奇（通知红点 + 聊天通知 + 颜色修复）

### 14.1 新增功能

**① 订单聊天**

后端新增消息 API（`GET/POST /api/messages`，service-b），包含：
- `message-controller.ts` / `message-service.ts` / `message-routes.ts` / `message-validators.ts`
- `message-repository.ts`（shared 层）
- 权限校验：只有订单双方（发布者/接单者）才能查看和发送消息

前端新增 ChatPage（`/orders/:id/chat`，294 行），包含：
- 3 秒轮询新消息（仅页面可见时）
- 分页加载历史消息（"加载更多"）
- 自动滚动到最新消息
- Enter 快捷发送（Shift+Enter 换行）
- 发送失败回填文本

OrderDetailPage 新增"聊天"入口按钮。

**② 通知铃铛红点**

Layout 组件新增：
- 每 30 秒轮询通知 API 获取 `unreadCount`
- 铃铛图标用 MUI `Badge` 包裹，有未读时显示红点数字
- 无需用户点进通知页就能看到提醒

**③ 新消息通知**

后端 `message-service.ts` 发消息后自动调用 `notifyNewMessage`，给接收方创建一条 `new_message` 类型通知，通知页显示"xxx 发来一条消息"。

**④ 发布者需求管理**

- OrderListPage "我发布的" Tab 混排显示未接单需求（黄色"开放中"标记）
- DemandDetailPage 发布者可见"删除需求"按钮（带确认弹窗）
- 订单取消后允许其他用户重新接单（后端乐观锁 + version 增量）

### 14.2 Bug 修复

**① 自己消息文字颜色看不清**

ChatPage 中自己消息气泡背景从 `primary.main`（#6B2FA0）改为 `primary.light`（#8E5CBF），字重从 400 提到 500，白字在浅紫上更柔和易读。

**② OrderListPage lint 错误**

同学提交的代码中存在 `react-hooks/set-state-in-effect` 违规（同步 `setDemands([])` 在 effect 体）。修复：去掉同步 setState，用 cleanup `cancelled` flag 阻止过期异步更新。见 [13. 踩坑：setState 同步调用](#134-eslint-react-hooksset-state-in-effect)。

### 14.3 协作冲突与 Git 历史整理

**冲突背景**：
1. 孙正奇提交 `f7bfe8c`（文档更新 + 误添加根目录 package.json/pnpm-lock.yaml）
2. 陈奕澎基于此提交开始开发，提交了 `19f95db`（ngrok allowedHosts + 后端 pnpm-lock.yaml）
3. 孙正奇发现根目录文件错误，force push `63d0f06` 替换掉 `f7bfe8c`
4. 陈奕澎推送时产生 merge 冲突，自动生成 merge commit `7f82f4e`
5. 陈奕澎又提交 `85f6abf` 再次删除根目录文件（重复操作）

**解决**：本地 `git reset --hard 191dcfe` 回到头像修复提交，`git reset --soft HEAD~1` 保留文档变更，删除根目录文件，跑全流程后重提交 `63d0f06`。然后 force push 到远端。

最终陈奕澎的 3 个实际功能提交（`1db41ae` + `cd3e6dc` + `9e2afc4` + `a333b94` + `32fefb1`）通过 `git pull --ff-only` 合并回本地。

### 14.4 涉及文件清单

```
backend/shared/src/utils/notification-helper.ts  + notifyNewMessage 函数
backend/shared/src/index.ts                      + 导出 notifyNewMessage
backend/service-b/src/service/message-service.ts + 发消息后创建通知
backend/service-b/src/controller/message-controller.ts  新增
backend/service-b/src/service/message-service.ts        新增
backend/service-b/src/routes/message-routes.ts          新增
backend/service-b/src/validators/message-validators.ts  新增
backend/shared/src/repository/message-repository.ts     新增
backend/service-b/src/app.ts                      注册 /api/messages 路由
frontend/src/pages/ChatPage.tsx                   新增（294 行）
frontend/src/api/messages.ts                      新增
frontend/src/components/Layout.tsx                铃铛红点 + 轮询
frontend/src/pages/NotificationsPage.tsx          新增 new_message 标签
frontend/src/pages/OrderListPage.tsx              修 lint 错误
frontend/src/pages/OrderDetailPage.tsx            聊天入口
frontend/src/pages/ChatPage.tsx                   消息颜色修复
frontend/src/types/index.ts                       新增 ChatMessage + new_message
frontend/vite.config.ts                           代理 /api/messages
frontend/package.json + pnpm-lock.yaml            依赖升级
```

---

## 15. UI/UX 细节修复与需求订单状态

> 日期：2026-06-01
> 开发者：孙正奇

### 15.1 修复项

| # | 问题 | 改动 |
|---|------|------|
| 1 | 自己消息灰字看不清 | 去掉 `variant="body2"`，`sx.color: inherit` 避免主题 body2 覆盖 Paper 白色 |
| 4 | 通知分类跳转 | `new_message` → `/orders/:id/chat`，其余 → `/orders/:id` |
| 5 | 红点看完不消失 | 标记已读后 dispatch `notifications:update` 事件，Layout 监听该事件 + `focus` 事件刷新 |
| 6 | 聊天气泡直角 | 独立 border 属性：自己右下角 4px 圆角，对方左下角 4px 圆角 |
| 7 | 聊天字号偏小 | 消息内容 14px → 16px（1rem） |
| 8 | 顶栏/输入框随页面滚动 | 改用 `position:fixed` 浮动卡片布局，填充 AppBar 与 BottomNav 之间，仅消息区滚动 |
| 9 | 需求图片不可放大 | 点击主图弹出 Dialog，黑底全屏查看，右上角关闭按钮 |
| 10 | 需求详情无订单状态 | 后端 `demandDetailSelect` 追加 `order` 关联，前端显示"xxx 已接单 + 查看订单"按钮 |

### 15.2 关键修复细节

**#1 颜色覆盖问题排查**（第 13 章踩坑的延续）：

ChatPage 中自己消息气泡设置 `color: '#fff'`，但内部 `<Typography variant="body2">` 最终呈现灰色。根因：主题配置 `body2: { color: TEXT_SECONDARY }` 的 CSS 类选择器优先级高于 Paper 的 `color` 继承。修复后不再使用 `variant="body2"`，改为 `sx={{ fontSize: '1rem', color: 'inherit' }}`。

**#5 通知红点刷新机制**：

```
NotificationsPage                    Layout
  └─ markNotificationRead(id)         └─ 轮询 30s
  └─ dispatch('notifications:update')  └─ 监听此事件 → 立即刷新
                                       └─ 监听 window focus → 刷新
```

**#10 需求订单状态**：

后端改动 `backend/shared/src/repository/demand-repository.ts` 的 `demandDetailSelect`，增加 `order` 关联查询（含 provider 信息），并在 `demand-service.ts` 中映射为 `currentOrder` 字段返回前端。前端 DemandDetailPage 在存在 `currentOrder` 时显示"xxx 已接单"卡片及"查看订单"跳转按钮。

### 15.3 聊天返回导航优化

原返回按钮固定跳转订单详情页（`/orders/:id`），用户可能从通知页、首页等多个入口进入聊天。改为 `navigate(-1)` 默认返回上一页，同时在顶栏右侧增加"订单详情"按钮提供显式跳转。

### 15.4 涉及文件

```
frontend/src/pages/ChatPage.tsx              #1 #6 #7 #8 #返回 颜色/圆角/字号/布局/后退
frontend/src/pages/NotificationsPage.tsx      #4 #5 通知跳转 + 事件派发
frontend/src/components/Layout.tsx            #5 监听事件 + focus 刷新红点
frontend/src/pages/DemandDetailPage.tsx       #9 #10 图片 Dialog + 订单状态
frontend/src/types/index.ts                  新增 new_message 通知类型
backend/shared/src/repository/demand-repository.ts  #10 demandDetailSelect 加 order
backend/service-a/src/service/demand-service.ts     #10 映射 currentOrder
frontend/CLAUDE.md + DEVLOG.md               文档更新
```

---

## 16. 首页排序筛选重构与优化

> 日期：2026-06-01
> 开发者：孙正奇

### 16.1 背景

首页原有排序用 `ToggleButtonGroup exclusive` 切换，三个按钮（最新/报酬↓/报酬↑）。有两个实际痛点：

1. **ToggleButton 的 exclusive 模式存在反直觉行为**：选中状态下再次点击会传 null，handler 虽然用 `if (val)` 忽略掉了，但按钮会有一次视觉闪烁，用户感觉点了没反应
2. **没有状态筛选**：已完成/已关闭的需求也出现在首页，排序看起来是乱的（"共 5 条需求"里 3 条已完成，按时间排序也看不出规律）

同时在这次重构之前，经过了几轮小问题修复的反馈循环，积累了一些对 UI 细节一致的追求。

### 16.2 设计方案讨论

最初考虑过两种路线：

**路线 A — 全前端处理**：一次性拉取全部需求（`pageSize=999`），筛选/排序/分页全在浏览器内存做。优点是后端零改动、切换筛选瞬间响应。缺点是数据量大了首次加载慢。

**路线 B — 前后端各司其职**：所有筛选/排序参数通过 API 传给后端，后端负责查询和分页，前端只负责展示。

用户最终否决了路线 A（"不规范"），选了路线 B。所以后端需要新增对多分类、报酬范围的支持。

### 16.3 关键决策与过程

**排序 UI**：参考 B 站的交互风格，两个独立按钮（发布时间 / 报酬），每个按钮内嵌箭头指示方向。用户点箭头切换升降序，点按钮名切换排序激活。实现时用了一个 `SortButton` 组件抽到函数外层，避免 ESLint `react-hooks/static-components` 报错。

**分类多选**：`selectedCats: string[]` 数组管理。"全部"是独占重置，点击其他分类 toggle 加入/移除。后端接收逗号分隔 `?category=快递代取,学习辅导`，在前端 API 层用 `categories.join(',')` 转换。

**状态筛选**：标签和值的分离是个坑。前端 Chip 显示"开放中"，但后端 `DemandStatus` 枚举值是 `'开放'`（非 '开放中'）。初版直接把 '开放中' 当 status 传过去，后端不认识，返回"参数错误"。修复：改为 `{ label: '开放中', value: '开放' }` 结构。

**报酬输入框细节**：经过多次用户反馈迭代：

| 轮次 | 反馈 | 修复 |
|------|------|------|
| 1 | 没居中、有上下箭头 | `textAlign: center` + CSS hide spin-button |
| 2 | 没阻止负数 | `onChange` 过滤 `Number(v) < 0` |
| 3 | 没阻止最小 > 最大 | 尝试 onChange 拦截，后改为"不拦截输入，后端/默认值处理" |
| 4 | 选中时两框不同步紫色 | `rewardIdx === -1` 时统一 `borderColor: primary.main` |
| 5 | 最大默认值应为无穷 | placeholder 改为 "∞"，后端不传 maxReward = 无上限 |

**评价回显**（遗留问题 #2）：OrderDetailPage 原仅在提交成功后设 `existingReview`，刷新后回到 null。需要后端提供一个"查当前用户对某订单的评价"接口。幸运的是 `reviewRepository` 已有 `findByOrderAndUser` 方法，只需在 controller 层暴露为 `GET /api/reviews/my?orderId=X`。

### 16.4 后端改动

`demand-repository.ts` 的 `DemandFilter` 新增三个可选字段，`findMany` 中对应处理：

```typescript
categories?: DemandCategory[];   // → where.category = { in: categories }
minReward?: number;              // → where.reward = { gte: minReward }
maxReward?: number;              // → where.reward = { lte: maxReward }
```

controller 层从 query 解析：`category` 逗号分隔字符串 split 成数组，`minReward`/`maxReward` 转 number。

### 16.5 涉及文件

```
backend/shared/src/repository/demand-repository.ts   新增 categories/minReward/maxReward
backend/service-a/src/controller/demand-controller.ts 解析新参数
backend/service-b/src/controller/review-controller.ts 新增 getMyReview
backend/service-b/src/service/review-service.ts       新增 getMyReview
backend/service-b/src/routes/review-routes.ts         注册 GET /my
frontend/src/pages/HomePage.tsx                       完整重写排序/筛选
frontend/src/pages/OrderDetailPage.tsx                加载已有评价
frontend/src/api/reviews.ts                           新增 getMyReview
frontend/src/types/index.ts                           更新 DemandQueryParams
frontend/src/api/demands.ts                           转换 categories 数组
frontend/CLAUDE.md + DEVLOG.md                        同步

---

## 17. 单元测试扩展（稳扎稳打）

> 日期：2026-06-03
> 背景：完成全部前端功能后，系统化补写高质量单元测试

### 17.1 为什么要写（而不是"先写完再补"）

之前的测试策略是"先验证核心功能"：LoginPage、RegisterPage、ProtectedRoute 覆盖了基本的路由守卫和表单校验。但项目后期对纯函数（`format.ts`）、基础设施（axios 401 刷新）、可复用组件（`DemandCard`）的覆盖率很低——这些都是高稳定性收益低测试成本的模块。

### 17.2 测试策略分层

```
Layer 1  纯函数（format.ts）         — 无依赖，易覆盖 ← 首选
Layer 2  基础设施（client.ts）        — mock 外部库，测全路径
Layer 3  展示组件（DemandCard, PageTransition） — props → UI 断言
Layer 4  Hook（useAuth）              — 正常 + 越界路径
Layer 5  页面（LoginPage等已有）      — 已有，维持即可
```

核心原则：
- **纯函数不 mock**：`formatReward`、`demandStatusColor` 等直接用真实实现
- **非确定性 mock**：`formatRelativeTime` 依赖 `Date.now` → mock 返回固定值
- **外部库 mock**：`useNavigate` 全局 mock，axios 用 `vi.hoisted` 模式防止 hoisting 问题
- **覆盖率不设目标**：不追求某一比例，而是逐个文件判断"值不值得测"

### 17.3 新增/修改文件

| 文件 | 类型 | 用例数 | 覆盖情况 |
|------|------|--------|---------|
| `format.test.ts` | 扩展 | 7→27 | 全部 8 函数 100%，含边界（6位字符、午夜、35天回落） |
| `DemandCard.test.tsx` | 新增 | 16 | 100% stmts，组合渲染态：紧急/匿名/可接单/非登录/自己/类别循环 |
| `client.test.ts` | 新增 | 14 | ~92% stmts：401 重试/刷新队列/并发去重/auth端点特殊处理 |
| `useAuth.test.tsx` | 新增 | 2 | 100%：正常返回 + 越界抛错 |
| `PageTransition.test.tsx` | 新增 | 5 | 100%：结构渲染 + 空子元素 |

### 17.4 关键技术与坑

**vi.hoisted 模式（必须）**：vitest 的 `vi.mock` 工厂函数会被提升到文件顶部，引用外部变量会报 `ReferenceError`。必须用 `vi.hoisted()` 包裹所有需要在 mock 工厂中使用的变量：

```typescript
const { mockAxiosInstance } = vi.hoisted(() => {
  const instance = vi.fn();
  (instance as any).interceptors = { request: { use: vi.fn() }, response: { use: vi.fn() } };
  return { mockAxiosInstance: instance };
});
vi.mock('axios', () => ({ default: { create: vi.fn(() => mockAxiosInstance) } }));
```

**React 19 + renderHook 异常测试**：React 19 下 `renderHook(() => useAuth())` 直接同步抛出错误（而非存入 `result.error`），所以用 `expect(() => renderHook(...)).toThrow()`。

**MUI sx 生成的 CSS 类不可 inline 断言**：`sx={{ '& > *': { animationDelay: '60ms' } }}` 经由 emotion 编译为 CSS 类名，jsdom 中拿不到 `element.style.animationDelay`（为空字符串）。这类 CSS 视觉特性更适合端到端测试，单元测试只验证结构。

**覆盖率配置**：在 `vite.config.ts` 中配置 `coverage: { provider: 'v8', reporter: ['text'], include: ['src/**/*.{ts,tsx}'], exclude: [...] }`。由于 vitest 4.1.7 和 @vitest/coverage-v8 4.1.8 版本不一致有 warning，后续需统一升级。

### 17.5 测试全景（截至 2026-06-03）

```
84 tests | 9 files
  format.test.ts         — 27  格式/脱敏/相对时间/状态→颜色
  DemandCard.test.tsx    — 16  渲染态/标签逻辑/导航
  client.test.ts         — 14  axios 401 刷新队列
  PageTransition.test.tsx—  5  动画容器渲染
  useAuth.test.tsx       —  2  Hook 正常/越界
  RegisterPage.test.tsx  —  7  表单校验
  LoginPage.test.tsx     —  4  登录表单
  Layout.test.tsx        —  4  AppBar + badge
  ProtectedRoute.test.tsx—  3  路由守卫
```

整体 statements 覆盖率 ~13.6%（主要受限于 12 个页面组件和 API 层薄封装尚未覆盖）。

### 17.6 后续可测方向

当前测试策略偏向"测试成本低、稳定收益高"的模块。以下模块测试成本更高，但业务价值大：

- **HomePage.tsx** — 排序/筛选状态机 + 分页 + 防抖，但需要 mock 大量 API
- **OrderDetailPage.tsx** — 订单状态流转（完成→确认→纠纷）的业务逻辑
- **ChatPage.tsx** — 轮询 + 分页历史 + Enter 发送
- **API 层（auth.ts / demands.ts / orders.ts）** — 薄 axios 封装，需 mock client 实例

以上都需要更大的 mocking 投入，留待后续按需补充。

---

## 18. 测试持续推进 + CI 优化

> 日期：2026-06-03
> 内容：Layout(菜单/通知/登出) + LoginPage(loading/错误态) + RegisterPage(选填字段+分支100%) + AuthProvider(认证状态机) + DemandDetailPage(图片/接单/删除) + 前端CI流水线优化

### 18.1 测试进展

本轮把测试覆盖从"基础设施"延伸到"认证核心组件"和"页面级组件"：

| 文件 | 新增用例 | 覆盖要点 |
|------|---------|---------|
| `Layout.test.tsx` | 12→16 | 用户菜单弹出/关闭、通知铃铛导航、Badge红点、登出流程、管理员权限 |
| `LoginPage.test.tsx` | 4→7 | loading态按钮禁用、"登录中…"文案、登录失败错误回显、非Error类型fallback |
| `RegisterPage.test.tsx` | 8→10 | 选填字段(真实姓名/邮箱)、catch块(注册失败)、`beforeEach` reset |
| `AuthProvider.test.tsx` | 新增11 | 初始无token态、session恢复(三种路径)、login/logout、auth:logout事件、register、updateUser |
| `DemandDetailPage.test.tsx` | 新增13 | loading/error态、基本信息渲染、图片画廊+预览弹窗、发布者卡片(匿名/非匿名)、当前订单卡片+参与者权限、接单(已登录/未登录)、删除(确认弹窗+跳转) |

### 18.2 关键技术与坑

**React 19 + 异步错误处理**：登录失败时 `login()` throw，但 React 19 的事件处理器不捕获异步 reject，导致 vitest 报 unhandled rejection。解决方案是用 `process.on('unhandledRejection', handler)` 临时屏蔽（`AuthProvider.test.tsx`）。

**`vi.mock` 的模块隔离**：AuthProvider 和 DemandDetailPage 分别 mock 了 `@/api/auth` 和 `@/api/demands`。要注意 mock 只在本文件生效，不影响其他测试。

**`getMe` 从不 throw**：`users.ts` 的 `getMe` 内部 try-catch 后返回 `{ data: null, error: msg }` 而非 throw。Mock 时用 `mockResolvedValue({ data: null, error: '...' })` 而不是 `mockRejectedValue`。

### 18.3 CI 流水线优化

对比后端 pipeline 后发现前端可改进：

**问题**：三个 job（lint/build/test）各自 `npm install -g pnpm && pnpm ci`，重复安装依赖，每次多花 ~60-90s。

**优化**：新增 `install` stage，输出 `node_modules/` 作为 artifacts，后续 jobs 通过 `needs: [frontend-install]` 依赖并行执行。

### 18.4 测试全景（截至 2026-06-03）

```
128 tests | 11 files
  format.test.ts             27  格式/脱敏/相对时间/状态→颜色
  DemandCard.test.tsx        16  渲染态/标签逻辑/导航
  Layout.test.tsx            16  AppBar/菜单/通知铃铛/登出/管理员
  client.test.ts             14  axios 401 刷新队列
  DemandDetailPage.test.tsx  13  图片/接单/删除/订单卡片
  AuthProvider.test.tsx      11  认证状态机：session/token/login/logout
  RegisterPage.test.tsx      10  表单校验 100% 分支
  LoginPage.test.tsx          7  登录表单/loading/错误态
  PageTransition.test.tsx     5  动画容器渲染
  ProtectedRoute.test.tsx     3  路由守卫
  useAuth.test.tsx            2  Hook 正常/越界
```

整体 statements 覆盖率 **9.25% → 23.42%**。

### 18.5 涉及文件

```
.gitlab/frontend.yml                                   CI 流水线优化：独立 install stage
frontend/src/components/__tests__/Layout.test.tsx       扩展：菜单/通知/登出/管理员
frontend/src/pages/__tests__/LoginPage.test.tsx         扩展：loading/错误态
frontend/src/pages/__tests__/RegisterPage.test.tsx      扩展：选填字段/catch块
frontend/src/pages/__tests__/DemandDetailPage.test.tsx  新增：全组件测试
frontend/src/store/__tests__/AuthProvider.test.tsx      新增：认证状态机
frontend/CLAUDE.md + DEVLOG.md                          同步
```

---

## 19. 测试持续推进(二) + CI 修复

> 日期：2026-06-03
> 内容：OrderDetailPage(状态流转) + NotificationsPage(通知/筛选) + OrderListPage(Tab/混排) + CI pnpm 修复

### 19.1 测试进展

| 文件 | 用例数 | 覆盖要点 |
|------|--------|---------|
| `OrderDetailPage.test.tsx` | 20 | 订单状态流转(进行中→待确认→已完成)、操作按钮(提交完成/确认完成/取消/纠纷/聊天)、角色权限(publisher vs provider)、评价区(表单/回显)、对话框(取消/纠纷) |
| `NotificationsPage.test.tsx` | 11 | 列表渲染/未读标记/标记已读+dispatch事件/按类型导航(new_message→chat/其他→order)/筛选全部/未读/查看按钮 |
| `OrderListPage.test.tsx` | 11 | Tab切换(publisher/provider)、状态筛选(6个Chip)、开放需求混排+跳转、provider Tab不拉取开放需求 |

### 19.2 关键技术与坑

**MUI Rating 在 jsdom 中无法点击**：`getAllByRole('radio')` 找到的星号 radio input 在 jsdom 中有 `pointer-events: none`，`userEvent.click` 和 `fireEvent.click` 都无法触发的 onChange。最终策略：验证提交按钮初始 disabled 态 + 评价表单渲染，跳过星号交互。

**"进行中" 文本重复**：OrderDetailPage 的 status chip 和 Stepper 步骤中同时出现"进行中"。改用 `getAllByText` 确认至少出现一次，而非 `getByText`。

**Tabs onChange 类型**：MUI Tabs 的 onChange 签名传 `(event, value)`，value 可能是 `string` 或 `number`。`handleRoleChange` 中 `val as 'publisher' | 'provider'` 在测试中触发正常。

**创建测试辅助函数时的 OrderStatus vs DemandStatus**：`makeOrder` 中的 `status` 参数为 `OrderStatus`，但内嵌的 `demand` 字段要求 `DemandStatus`。`'进行中'` 在两个类型中都存在，但需要用 `as DemandStatus` 转换。

### 19.3 CI 修复

首次优化后的 CI 流水线发现 pnpm 未预装在 `node:lts` 镜像中。修复：`lint/build/test` 每个 job 加 `before_script: npm install -g pnpm`（仅 ~3s），node_modules 仍从 install stage 的 artifacts 复用。

### 19.4 测试全景（截至 2026-06-03）

```
171 tests | 14 files
  format.test.ts             27  格式/脱敏/相对时间/状态→颜色
  DemandCard.test.tsx        16  渲染态/标签逻辑/导航
  Layout.test.tsx            16  AppBar/菜单/通知铃铛/登出/管理员
  OrderDetailPage.test.tsx   20  订单状态流转/操作按钮/评价
  client.test.ts             14  axios 401 刷新队列
  DemandDetailPage.test.tsx  13  图片/接单/删除/订单卡片
  NotificationsPage.test.tsx 11  通知/标记已读/筛选/导航
  AuthProvider.test.tsx      11  认证状态机
  OrderListPage.test.tsx     11  Tab切换/状态筛选/混排
  RegisterPage.test.tsx      10  表单校验 100% 分支
  LoginPage.test.tsx          7  登录表单/loading/错误态
  PageTransition.test.tsx     5  动画容器渲染
  ProtectedRoute.test.tsx     3  路由守卫
  useAuth.test.tsx            2  Hook 正常/越界
```

整体 statements 覆盖率 **9.25% → 37.6%**。

### 19.5 涉及文件

```
.gitlab/frontend.yml                                   CI 修复：before_script 装 pnpm
frontend/src/pages/__tests__/OrderDetailPage.test.tsx  新增：订单状态流转
frontend/src/pages/__tests__/NotificationsPage.test.tsx 新增：通知列表
frontend/src/pages/__tests__/OrderListPage.test.tsx     新增：订单列表
frontend/CLAUDE.md + DEVLOG.md                          同步
```

---

## 20. 测试持续推进(三)

> 日期：2026-06-03
> 内容：UserPublicPage + ProfilePage + CreateDemandPage 单元测试

### 20.1 新增测试

| 文件 | 用例数 | 覆盖要点 |
|------|--------|---------|
| `UserPublicPage.test.tsx` | 11 | 用户公开资料展示(昵称/学分/学院/姓名)、评价列表渲染、空评价 |
| `ProfilePage.test.tsx` | 12 | 查看模式脱敏、编辑模式切换、表单校验、保存、头像上传 |
| `CreateDemandPage.test.tsx` | 8 | 表单字段渲染、空标题/无分类校验、发布成功/失败、图片上传 |

### 20.2 关键技术与坑

**`document.querySelector` 返回类型**：在 tsconfig 严格模式下返回 `Element` 而非 `HTMLElement`，传给 `userEvent.upload` 需 `as HTMLElement`。

**`PublicUserProfile.name` 为 required**：mock 数据显式提供 `name: null`。

**`type="number"` 在 jsdom 的限制**：jsdom 的 number input 过滤非数字字符（如 `-`），导致负数校验无法在 jsdom 测试。

### 20.3 测试全景（截至 2026-06-03）

```
200 tests | 17 files
  format.test.ts             27  格式/脱敏/相对时间
  DemandCard.test.tsx        16  渲染态/标签逻辑/导航
  Layout.test.tsx            16  AppBar/菜单/通知/登出
  OrderDetailPage.test.tsx   20  订单状态流转/评价
  client.test.ts             14  axios 401 刷新队列
  DemandDetailPage.test.tsx  13  图片/接单/删除
  NotificationsPage.test.tsx 11  通知/标记已读/筛选
  AuthProvider.test.tsx      11  认证状态机
  OrderListPage.test.tsx     11  Tab切换/状态筛选
  UserPublicPage.test.tsx    11  公开资料/评价列表
  RegisterPage.test.tsx      10  表单校验 100% 分支
  ProfilePage.test.tsx       12  编辑模式/保存/头像
  CreateDemandPage.test.tsx   8  表单验证/图片上传
  LoginPage.test.tsx          7  登录表单/loading
  PageTransition.test.tsx     5  动画容器渲染
  ProtectedRoute.test.tsx     3  路由守卫
  useAuth.test.tsx            2  Hook 正常/越界
```

整体 statements 覆盖率 **9.25% → 47.74%**。

### 20.4 涉及文件

```
frontend/src/pages/__tests__/UserPublicPage.test.tsx    新增：公开资料
frontend/src/pages/__tests__/ProfilePage.test.tsx       新增：个人资料编辑
frontend/src/pages/__tests__/CreateDemandPage.test.tsx  新增：发布需求
frontend/CLAUDE.md + DEVLOG.md                          同步
```
