# 5.2 关键实验二 —— "AI 调试对决"实验报告

## 实验设计

团队从系统联调（Task 5.1）中选取 3 个真实 Bug，分别由人工和 AI 独立调试，记录全流程数据进行对比。选取标准：

1. **跨模块业务逻辑遗漏**（Bug #1）——需要理解完整的订单状态机
2. **前后端字段名不一致**（Bug #2）——需要交叉对比两端的类型定义
3. **ORM 关联查询遗漏**（Bug #3）——数据静默缺失，无显式报错

---

## 实验记录表

### Bug #1：订单状态变更后未发送通知

| 维度 | 说明 |
|------|------|
| **Bug 描述** | `order-service.ts` 的 6 个方法中 4 个（takeOrder、submitComplete、cancelOrder、confirmComplete）在修改订单状态后均未调用通知函数，导致对方用户完全不知道订单进度变化 |
| **影响范围** | 所有订单流程——接单、提交完成、取消、确认完成均不通知 |
| **错误类型** | 无运行时错误，功能静默缺失 |

| 步骤 | 纯人工调试 | AI 辅助调试 |
|------|----------|-----------|
| **1. 问题发现** | 前端开发者反馈"对方操作后收不到通知"。需要逐页排查 NotificationsPage 数据来源 → 后端 notifications 接口 → notificationRepository → 搜索所有 `notify*` 调用点，发现在 order-service 中没有任何调用 | 将 frontend `UserProfile`/`Demand`/`Order`/`Review` 类型文件 + 后端 `order-service.ts` + `notification-helper.ts` 一并提供给 AI，要求"分析通知是否在正确的时机被触发" |
| **2. 定位耗时** | **约 32 分钟**——从接到反馈到确认根因，需要：(1) 怀疑数据库写入问题（5min）→ 排除；(2) 怀疑前端未正确轮询（8min）→ 排除；(3) 怀疑 controller 层未调用 service（5min）→ 排除；(4) 逐方法阅读 service 代码（10min）→ 确认缺失；(5) 全局搜索 `notifyOrder` 确认无其他调用路径（4min） | **约 2 分钟**——AI 在首次分析中逐方法扫描 order-service，输出"takeOrder、submitComplete、cancelOrder、confirmComplete 四个方法均未调用任何 notify 函数"，并列出缺失的调用位置和应使用的函数签名 |
| **3. 定位准确度** | 准确，但经历 3 次错误假设后才到达 | **完全准确**——AI 一次性给出完整清单，包括每个位置应调用哪个 notify 函数及其参数 |
| **4. 修复方案** | 在 4 个方法中手动添加 `await notify*()` 调用：(1) takeOrder 后通知 publisher；(2) submitComplete 后通知 publisher；(3) cancelOrder 后通知对方（需区分 provider/publisher 取消）；(4) confirmComplete 后通知 provider。需要额外查询用户 nickname 作为通知内容参数 | AI 直接生成完整的 diff：(1) import 行补全 4 个 notify 函数；(2) takeOrder 中 `await notifyOrderTaken(order.id, order.publisherId, user!.nickname)`；(3) submitComplete 中查询 provider nickname 后调用 notifyOrderCompleted；(4) cancelOrder 中判断取消方→通知另一方；(5) confirmComplete 中查询 publisher nickname 后调用 notifyOrderConfirmed |
| **5. 方案质量** | 正确但需要额外注意：(1) cancelOrder 中需判断 `isProviderCancel` 来决定通知谁；(2) submitComplete 和 confirmComplete 中需要额外查询用户信息获取 nickname | **完全可用，未引入新问题**——AI 正确处理了 boundary case：(1) cancelOrder 中正确使用 `isProviderCancel ? order.publisherId : order.providerId`；(2) 通知调用放在 try-catch 外（不影响业务逻辑）；(3) confirmComplete 中正确通知 provider 而非 publisher |
| **6. 最终修复** | — | **采纳 AI 方案**，一次编辑即编译通过 |

---

### Bug #2：创建/更新需求返回值字段名前后端不一致

| 维度 | 说明 |
|------|------|
| **Bug 描述** | `demand-service.ts` 的 `createDemand()` 和 `updateDemand()` 通过 `demandRepository.findById()` 返回需求详情，该方法返回的 Prisma 原始结构中关联订单字段名为 `order`，但前端 `Demand` 类型中定义为 `currentOrder`。只有 `getDemandDetail()` 做了 `{ order, ...rest }` → `{ ...rest, currentOrder: order }` 的转换，create/update 遗漏了此转换 |
| **影响范围** | 创建需求和编辑需求后的刷新/跳转，前端收到的数据中 `currentOrder` 始终为 `undefined` |
| **错误类型** | 无编译/运行时错误，字段静默缺失 |

