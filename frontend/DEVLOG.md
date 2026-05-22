# CampusHub 前端开发日志

> 开发周期：2026-05-16 ~ 2026-05-22
> 分支：`feat/frontend` → `P4`
> 开发者：前端A（孙正奇），前端B（宋丞轩）
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
