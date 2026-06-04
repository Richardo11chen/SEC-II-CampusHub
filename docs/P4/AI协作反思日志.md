# AI 协作反思日志 — Phase 4 核心开发与功能完善

## 团队：我不是月半猫 日期：2026-06-04

## 1. 本阶段 AI 使用清单

| 任务 | AI工具 | Prompt摘要 | AI输出质量(1-5) | 人工修改幅度(%) |
| ------ | -------- | ----------- | ---------------- | --------------- |
| Sprint 合并规划 | claude code | 将 P0 与 P1 优先级功能拆分为具体开发任务。每个任务应：可在 2-4 小时内完成, 有明确的完成标准, 分配给具体负责人, 标明优先级（P0 / P1 / 可选 P2） | 5 | 0% |
| Shared utils 单元测试（password/jwt/errors/api-response/crypto） | claude code | 为 shared 包中的工具函数编写 vitest 单元测试，覆盖正常/边界/异常输入，使用 vitest-mock-extended 模拟依赖 | 4 | 5% |
| Middleware 单元测试（auth/error-handler） | claude code | 为 express 中间件编写单元测试，mock req/res/next，覆盖所有错误类型和正常路径 | 4 | 5% |
| Service-A 单元测试（demand/order） | claude code | 为 demand-service 和 order-service 编写单元测试，mock Prisma 事务，覆盖订单状态机全路径 + 乐观锁冲突 | 4 | 10% |
| Service-B 单元测试（auth/review/message） | claude code | 为 auth-service/review-service/message-service 编写单元测试，mock 用户仓库和通知函数 | 4 | 10% |
| Validator 单元测试（auth-validators/message-validators） | claude code | 为 Zod schema 编写纯函数测试，覆盖边界值（studentId 非10位、password 7位/纯字母/纯数字等） | 5 | 0% |
| 集成测试（auth-flow/order-flow/error-flows） | claude code | 用 supertest 编写 HTTP 集成测试，覆盖完整正常流程 + 爽约限制 + 未认证访问被拒等异常流程 | 4 | 10% |
| CI/CD 流水线配置 | claude code | 在已有 .gitlab/backend.yml 骨架中添加真实命令和 MySQL service，实现 install/lint/build/test 四个 stage | 4 | 5% |
| AI 代码信任度实验（消息功能） | claude code | 为 CampusHub 实现聊天消息功能（GET 列表 + POST 发送），严格遵循三层架构，使用项目已有辅助函数和中间件 | 5 | 6%（7行/120行） |
| AI 调试对决实验（3个Bug） | claude code | 分析 order-service 通知缺失、createDemand 字段名不一致、reviewRepository 缺少 include 三个 Bug 的根因 | 5 | 0% |
| 前端缺陷修复（纠纷中可聊天/取消订单不显示已接单/seed.ts phone加密） | claude code | 修复前端 TypeScript 类型缺失和渲染条件，修复 seed.ts 中 phone 加密格式 | 5 | 0% |

## 2. AI 助力分析（Q1）

AI 在编码中最有价值的场景：系统性一致性检查。AI 擅长在多个文件之间做 pattern matching——例如 Bug #2 中同时对比前端 `Demand` 类型定义和后端 `demand-service.ts` 三个方法的返回值，一次性发现 `order` 与 `currentOrder` 字段名不一致，而人工需要逐层追踪 API 响应、controller、service、repository 才能定位。另一个典型场景是"遗漏检查"：AI 能系统性地扫描一个模块的所有方法并逐一判断是否缺失某个调用（如通知函数），人类受注意力衰减影响很难发现"没有的东西"。

AI 在测试生成中最有价值的场景：全面覆盖边界条件和异常输入。测试单元测试时，AI 能基于类型定义和业务规则自动推断边界值——例如 password 校验的 7位/8位/32位/33位/纯字母/纯数字/含特殊字符/含中文 的组合覆盖、studentId 非10位/含字母 的无效输入、订单状态机的 6 个方法 × 每种状态的非法调用路径。AI 直出的 16 个消息功能测试场景通过了 15 个（93.75%），基本达到"写完就能提交"的水平。