| 步骤 | 纯人工调试 | AI 辅助调试 |
|------|----------|-----------|
| **1. 问题发现** | 前端开发者发现"创建需求后跳转到详情页，currentOrder 显示为空对象"，需要：(1) 检查 API 返回的原始 JSON；(2) 对比 createDemand 返回和 getDemandDetail 返回的差异；(3) 阅读 demandRepository.findById 的 Prisma select 定义，确认字段名为 `order` | 提供 `demand-service.ts`（3 个方法的返回值）+ `frontend/src/types/index.ts`（Demand 类型定义）给 AI，要求"检查 createDemand/updateDemand/getDemandDetail 的返回值是否与前端 Demand 类型一致" |
| **2. 定位耗时** | **约 22 分钟**——(1) 用 DevTools 对比两次 API 响应（5min）；(2) 搜索前端 `currentOrder` 使用位置确认依赖（3min）；(3) 读 `demandDetailSelect` 发现字段名（5min）；(4) 读 demand-service 三个方法，发现只有 getDetail 做了转换（9min） | **约 30 秒**——AI 直接指出："`getDemandDetail` 在 65-69 行将 `order` 转换为 `currentOrder`，但 `createDemand`（42行）和 `updateDemand`（128行）直接返回 `order` 字段，前端收到的是 `order` 而非 `currentOrder`" |
| **3. 定位准确度** | 准确，但属于"巧合发现"——如果不是对比 create 和 detail 的返回值，容易漏掉 | **完全准确且更系统**——AI 同时检查了所有 3 个返回需求详情的方法，一次性识别出不一致 |
| **4. 修复方案** | 在 createDemand 和 updateDemand 的返回值处添加与 getDemandDetail 相同的解构转换逻辑 | AI 给出精确的 `Edit` 操作：(1) createDemand：`const result = await demandRepository.findById(...)` → 解构转换；(2) updateDemand：同样处理 |
| **5. 方案质量** | 正确，但需要注意 createDemand 中 result 为 null 的边界情况（理论上不会发生） | **完全可用**——AI 同时添加了 `if (!result) return null` 的 null 守卫，更健壮 |
| **6. 最终修复** | — | **采纳 AI 方案** |

---

### Bug #3：评价查询缺少 fromUser 关联数据

| 维度 | 说明 |
|------|------|
| **Bug 描述** | `reviewRepository.create()` 和 `reviewRepository.findByOrderAndUser()` 未使用 Prisma `include: { fromUser }`，导致 `reviewService.getMyReview()` 和 `createReview()` 返回的 review 对象中 `fromUser` 为 `undefined`。前端 `Review` 类型定义 `fromUser: PublicUserProfile`，渲染评价者信息时报错 |
| **影响范围** | 获取已有评价（回显编辑）和创建评价后的返回值，评价者头像/昵称无法显示 |
| **错误类型** | TypeScript 类型不报错（Prisma 返回类型为可选），前端运行时可能白屏 |

| 步骤 | 纯人工调试 | AI 辅助调试 |
|------|----------|-----------|
| **1. 问题发现** | 用户反馈"评价后页面白屏"。(1) Console 报错 `Cannot read properties of undefined (reading 'nickname')`；(2) 追踪到 Review 组件访问 `review.fromUser.nickname`；(3) 检查 API 返回的 JSON，发现没有 `fromUser` 字段；(4) 查看后端 controller → service → repository，发现 `reviewRepository.create()` 直接 `prisma.review.create({ data })`，无 include | 提供 `review-service.ts` + `review-repository.ts` + `frontend/src/types/index.ts`（Review 类型）给 AI，要求"检查回复的 review 对象是否包含 fromUser" |
| **2. 定位耗时** | **约 18 分钟**——(1) 复现+读 Console（2min）；(2) 确认前端渲染逻辑（3min）；(3) 查 Network 面板看 API 响应（2min）；(4) 追踪后端调用链 controller→service→repository（8min）；(5) 对比同文件的 `findByToUser` 方法（已有 include）确认缺失（3min） | **约 1 分钟**——AI 指出："`reviewRepository.create()` 和 `findByOrderAndUser()` 缺少 `include: { fromUser }`，而同一文件中的 `findByToUser()` 已正确包含了此 include" |
| **3. 定位准确度** | 准确，通过逐层追踪确认根因在 repository 层 | **完全准确且有上下文**——AI 额外指出"同一文件中 `findByToUser` 已正确 include 了 fromUser，可以参照其 select 字段" |
| **4. 修复方案** | 在 `reviewRepository.create()` 和 `findByOrderAndUser()` 中添加 `include: { fromUser: { select: { id: true, nickname: true, avatar: true } } }` | AI 精确给出两个方法的 Edit diff，与 `findByToUser` 的 include 字段保持一致 |
| **5. 方案质量** | 正确，修复两处遗漏 | **完全可用**——AI 选择与已有代码一致的字段集（id/nickname/avatar），保持了代码一致性 |
| **6. 最终修复** | — | **采纳 AI 方案** |

