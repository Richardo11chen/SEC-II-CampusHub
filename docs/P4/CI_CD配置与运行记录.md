# CI/CD 配置与运行记录

## 一、配置文件结构

```
.gitlab-ci.yml          # 根触发文件 — 按路径变化触发 backend/frontend 子 pipeline
.gitlab/
├── backend.yml          # 后端 pipeline 定义（install → lint → build → test）
└── frontend.yml         # 前端 pipeline 定义（install → lint → build → test）
```

### 1.1 根触发文件 `.gitlab-ci.yml`

```yaml
stages:
  - trigger

backend:
  stage: trigger
  trigger:
    include:
      - local: .gitlab/backend.yml
  rules:
    - changes:
        - backend/**/*

frontend:
  stage: trigger
  trigger:
    include:
      - local: .gitlab/frontend.yml
  rules:
    - changes:
        - frontend/**/*
```

作用：根据 Git 提交变更路径自动触发对应子 pipeline。`backend/**/*` 变更触发后端流水线，`frontend/**/*` 变更触发前端流水线。

---

## 二、后端 CI/CD 流水线（`.gitlab/backend.yml`）

### 2.1 阶段总览

| 阶段 | Job | 依赖 | 镜像 | 主要操作 |
|------|-----|------|------|---------|
| `install` | `backend-install` | 无 | `node:lts` | `npm ci` 安装依赖 |
| `lint` | `backend-lint` | install | `node:lts` | `npm run lint`（tsc --noEmit 类型检查） |
| `build` | `backend-build` | install | `node:lts` | `npm run build` 编译三个包 |
| `test` | `backend-test` | build | `node:lts` + MySQL 8.0 | `prisma db push` + `vitest` 运行测试 |

### 2.2 依赖缓存

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - backend/node_modules/
```

各分支独立缓存 `node_modules/`，减少重复安装。

### 2.3 环境变量

```yaml
variables:
  MYSQL_ROOT_PASSWORD: test_password
  MYSQL_DATABASE: campushub_test
  DATABASE_URL: mysql://root:test_password@mysql:3306/campushub_test
```

`test` 阶段启动 MySQL 8.0 service 作为测试数据库。集成测试使用此 `DATABASE_URL` 连接。

### 2.4 各 Job 详解

**install：**
```yaml
backend-install:
  stage: install
  image: node:lts
  script:
    - cd backend && npm ci
  artifacts:
    paths:
      - backend/node_modules/
```
`npm ci` 确保可复现安装，产出 `node_modules/` 供后续阶段使用。

**lint：**
```yaml
backend-lint:
  script:
    - cd backend && npm run lint
```
`npm run lint` 等价于三包的 `tsc --noEmit` 并行类型检查：
```
npx tsc --noEmit -p shared/tsconfig.json
npx tsc --noEmit -p service-a/tsconfig.json
npx tsc --noEmit -p service-b/tsconfig.json
```

**build：**
```yaml
backend-build:
  script:
    - cd backend && npm run build
  artifacts:
    paths:
      - backend/shared/dist/
      - backend/service-a/dist/
      - backend/service-b/dist/
