## Why

oxn-explore 当前使用固定 CLI 流程（new → scan → qa → report），与 oxn-task 的 Blueprint/Work 体系不一致。改造为 Blueprint 驱动后，可复用 work 命令体系，支持更灵活的探索流程定制。同时新增 Plan 类型 Blueprint，用于规划类任务。

## What Changes

- 创建 Explore Type Blueprint（explore-flow）， slots 为 scan/qa/report
- 创建 Plan Type Blueprint（plan-flow）， slots 为 analyze/design/estimate/review
- 重写 oxn-explore Skill instruction，使用 oxn work 命令替代原有 CLI
- 新建 oxn-plan Skill instruction
- 目录迁移：explores/ → work/explore/（保持 ai-qa.json/engineer-qa.json 兼容路径）
- 旧版 oxn explore 命令保留兼容

## Capabilities

### New Capabilities

- `explore-workflow`：Explore Type Blueprint，定义 scan/qa/report 三阶段流程
- `plan-workflow`：Plan Type Blueprint，定义 analyze/design/estimate/review 四阶段流程

### Modified Capabilities

- 无

## Impact

- `src/skills/locales/zh-CN/oxn-explore/instruction.md` — 重写使用 work 命令
- `src/skills/locales/zh-CN/oxn-plan/instruction.md` — 新建
- `.openxenon/arsenal/blueprints/explore-flow.oxn` — 新建
- `.openxenon/arsenal/blueprints/plan-flow.oxn` — 新建
- `src/skills/loader.ts` — 注册 oxn-plan skill
- `src/cli/explore-cmd.ts` — 保持兼容，标注废弃