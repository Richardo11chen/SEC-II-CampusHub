# AI 代码信任度实验报告

## 1. 实验设计

### 1.1 实验目标

评估 AI 从自然语言 Prompt 直接生成的后端代码是否可信任——即编译、运行、测试是否通过，以及人工审查能发现什么问题。

### 1.2 选型理由

选择 **消息（Messages / 聊天）功能** 作为实验对象，原因：

- **规模适中**：2 个 API 端点（GET 列表 + POST 发送），涉及 5 层（Repository → Service → Controller → Routes → Validator）
- **数据库模型已存在**：`Message` 表在 Prisma schema 中已定义，AI 不需要设计数据库
- **API 规范已明确**：`docs/P3/api-spec.yaml` 中有完整的请求/响应定义
- **项目内有丰富参考**：已有 review、notification 等同架构模块可参考模式
- **原项目未实现**：确保 AI 是从零生成，而非修改已有代码

### 1.3 实验步骤

1. **AI 直接生成**：编写清晰 Prompt → AI 生成全部代码 → 编译 → 端到端测试（8 个正常场景 + 8 个边界场景）
2. **人工审查与修复**：对照 P3 设计文档逐文件审查 → 记录发现 → 修复 → 重新测试
3. **记录对比结果**：按表格记录 AI 直出 vs 人工审查修复后的各项指标

---

## 2. AI Prompt（输入）

```text
为 CampusHub 项目实现聊天消息功能，要求：

## 数据库
Message 表已存在（Prisma schema）：
- id, orderId, senderId, contentType(text/image), content(max 2000), createdAt
- 关联 Order 和 User
- 索引: idx_order_id, idx_order_created

## API 端点（参考 docs/P3/api-spec.yaml）

### GET /api/messages?orderId=&page=&pageSize=
- 需要认证
- 返回分页聊天记录（按时间升序），包含发送者信息（id, nickname, avatar）
- 仅订单参与方（publisherId 或 providerId）可查看

### POST /api/messages
- 需要认证
- Body: { orderId (必填), content (必填, max 2000), contentType (可选, "text"|"image", 默认 "text") }
- 仅订单参与方可发送
- 返回创建的 Message（含发送者信息）

## 代码规范
- 严格遵循项目三层架构：Controller → Service → Repository
- 使用 @campushub/shared 中的错误类（NotFoundError, ForbiddenError, BadRequestError）
- 使用项目已有的 prisma、authenticate、validate 中间件
- 参考 review-routes.ts、notification-service.ts 等现有代码的模式
- Zod 校验放在 validators/ 目录
- Repository 放在 shared/src/repository/
- 路由挂载到 service-b/src/app.ts
- 在 shared/src/index.ts 中导出新的 repository
```

---

## 3. AI 直出结果

### 3.1 生成的文件清单

| # | 文件 | 行数 | 说明 |
|---|------|------|------|
| 1 | `shared/src/repository/message-repository.ts` | 25 | `findByOrderId`（分页+升序）+ `create`（含 sender include） |
| 2 | `service-b/src/validators/message-validators.ts` | 8 | Zod schema：orderId, contentType enum, content 1-2000 |
| 3 | `service-b/src/service/message-service.ts` | 50 | 订单存在性校验 + 参与者权限校验 + 业务逻辑 |
| 4 | `service-b/src/controller/message-controller.ts` | 26 | list（GET）+ send（POST） |
| 5 | `service-b/src/routes/message-routes.ts` | 10 | GET + POST 路由，挂载 auth 和 validate 中间件 |
| 6 | `shared/src/index.ts`（修改） | +1 | 添加 messageRepository 导出 |
| 7 | `service-b/src/app.ts`（修改） | +2 | 挂载 `/api/messages` 路由 |

### 3.2 编译结果

```
$ cd backend/shared && npx tsc   # 通过，0 错误
$ cd backend/service-b && npx tsc # 通过，0 错误
```

**编译：一次通过，零错误。**

### 3.3 功能测试结果

#### 正常场景（全部通过）

| 场景 | 预期 | 结果 |
|------|------|------|
| 订单参与者（发布者）发送消息 | 201 | ✅ |
| 订单参与者（接单者）发送消息 | 201 | ✅ |
| 获取订单聊天记录（升序） | 200 + 消息列表 | ✅ |
| 双方交替发送多条消息 | 200 + 完整历史 | ✅ |
| 分页查询（page=1, pageSize=1） | 200 + 1条 + total=3 | ✅ |
| contentType 默认值为 "text" | 201 + contentType:"text" | ✅ |

#### 边界场景（全部通过）