```
先编译 shared（被依赖包），再编译 service-a / service-b。产出 dist/ 供 test 阶段使用。

**test（核心）：**
```yaml
backend-test:
  stage: test
  services:
    - mysql:8.0
  script:
    - cd backend
    - cd shared && npx prisma db push --skip-generate && cd ..
    - npm run test -- --reporter=junit --reporter=verbose
  artifacts:
    reports:
      junit: backend/test-results/*.xml
    paths:
      - backend/coverage/
```
- 启动 MySQL 8.0 service，通过 `DATABASE_URL` 连接
- `prisma db push` 同步数据库 schema（不需要生成 Prisma Client）
- `vitest` 运行全部 31 个测试文件，输出 JUnit XML 报告 + 覆盖率

---

## 三、前端 CI/CD 流水线（`.gitlab/frontend.yml`）

### 3.1 阶段总览

| 阶段 | Job | 依赖 | 镜像 | 主要操作 |
|------|-----|------|------|---------|
| `install` | `frontend-install` | 无 | `node:lts` | `pnpm ci` 安装依赖 |
| `lint` | `frontend-lint` | install | `node:lts` | `pnpm lint && pnpm check` |
| `build` | `frontend-build` | install | `node:lts` | `pnpm build`（Vite 构建） |
| `test` | `frontend-test` | install | `node:lts` | `pnpm test`（Vitest） |

前端使用 `pnpm` 而非 `npm`，各 job 的 `before_script` 中安装 pnpm。

```yaml
frontend-lint:
  before_script:
    - npm install -g pnpm
  script:
    - cd frontend && pnpm lint && pnpm check
```

---

## 四、本地运行验证

### 4.1 运行命令

```bash
cd backend

# 安装依赖
npm ci

# 类型检查（等价于 CI lint）
npm run lint

# 编译（等价于 CI build）
npm run build

# 运行测试（等价于 CI test）
npm test

# 带覆盖率
npm run test:coverage
```

### 4.2 前置条件

- Node.js >= 18（推荐 LTS）
- 本地运行测试不需要 MySQL（service/repository 均被 mock）
- 集成测试也使用 mock，不依赖真实数据库

---

## 五、流水线运行结果

### 5.1 最新测试结果（2026-06-04）

| 指标 | 数值 |
|------|------|
| 测试文件数 | 31 passed |
| 测试用例数 | 462 passed |
| 运行时间 | ~4.2s |
| 覆盖率 — Statements | 75.24% |
| 覆盖率 — Branches | 72.62% |
| 覆盖率 — Functions | 63.93% |
| 覆盖率 — Lines | 73.72% |

### 5.2 按包覆盖率明细

| 包 | 目录 | Statements | Branches | Functions | Lines |
|---|------|-----------|----------|-----------|-------|
| **Service-A** | `service-a/src/service/` | **99.37%** | **95.56%** | **100%** | **100%** |
| Service-B | `service-b/src/service/` | 79.34% | 67.18% | 78.26% | 80.98% |
| Shared | `shared/src/utils/` | 79.38% | 71.42% | 84.61% | 75.34% |
| Middleware | `shared/src/middleware/` | 84.21% | 80.64% | 80% | 83.01% |
| Controller | controller 层（所有） | ~47% | ~13% | ~45% | ~47% |

### 5.3 关键模块覆盖

| 模块 | 覆盖率 | 说明 |
|------|--------|------|
| 订单状态机（order-service） | **~100%** | 6 方法、所有状态转换、乐观锁、爽约限制 |
| 需求 CRUD（demand-service） | **~100%** | 创建/更新/删除、权限、匿名处理 |
| 认证（auth-service） | **~100%** | 注册/登录/refresh/logout、禁用检查 |
| 消息（message-service） | **~100%** | 发送/查询、权限、通知触发 |
| 评价+信用分（review-service） | **95%** | 5 档 delta、clamp [0, 100] |
| 密码工具 | 18 tests | hash/compare/validate |
| JWT 工具 | 15 tests | 签发/验证/过期/refresh token |
| 错误类 | 12 tests | 7 种 AppError 子类 |
| API 响应 | 10 tests | success/paginated/error 格式 |
| 手机号加解密 | 8 tests | AES-GCM 往返、mask |

### 5.4 历史提交记录

| 提交 | 说明 |
|------|------|
| `05d6235` | ci: 更新后端 CI 流水线 — 填充真实命令，添加 MySQL service |
| `f992757` | ci: 前端改用 pnpm+check，后端改用 node+echo 占位 |
| `d6af78a` | fix: CI 流水线各 job 安装 pnpm 环境 |
| `64364a2` | test: AuthProvider + DemandDetailPage 单元测试 + CI 流水线优化 |

### 5.5 覆盖率目标达成

| 指标 | 目标 | 当前 | 状态 |
|------|------|------|------|
| Lines >= 60% | 60% | **73.72%** | ✅ 达成 |
| Functions >= 60% | 60% | **63.93%** | ✅ 达成 |
| Statements >= 60% | 60% | **75.24%** | ✅ 达成 |
| 核心 Service 覆盖 | 90%+ | **95-100%** | ✅ 达成 |

---

## 六、故障排查

### 6.1 常见 CI 失败原因

| 症状 | 可能原因 | 解决 |
|------|---------|------|
| `npm ci` 失败 | `package-lock.json` 与 `package.json` 不一致 | 本地 `npm install` 后提交 lockfile |
| `tsc --noEmit` 报错 | TypeScript 类型不匹配 | 检查 import 路径和类型定义 |
| Vitest 找不到模块 | shared 包未编译 | `cd backend/shared && npx tsc` |
| MySQL 连接失败 | CI 中 service 名称或密码不匹配 | 检查 `DATABASE_URL` 中的 host/service 名 |
| JUnit 报告未生成 | 测试输出路径不匹配 | 确认 `--reporter=junit` 输出到 `test-results/` |

### 6.2 本地复现 CI 错误

```bash
# 模拟 CI install 阶段
cd backend && rm -rf node_modules && npm ci

# 模拟 CI lint 阶段
cd backend && npm run lint

# 模拟 CI build 阶段
cd backend && npm run build

# 模拟 CI test 阶段（含 JUnit 报告）
cd backend && mkdir -p test-results && npx vitest run --reporter=junit --reporter=verbose
```
