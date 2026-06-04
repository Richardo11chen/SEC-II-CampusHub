# P4 阶段 Bug 修复日志

## 概述

本日志记录了 P4 阶段（系统联调 + 功能完善）中发现并修复的 12 个 Bug，按类型分为四类：**接口契约不一致**、**功能静默缺失**、**前端渲染异常**、**业务逻辑遗漏**。其中 8 个已在 Git 历史中提交，4 个为系统联调（Task 5.1）期间修复。

---

## 一、接口契约不一致

### Bug #1：创建/更新需求返回值字段名前后端不一致

| 属性 | 值 |
|------|-----|
| **引入阶段** | 后端 A Phase 3 初始实现 |
| **发现方式** | 系统联调 — 前端发现创建需求后跳转到详情页 `currentOrder` 为空 |
| **根因** | `demand-service.ts` 的 `createDemand()` 和 `updateDemand()` 直接返回 `demandRepository.findById()` 的结果，该方法的 Prisma select 中关联订单字段名为 `order`，但前端 `Demand` 类型中定义为 `currentOrder`。只有 `getDemandDetail()` 做了 `{ order, ...rest } → { ...rest, currentOrder: order }` 的转换 |
| **影响** | 创建需求和编辑需求后的页面跳转/刷新，`currentOrder` 始终为 `undefined` |
| **修复** | `demand-service.ts:42-45` — createDemand 返回前解构转换；`:128-134` — updateDemand 同样处理 |
| **文件** | `backend/service-a/src/service/demand-service.ts` |

---

### Bug #2：登录接口返回字段不完整

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 B Auth 模块 |
| **发现方式** | 系统联调 — 前端 ProfilePage 读取 `user.phone`、`user.name`、`user.college`、`user.email`、`user.status`、`user.showRealName` 均为 `undefined` |
| **根因** | `auth-service.ts` 的 `login()` 方法中 `userRepository.findByStudentIdWithPassword()` 的 Prisma select 只选了 8 个字段，缺少 `name`、`college`、`phoneEncrypted`、`email`、`showRealName`、`status`。同时 login 返回值构造也跳过了这些字段 |
| **影响** | 登录后用户信息残缺，个人信息页部分字段空白 |
| **修复** | (1) `user-repository.ts` — findByStudentIdWithPassword select 扩展 6 个字段；(2) `auth-service.ts` — login 返回对象补全 6 个字段，含手机号解密 |
| **文件** | `backend/shared/src/repository/user-repository.ts`、`backend/service-b/src/service/auth-service.ts` |

---

### Bug #3：getProfile 缺少 status 字段

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 B User 模块 |
| **发现方式** | 系统联调 — 前端 UserProfile 类型要求 `status` 字段，后端返回缺失 |
| **根因** | `user-service.ts` 的 `getProfile()` 中 Prisma select 未包含 `status` |
| **影响** | 前端无法获取用户状态（正常/已禁用） |
| **修复** | `user-service.ts:29` 添加 `status: true` |
| **文件** | `backend/service-b/src/service/user-service.ts` |

---

### Bug #4：头像上传 Zod 校验拒绝相对路径

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 B Upload/User 模块 |
| **发现方式** | 用户上传头像后保存失败 |
| **根因** | `user-validators.ts` 中 `avatar` 字段使用 `z.string().url()` 校验，要求完整 URL。但上传接口返回的是相对路径（如 `/uploads/avatar.png`），导致校验拒绝 |
| **影响** | 上传头像后无法保存用户信息 |
| **修复** | `user-validators.ts:4` — 移除 `.url()` 校验，改为 `z.string().max(500).optional()` |
| **提交** | `191dcfe` |
| **文件** | `backend/service-b/src/validators/user-validators.ts` |

---

## 二、功能静默缺失

### Bug #5：订单状态变更后未发送通知

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 A Order 模块初始实现 |
| **发现方式** | 前端反馈"对方操作后收不到通知" |
| **根因** | `order-service.ts` 的 6 个状态变更方法中，4 个（takeOrder、submitComplete、cancelOrder、confirmComplete）在修改订单状态后均未调用通知函数 `notifyOrder*()`，导致对方用户完全不知道订单进度变化 |
| **影响** | 接单、提交完成、取消、确认完成均不通知对方 |
| **修复** | (1) import 补全 4 个 notify 函数；(2) takeOrder 后通知 publisher；(3) submitComplete 后通知 publisher；(4) cancelOrder 中判断取消方→通知另一方；(5) confirmComplete 后通知 provider |
| **文件** | `backend/service-a/src/service/order-service.ts` |

---