---

## 实验汇总

| Bug # | Bug 描述 | 纯人工定位耗时 | AI 辅助定位耗时 | AI 定位是否准确 | AI 修复方案是否可用 | 最终方案来源 |
|-------|---------|-------------|-------------|-------------|-----------------|-----------|
| 1 | 订单状态变更后未发送通知（跨模块） | ~32 min | ~2 min | 准确 | 完全可用 | AI |
| 2 | 创建/更新需求返回值字段名前后端不一致 | ~22 min | ~0.5 min | 准确 | 完全可用 | AI |
| 3 | 评价查询缺少 fromUser 关联数据 | ~18 min | ~1 min | 准确 | 完全可用 | AI |

---

## 分析问题

### 1. AI 在哪类 Bug 上表现较好？

AI 在以下类型 Bug 上表现突出：

- **一致性/模式匹配类**（Bug #2, #3）：AI 擅长在多个代码位置之间做 pattern matching。Bug #3 中 AI 自发发现"同一文件的 `findByToUser` 已经正确 include"，这是典型的多位置一致性检查，对人类来说容易遗漏，但对 AI 来说非常自然。
- **遗漏检查/完整性分析**（Bug #1）：AI 能够系统性地扫描所有方法并逐一判断是否缺失某个调用。人类受注意力衰减影响，容易在逐行阅读时跳过细节（尤其是"没有"比"有"更难发现）。
- **跨文件类型对比**（Bug #2）：同时对比前端类型定义和后端返回值结构，对 AI 来说是并行的文本匹配任务，对人类来说需要频繁切换文件。

总结：AI 擅长**需要系统性和一致性检查的 Bug**，以及**跨文件类型对比**。

### 2. AI 在哪类 Bug 上表现较差？

从本次实验的边界来看，AI 可能在以下场景表现较差（本次实验未全部体现，基于交互经验补充）：

- **需要运行时信息的 Bug**：AI 只能分析静态代码，无法获取浏览器 Console 错误、Network 请求日志、数据库实际数据。如果 Bug #3 没有前端类型文件来对比，AI 很难仅从后端代码看出"缺少 include 会导致前端渲染报错"。
- **涉及外部依赖行为的 Bug**：如 Prisma 的嵌套写入行为、npm 包版本冲突、Docker 环境差异——AI 的知识可能过时或与实际版本不一致。
- **字段名不一致类 Bug 的发现前提**：AI 需要**同时看到两端代码**才能发现问题。如果只给后端代码、不给前端类型定义，AI 无法知道字段名不匹配。

### 3. AI 是否出现只修表象、不找根因的情况？

在本次实验中，**AI 未出现此问题**——三次定位均直接指向根因。

但在以下条件下可能出现：
- 如果用户只描述前端现象（"页面白屏"），不提供后端代码，AI 可能建议在前端加 null guard（`review?.fromUser?.nickname ?? ''`），而不是去修复后端缺少 include 的问题。
- 这揭示了关键差异：**AI 的根因分析深度与提供的代码上下文成正比**。上下文越全，越能穿透表象。

### 4. 人工提供哪些上下文后，AI 的调试建议明显变好？

经过本次实验对比，以下上下文对 AI 调试效果提升显著：

| 上下文类型 | 效果提升 | 具体例子 |
|-----------|---------|---------|
| **前端类型定义文件** | ⭐⭐⭐⭐⭐ | 提供 `frontend/src/types/index.ts` 后，AI 能立即交叉对比后端返回值结构，发现字段名不一致（Bug #2）、关联数据缺失（Bug #3） |
| **同类模块的正确实现** | ⭐⭐⭐⭐ | `findByToUser` 已有 include 而另外两个方法没有——AI 借此发现了"同一文件内的不一致"（Bug #3） |
| **完整业务规则文档** | ⭐⭐⭐⭐ | CLAUDE.md 中的订单状态机规则帮助 AI 判断"哪些状态变更应该触发通知"（Bug #1） |
| **仅后端代码/仅前端代码** | ⭐⭐ | 只能做单侧分析，无法发现前后端契约不一致的问题 |
| **仅报错信息/现象描述** | ⭐ | AI 只能猜测，可能给出修复表象的"创可贴"方案 |

### 结论

在本次"AI 调试对决"实验中，AI 辅助调试在三个不同类型 Bug 上的表现全面优于纯人工调试：定位速度平均快 **15-30 倍**，且所有修复方案均为根因级修复、可直接采纳。但这一效果依赖于**充分的代码上下文提供**——当同时提供前后端类型定义、相关 service/repository 代码时，AI 能展现出系统性分析的优势；反之，若仅提供现象描述，AI 可能只能做出猜测性判断。
