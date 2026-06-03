# CampusHub 前端

校园互助服务平台的前端应用，基于 React 18 + TypeScript + Vite + MUI v9。

## 快速开始

```bash
pnpm dev        # 开发服务器（默认 5173）
pnpm lint       # ESLint
pnpm check      # tsc -b --noEmit
pnpm test       # Vitest
pnpm build      # tsc -b && vite build
```

## 技术栈

- **框架**: React 18 + TypeScript, Vite 8
- **UI**: MUI v9 (Material Design)，南大紫主题
- **路由**: react-router-dom v7
- **HTTP**: axios（401 自动刷新 + 并发锁）
- **测试**: Vitest + jsdom + @testing-library (200 tests, 覆盖率 v8)

## 项目结构

```
src/
├── api/             # axios 封装 + 按模块拆分（auth/users/demands/orders/...）
├── types/index.ts   # 全部 TS 类型定义
├── store/           # AuthContext（全局认证状态）
├── hooks/useAuth.ts # useAuth hook
├── components/      # 可复用组件（Layout/ProtectedRoute/DemandCard）
├── pages/           # 12 个页面组件（含 ChatPage）
└── utils/format.ts  # 脱敏、日期格式化、状态→颜色映射
```

## 相关文档

- `frontend/CLAUDE.md` — 详细开发指南
- `frontend/DEVLOG.md` — 开发日志
- `docs/P3/api-spec.yaml` — API 规范