| 场景 | 预期 | 结果 |
|------|------|------|
| 非参与者发送消息 | 403 | ✅ |
| 非参与者查看消息 | 403 | ✅ |
| 向不存在的订单发消息 | 404 | ✅ |
| 查看不存在订单的消息 | 404 | ✅ |
| 缺少必填字段 orderId（POST） | 400 | ✅ |
| 消息内容超过 2000 字 | 400 | ✅ |
| 缺少 orderId 参数（GET） | 400（但错误信息泛化） | ⚠️ |
| contentType 传非法值 | 400（Zod 校验） | ✅ |

---

## 4. 人工审查发现的问题

### 问题 #1：GET 响应格式不符合 API 规范（中等）

**位置**：`message-controller.ts:12` + `message-service.ts:24`

**现象**：
```json
// AI 直出的响应格式：
{ "items": [...], "total": 3, "page": 1, "pageSize": 50 }

// API 规范要求的格式（Pagination schema）：
{ "items": [...], "pagination": { "page": 1, "pageSize": 50, "total": 3, "totalPages": 1 } }
```

**根因**：AI 用了 `successResponse(res, result)` 把 service 返回的平面对象直接输出，而不是用项目已有的 `paginatedResponse(res, items, total, page, pageSize)` 辅助函数。

**影响**：前端如果按 API 规范解析 `data.pagination.total` 会拿到 `undefined`，分页功能失效。

**修复**：
1. Controller 改用 `paginatedResponse(res, items, total, page, pageSize)`
2. Service 返回 `{ items, total }`（去掉多余的 page/pageSize）

### 问题 #2：GET 缺少 query 参数校验（中等）

**位置**：`message-controller.ts:8`

**现象**：`Number(req.query.orderId)` 在 orderId 缺失时返回 `NaN`，穿过 service 到达 Prisma，最终被错误处理中间件捕获为泛化的 400 错误，用户无法知道是哪个参数出了问题。

**根因**：POST 端点有 Zod validate 中间件做严格校验，但 GET 端点的 query 参数没有同等校验。

**修复**：在 controller 中添加 `isNaN(orderId)` 检查，抛出明确的 `BadRequestError('orderId 参数缺失或无效')`。

### 审查中确认正确的部分

- **权限校验**：正确实现了"仅订单参与者可访问"（检查 publisherId 和 providerId）
- **消息排序**：使用 `createdAt: 'asc'`（升序），符合聊天场景
- **sender 信息**：正确 include 了 id、nickname、avatar
- **Zod 校验**：contentType 使用 `.default('text')`，枚举校验、长度校验均正确
- **错误类型**：正确使用 NotFoundError、ForbiddenError
- **代码风格**：与项目现有 review/notification 模块完全一致
- **路由中间件**：正确使用 authenticate + validate

---

## 5. 对比总结

| 指标 | AI 直出 | 人工审查修复后 |
|------|---------|----------------|
| **编译是否通过** | ✅ 通过（0 错误） | ✅ 通过（0 错误） |
| **功能是否可运行** | ⚠️ 基本可用 | ✅ 完全可用 |
| **测试是否通过** | ⚠️ 15/16 场景通过 | ✅ 16/16 场景通过 |
| **主要问题** | 1. GET 响应分页格式不符合 API spec（`{total,page,pageSize}` → 应为 `{pagination:{...}}`）2. GET 缺少 query 参数校验（NaN 穿透，错误信息泛化） | 两个问题已修复，响应格式完全符合 Pagination schema，参数校验给出明确错误提示 |
| **修复行数** | — | **7 行**（controller 4行 + service 3行） |

---

## 6. 结论

1. **AI 直出代码的可信度较高**：在拥有明确 API 规范、数据库模型、项目参考代码的前提下，AI 生成的 ~120 行代码中，编译零错误，16 个测试场景通过了 15 个。

2. **但人工审查仍是必要的**：发现的 2 个问题虽然修复量小（仅 7 行），但问题 #1（分页格式错误）会导致前端无法正常渲染分页，属于功能性 bug。这类"看起来能用但细节不对"的问题是 AI 代码的典型风险。

3. **项目现有模式越多，AI 生成质量越高**：AI 很好地复用了 `paginatedResponse`、`authenticate`、`validate`、错误类等项目基础设施，仅在分页响应的使用上有偏差。如果 Prompt 中明确要求"使用 paginatedResponse 辅助函数"，这个问题可能可以避免。

4. **建议**：AI 生成的代码可以直接作为高质量脚手架使用（节省 80%+ 时间），但必须经过以下检查才能合入：
   - 对照 API 规范逐字段验证响应格式
   - 确认错误处理路径的提示信息是否明确
   - 检查是否使用了项目已有的辅助函数而非"重复造轮子"
