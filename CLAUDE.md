# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampusHub (校园互助服务平台) — A campus mutual-help service platform where students can post help requests, accept tasks, complete orders, and build reputation through a credit system. Course project for Software Engineering and Computing II (SEC-II), Nanjing University, 2026.

## Tech Stack

- **Frontend**: React 18 + TypeScript (Vite)
- **Backend**: Express 5 + TypeScript (three-layer architecture)
- **Database**: MySQL 8.0+ with Prisma ORM
- **Auth**: JWT (Access Token 3600s + Refresh Token 7d rotation), bcrypt
- **Validation**: Zod | **Logging**: Winston + Morgan | **Scheduling**: node-schedule
- **Infrastructure**: Docker Compose, GitLab CI

## Project Structure

```
/
├── backend/              # npm workspaces monorepo
│   ├── package.json      # Root: workspaces config + dev scripts
│   ├── .env              # Shared env vars (DATABASE_URL, JWT_SECRET, etc.)
│   ├── shared/           # @campushub/shared — infrastructure package
│   │   ├── prisma/       # schema.prisma + migrations + seed
│   │   └── src/
│   │       ├── utils/    # jwt, bcrypt, errors, api-response, logger, prisma
│   │       ├── middleware/# auth, error-handler, rate-limiter, validate
│   │       ├── repository/# user, demand, order, refresh-token, demand-image
│   │       ├── types/    # express.d.ts (Request.user extension)
│   │       └── index.ts  # Barrel export
│   ├── service-a/        # @campushub/service-a (port 3001)
│   │   └── src/
│   │       ├── controller/  # demand, order
│   │       ├── service/     # demand, order
│   │       ├── routes/      # demand, order
│   │       └── app.ts       # Express 5 entry
│   └── service-b/        # @campushub/service-b (port 3002)
│       └── src/
│           ├── controller/  # auth, user, upload
│           ├── service/     # auth, user, upload
│           ├── routes/      # auth, user, upload
│           ├── middleware/   # upload
│           ├── validators/   # zod schemas
│           └── app.ts       # Express 5 entry
├── frontend/             # React 18 + TypeScript (Vite)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route-level page components
│       ├── api/           # API client & request helpers
│       ├── hooks/         # Custom React hooks
│       ├── store/         # Auth/user global state
│       └── utils/         # Helpers, constants, types
├── docs/                 # Design documents (P2/P3)
│   ├── P2/架构设计文档.md
│   └── P3/详细设计文档.md, API设计文档.md, api-spec.yaml
└── .gitlab/              # CI pipeline configs
```

### Backend Workspace Packages

| Package | Name | Purpose |
|---------|------|---------|
| `shared/` | `@campushub/shared` | Utilities, middleware, repositories, Prisma client |
| `service-a/` | `@campushub/service-a` | Demand CRUD + Order flow (developer: 陈奕澎) |
| `service-b/` | `@campushub/service-b` | Auth + User + Upload (developer: 张少逸) |

Services import shared code via `@campushub/shared` (barrel export from `shared/src/index.ts`).

## Architecture (Three-Layer Backend)

- **Controller** — Route handlers, request validation (Zod), response formatting
- **Service** — Business logic, order state machine, credit score calculation
- **Repository** — Prisma ORM, database queries, transaction management

## Design Docs (read these first!)

- `docs/P2/架构设计文档.md` — Architecture decisions, module breakdown, tech justification
- `docs/P3/详细设计文档.md` — Class/entity design, DB schema, state machines, credit rules
- `docs/P3/api-spec.yaml` — Complete OpenAPI 3.0 spec (~2790 lines, all endpoints/schemas)

## Key Business Rules

- **Order states**: 接单 → 进行中 → 待确认 → 已完成 (with auto-confirm after 48h)
- **Credit score**: 0-100 range, initial 70, modified by reviews/cancellations, min 40 to publish
- **Auth**: Refresh token rotation with 7-day expiry, access token 3600s
- **10 DB tables**: User, Demand, DemandImage, Order, Review, Notification, Message, Dispute, AdminApplication, RefreshToken

## Available Branches

- `main` — base branch (documentation only)
- `P0`, `P1`, `P2`, `P3`, `P4` — parallel phase branches (P4 is active with complete backend and frontend)

## Frontend Status (P4)

All frontend tasks (A + B) are implemented and committed (11 pages, full order/review/notification flow). See `frontend/CLAUDE.md` and `frontend/DEVLOG.md` for details.

## Troubleshooting

### Windows bash curl 中文 JSON 乱码

Windows Git Bash / MSYS2 的 locale 不是 UTF-8，curl 直接传中文参数会导致编码错误，Zod 校验返回 400。

**解决方案**：用 Node.js 写入临时 JSON 文件，curl 用 `-d @文件路径` 读取：

```bash
node -e "process.stdout.write(JSON.stringify({reason:'申诉原因'}))" > /tmp/body.json
curl -X POST http://localhost:3001/api/orders/1/dispute \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d @/tmp/body.json
```

也可以先用纯英文做快速验证，再换 GUI 工具（Postman/Hoppscotch）测中文场景。