AI 在调试中最有价值的场景：跨文件根因分析。三个 Bug 中 AI 定位速度是人工的 15-30 倍（Bug #1: 2min vs 32min；Bug #2: 0.5min vs 22min；Bug #3: 1min vs 18min），且所有修复方案均为根因级修复、可直接采纳。关键在于同时提供前后端类型定义、相关 service/repository 代码后，AI 能展现出人类难以企及的系统性分析优势。

## 3. AI 误导分析（Q2）

"AI 代码信任度实验"数据摘要：
- AI 直出的测试通过率：93.75%（15/16 场景）
- 人工审查修复后的测试通过率：100%（16/16 场景）
- 发现的主要问题类型："看起来能用但细节不对"——(1) GET 响应分页格式不符合 API 规范（AI 用了平面 `{items, total, page, pageSize}`，应为 `{items, pagination: {total, page, pageSize, totalPages}}`），原因是 AI 未使用项目已有的 `paginatedResponse` 辅助函数而是直接 `successResponse`；(2) GET 缺少 query 参数校验（`Number(req.query.orderId)` 在缺失时返回 `NaN`，错误信息泛化）。修复仅需 7 行，但问题 #1 会导致前端分页功能完全失效。

"AI 调试对决"实验总结：
- AI 擅长调试的 Bug 类型：(1) 一致性/模式匹配类——在多个代码位置之间做 pattern matching（如同一文件中某些方法有 include 而另一些没有）；(2) 遗漏检查/完整性分析——系统性地扫描所有方法并逐一判断是否缺失某个调用；(3) 跨文件类型对比——同时对比前端类型定义和后端返回值结构。
- AI 不擅长调试的 Bug 类型：(1) 需要运行时信息的 Bug——AI 只能分析静态代码，无法获取浏览器 Console 错误、Network 请求日志、数据库实际数据；(2) 涉及外部依赖行为的 Bug——Prisma 的嵌套写入行为、npm 包版本冲突、Docker 环境差异。
- AI 修复方案的典型问题：如果只提供现象描述不提供代码上下文，AI 可能给出修复表象的"创可贴"方案（如在前端加 null guard 而非修复后端缺少 include 的问题）。AI 的根因分析深度与提供的代码上下文成正比。

## 4. Prompt 改进计划（Q3）

上阶段改进措施的验证结果：上阶段制定的"分步提问"策略在本阶段继续有效——将复杂任务拆分为 Sprint 规划 → 编码 → 测试 → 部署 四个阶段，每个阶段内再按模块分解（Shared utils → Service-A → Service-B → 集成测试），AI 在每个小任务上的输出质量明显高于一次性大 Prompt。这一策略在本阶段从设计阶段过渡到生产代码阶段后仍然适用。

编码阶段的 Prompt 最佳实践：提供同类模块的参考代码路径可显著提升 AI 输出一致性。例如本阶段在生成消息功能时，Prompt 中明确要求"参考 review-routes.ts、notification-service.ts 等现有代码的模式"——AI 在路由注册方式、中间件使用、错误类型选择、响应格式等方面与项目现有模块保持了一致。建议在 Prompt 中始终包含"参考 src/xxx 文件的模式"的具体指引。

调试阶段的 Prompt 最佳实践：同时提供前后端类型定义是提升 AI 调试效果最关键的因素。实验数据显示，仅提供后端代码时 AI 只能做单侧分析（效果评级 ⭐⭐），同时提供前后端类型后 AI 能交叉对比字段名和关联数据结构（效果评级 ⭐⭐⭐⭐⭐）。本阶段三个 Bug 的调试均采用"前端类型定义文件 + 后端 service/repository 代码"的 Prompt 模式，AI 全部给出根因级修复。

下阶段计划改进：(1) 在 Prompt 中明确要求"使用项目已有的辅助函数而非重复造轮子"——本阶段 AI 代码信任度实验中发现的分页格式问题，根本原因是 AI 未使用 `paginatedResponse` 而是自行构造响应对象；(2) 对 AI 生成的代码建立标准审查清单：对照 API 规范逐字段验证响应格式 → 确认错误处理路径的提示信息是否明确 → 检查是否使用了项目已有辅助函数；(3) 对于涉及字段名映射的编码任务，同时提供前后端类型定义作为 Prompt 上下文。