### Bug #6：评价查询缺少 fromUser 关联数据

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 B Review 模块 |
| **发现方式** | 用户反馈"评价后页面白屏" — Console 报错 `Cannot read properties of undefined (reading 'nickname')` |
| **根因** | `reviewRepository.create()` 和 `reviewRepository.findByOrderAndUser()` 未使用 Prisma `include: { fromUser }`，导致返回的 review 对象中 `fromUser` 为 `undefined`。同一文件中 `findByToUser()` 已正确 include |
| **影响** | 评价后页面白屏，评价者头像/昵称无法显示 |
| **修复** | 在两个方法中添加 `include: { fromUser: { select: { id: true, nickname: true, avatar: true } } }`，与 `findByToUser` 保持一致 |
| **文件** | `backend/shared/src/repository/review-repository.ts` |

---

## 三、前端渲染异常

### Bug #7：订单详情页白屏（数据结构不一致）

| 属性 | 值 |
|------|-----|
| **引入阶段** | P4 前端订单功能开发 |
| **发现方式** | 用户点击订单进入详情页，页面白屏 |
| **根因** | `api/orders.ts` 的 `getOrder()` 中调用 `mapDemandToFlat()` 将嵌套的 `demand` 对象展开为扁平字段。但后端返回的 OrderDetail 结构与扁平化后的结构不兼容，导致后续字段访问报错 |
| **影响** | 所有订单详情页无法正常渲染 |
| **修复** | 移除 `mapDemandToFlat()` 调用，直接返回嵌套结构，仅转换 `reward` 字段类型 |
| **提交** | `7362d8e` |
| **文件** | `frontend/src/api/orders.ts` |

---

### Bug #8：前端静默吞错

| 属性 | 值 |
|------|-----|
| **引入阶段** | P4 前端 ProfilePage 开发 |
| **发现方式** | 头像上传失败时页面无任何反馈 |
| **根因** | `ProfilePage.tsx` 的 `handleAvatarChange` 在处理 `updateMe` 接口返回时，只处理了成功分支（`if (updateRes.data)`），缺少 `else` 分支，导致失败时既不显示错误消息也不恢复 UI 状态 |
| **影响** | 用户上传头像失败时无反馈，上传按钮持续 loading |
| **修复** | 添加 `else` 分支，调用 `setSnackbar({ open: true, message: updateRes.error || '更新头像失败', severity: 'error' })` |
| **提交** | `191dcfe` |
| **文件** | `frontend/src/pages/ProfilePage.tsx` |

---

### Bug #9：底部导航高亮始终指向首页

| 属性 | 值 |
|------|-----|
| **引入阶段** | P4 前端 Layout 初始实现 |
| **发现方式** | 用户发现无论在任何页面，底部导航的"首页"始终高亮 |
| **根因** | `Layout.tsx` 中 `NAV_ITEMS.findIndex(item => location.pathname.startsWith(item.path))`，首页路径为 `'/'`，对所有路径 `startsWith('/')` 均为 `true` |
| **影响** | 所有页面底部导航高亮始终指向首页 |
| **修复** | `Layout.tsx:34-36` — 首页特殊处理：`if (item.path === '/') return location.pathname === '/'` |
| **提交** | `e9a8f47` |
| **文件** | `frontend/src/components/Layout.tsx` |

---

### Bug #10：首页搜索加载卡顿

| 属性 | 值 |
|------|-----|
| **引入阶段** | P4 前端 HomePage 开发 |
| **发现方式** | 用户反馈首页搜索时页面频繁 loading 闪烁 |
| **根因** | 搜索防抖 `useEffect` 每次输入都设置 `setLoading(true)`，即使两次输入后最终的搜索关键词没有变化（如用户输入后又删回原词）；分类切换同样无条件触发 loading |
| **影响** | 搜索体验差，页面频繁闪烁 |
| **修复** | (1) 防抖回调中先比较 `searchInput !== keyword` 再触发 loading；(2) `handleCategoryChange` 先比较 `cat === category` 再触发 loading |
| **提交** | `7362d8e` |
| **文件** | `frontend/src/pages/HomePage.tsx` |

---

## 四、业务逻辑遗漏

### Bug #11：订单取消后需求无法被重新接单

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 A Order 模块 |
| **发现方式** | 发布者取消订单后，需求变成"无法被任何人接单" |
| **根因** | `order-service.ts` 的 `takeOrder()` 先查询 `findByDemandId`（检查是否有已存在订单），如果有任何订单则直接抛出 `ConflictError('该需求已被接单')`。订单被取消后，数据库仍保留该订单记录（软删除），导致相同 `demandId` 关联的已取消订单也被视为"已被接单"。同时代码未实现"重新激活已取消订单"的逻辑 |
| **影响** | 发布者取消订单后需求作废，只能重新发布 |
| **修复** | `order-service.ts` — (1) 检查已取消订单：如果 `existingOrder.status === '已取消'`，允许重新接单；(2) 爽约者本人不得再接单；(3) 事务中增加 `updateMany` 重新激活逻辑（恢复状态、清除取消字段、乐观锁版本号递增） |
| **边界条件** | (1) 爽约者本人不能重新接同一单；(2) 多人同时尝试重新接单时乐观锁防竞态 |
| **提交** | `cd3e6dc` |
| **文件** | `backend/service-a/src/service/order-service.ts` |

