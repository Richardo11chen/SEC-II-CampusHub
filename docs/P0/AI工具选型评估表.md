# AI ⼯具选型评估表

## 选定工具

| ⼯具 | 选择 | 说明 |
| --- | --- | --- |
| GitHub Copilot | ✅ 选定 | 代码补全和 IDE 深度集成，Python/TypeScript 代码生成质量行业领先 |
| Claude Code | ✅ 选定 | 通过 DeepSeek V4 API 接入，解决原先成本过高的问题，保留强大模型能力用于复杂任务 |

## 对比分析

| ⼯具 | 结论 | 理由 |
| --- | --- | --- |
| GitHub Copilot | ✅ 选定 | 行级补全体验最佳，IDE 深度集成，适合日常编码 |
| Claude Code | ✅ 选定 | 配合 DeepSeek V4 API 后成本可控，擅⻓复杂推理、重构、大规模代码理解，与 Copilot 形成互补 |
| 通义灵码 | ❌ 不选择 | 中文友好、免费，但 Copilot + Claude Code 组合已覆盖所有场景，无需重复 |
| DeepSeek 独立工具 | ❌ 不选择 | 无深度 IDE 插件，行级补全体验差；但其模型能力通过 Claude Code 接入使用 |

## 分工

- **Copilot**：日常编码补全、简单生成、IDE 内即时辅助
- **Claude Code**：复杂任务（跨文件重构、架构分析、批量修改），通过 CLI 或 API 调用 DeepSeek V4 模型