## 5. 本阶段的核心工程判断

决策内容：手机号加密存储方案选择（encryptPhone / decryptPhone / maskPhone）。后端数据库中手机号以 AES-256-CBC 密文存储（确保 DBA 也无法直接查看明文），但业务层通过 `maskPhone()` 返回脱敏显示（"138****5678"）。API 响应中永不返回明文手机号。

为什么 AI 无法单独做这个决策：(1) AI 不知道项目的合规要求级别——是否需要满足等保、学校数据管理规定等具体的法律/制度约束；(2) AI 不知道数据库审计策略——DBA 是否需要访问明文、审计日志是否需要记录查询操作；(3) AI 不知道团队对"可恢复性"的权衡——如果需要密码重置时的手机号验证，加密方案需要支持解密（而非仅 hash），这会影响密钥管理策略。

团队最终如何判断和取舍：采用 AES-256-CBC 加密（非 hash），因为 (1) 校园互助平台涉及学生真实手机号，需要满足基本的个人信息保护要求；(2) 业务需要支持手机号脱敏显示（"138****5678"），加密方案可解密后做 mask；(3) 密钥通过环境变量 `PHONE_ENCRYPTION_KEY` 注入，不硬编码在代码中；(4) 加密密钥的轮换策略留待后续迭代完善，当前版本仅确保"密文存储 + 接口永不返回明文"。

---

决策内容：测试策略选择——单元测试使用 vitest-mock-extended mock Prisma，集成测试使用 supertest + 真实 MySQL。

为什么 AI 无法单独做这个决策：(1) AI 不知道 CI 环境的 MySQL 可用性——GitLab Runner 是否支持 service 容器、公司自建 GitLab 与 SaaS GitLab 在 service 支持上的差异；(2) AI 不知道团队对测试速度的要求——单元测试要求秒级反馈（mock 数据库），集成测试可接受分钟级（真实数据库）；(3) AI 不知道项目当前的 Prisma schema 变更频率——schema 频繁调整时 mock 测试更稳定，schema 稳定后集成测试更可信。

团队最终如何判断和取舍：采用分层策略——(1) Service 层核心逻辑（订单状态机、信用分计算、爽约限制）使用 vitest-mock-extended mock Prisma，确保纯逻辑测试的确定性和速度；(2) Middleware 和 Validator 也是纯逻辑测试，同样使用 mock；(3) 集成测试（supertest + 真实 MySQL）仅覆盖 3 个最关键流程（完整认证流、完整订单流、异常流程），不追求覆盖率的全面性；(4) CI pipeline 中集成测试依赖 MySQL service 容器，如果 runner 不支持则跳过。这种分层策略在速度和可信度之间取得了平衡。

---

决策内容：AI 代码信任度阈值设定——AI 直出代码必须经过三道检查才能合入：API 规范逐字段验证、错误处理路径检查、项目已有辅助函数使用检查。

为什么 AI 无法单独做这个决策：(1) AI 无法评估自己的"典型犯错模式"——本阶段的实验数据（93.75% 通过率、7行修复）是在事后分析的，AI 在做生成时并不知道自己会在哪个细节上出错；(2) "信任度阈值"本质上是风险管理决策，取决于代码出错后的影响范围——消息功能出错只影响一个页面，但订单状态机出错会影响整个核心流程和信用分系统；(3) 阈值还与团队规模和审查能力有关——3 人小团队可能接受更高的风险（更依赖 AI），大团队可能有更严格的审查要求。

团队最终如何判断和取舍：基于本阶段的实验数据建立了三级信任度评估体系——(1) **低风险代码**（纯工具函数、Zod schema、类型定义）：AI 直出经编译检查后可直接合入；(2) **中风险代码**（Service 层业务逻辑、Controller 层）：AI 直出后需经"标准审查清单"检查（API 格式 + 错误处理 + 辅助函数使用），通过后方可合入；(3) **高风险代码**（订单状态机、信用分计算、权限校验）：即使 AI 生成也需人工逐行 review + 补充边界测试。消息功能的实验表明，即使在中风险类别中，AI 生成的 120 行也有 2 个细节问题，因此"标准审查清单"是不可省略的环节。