---

### Bug #12：发布者无法管理自己未接单的需求

| 属性 | 值 |
|------|-----|
| **引入阶段** | Phase 3 后端 A Demand 模块 |
| **发现方式** | 用户反馈在"我的订单"页面看不到自己发布的、还没人接单的需求 |
| **根因** | (1) 后端 demand 列表接口不支持 `publisherId` 筛选参数，前端无法只查询自己的需求；(2) 前端订单列表页"我发布的"Tab 只查询 order 表，而未被接单的需求不在 order 表中；(3) 发布者无法在详情页删除自己的开放需求 |
| **影响** | 发布者无法追踪未被接单的需求 |
| **修复** | (1) `demand-repository.ts` — findMany 增加 `publisherId` 筛选；(2) `demand-controller.ts` — 透传 `publisherId` 参数；(3) `OrderListPage.tsx` — "我发布的"Tab 合并拉取 `status=开放` 的需求，用黄色"开放中"标记区分；(4) `DemandDetailPage.tsx` — 发布者可见"删除需求"按钮 |
| **提交** | `1db41ae` |
| **文件** | `backend/shared/src/repository/demand-repository.ts`、`backend/service-a/src/controller/demand-controller.ts`、`frontend/src/pages/OrderListPage.tsx`、`frontend/src/pages/DemandDetailPage.tsx`、`frontend/src/api/demands.ts` |

---

## 汇总

| # | 类型 | Bug | 根因层 | 发现方式 | 修复行数 | 提交 |
|---|------|-----|--------|---------|---------|------|
| 1 | 接口契约 | 创建/更新需求字段名 `order` vs `currentOrder` | Service | 联调 | +6 | `ff8f7cb` |
| 2 | 接口契约 | 登录返回字段不完整 | Repository/Service | 联调 | +14 | `ff8f7cb` |
| 3 | 接口契约 | getProfile 缺少 status | Service | 联调 | +1 | `ff8f7cb` |
| 4 | 接口契约 | 头像上传 Zod 校验拒绝相对路径 | Validator | 功能测试 | -1 | `191dcfe` |
| 5 | 功能缺失 | 订单状态变更未发通知 | Service | 反馈 | +12 | `ff8f7cb` |
| 6 | 功能缺失 | 评价缺少 fromUser 关联 | Repository | 白屏报错 | +4 | `ff8f7cb` |
| 7 | 前端渲染 | 订单详情白屏（数据结构不一致） | API 层 | 用户反馈 | -1 | `7362d8e` |
| 8 | 前端渲染 | 头像上传静默吞错 | 前端 UI | 功能测试 | +2 | `191dcfe` |
| 9 | 前端渲染 | 导航高亮始终指向首页 | 前端 UI | 用户反馈 | +3 | `e9a8f47` |
| 10 | 前端渲染 | 首页搜索加载卡顿 | 前端 UI | 用户反馈 | +4 | `7362d8e` |
| 11 | 业务逻辑 | 订单取消后无法重新接单 | Service | 用户反馈 | +50 | `cd3e6dc` |
| 12 | 业务逻辑 | 发布者无法管理未接单需求 | Service/前端 | 用户反馈 | +139 | `1db41ae` |

### 按根因层分布

| 层级 | Bug 数 | 占比 |
|------|--------|------|
| Service（业务逻辑层） | 5 | 42% |
| 前端 UI | 3 | 25% |
| Repository（数据访问层） | 2 | 17% |
| API 层 | 1 | 8% |
| Validator（校验层） | 1 | 8% |

**结论**：超过 40% 的 Bug 集中在 Service 层（业务逻辑遗漏 / 跨模块协作未覆盖），其次为前端 UI（状态处理不完善）。Repository 层的 Bug 均为 Prisma 查询配置遗漏（select/include 不完整）。

### 按发现方式分布

| 发现方式 | Bug 数 | 占比 |
|---------|--------|------|
| 系统联调（前端→后端） | 4 | 33% |
| 用户反馈/使用中暴露 | 5 | 42% |
| 功能测试/审查中发现 | 3 | 25% |

**结论**：半数以上 Bug 在生产使用中暴露，提示需要更完善的自动化测试覆盖边界场景。
