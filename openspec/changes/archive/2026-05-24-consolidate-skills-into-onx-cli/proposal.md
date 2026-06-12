## Why

当前 OpenXenon 项目有 11 个独立的 oxn-* 技能（oxn-arsenal、oxn-explore、oxn-forge、oxn-init、oxn-plan、oxn-resume、oxn-status、oxn-stop、oxn-task、oxn-trace、oxn-work），但这些技能之间缺乏统一入口，功能分散，用户体验碎片化。统一到 `onx-cli` 技能中可以提供一致的操作体验，降低维护成本，并让 AI 更容易理解和路由用户请求。

## What Changes

- **移除** 11 个独立的 oxn-* 技能目录：
  - oxn-arsenal、oxn-explore、oxn-forge、oxn-init、oxn-plan、oxn-resume、oxn-status、oxn-stop、oxn-task、oxn-trace、oxn-work
- **新增** 统一的 `onx-cli` 技能，作为所有 OpenXenon CLI 操作的单一起点
- **保留** openspec-* 系列技能（apply-change、archive-change、explore、propose），保持 OpenSpec 工作流的独立性

## Capabilities

### New Capabilities
- `onx-cli`: 统一的 CLI 操作入口技能，整合原 11 个 oxn-* 技能的功能到一个 Skill 文件中

### Modified Capabilities
- 无（现有 openspec-* 技能保持不变）

## Impact

- 技能目录：`.opencode/skills/` 下的 oxn-* 目录将被移除
- 新增技能：`.opencode/skills/onx-cli/SKILL.md`
- 用户交互：用户通过 `/onx-cli` 命令访问所有 CLI 功能，而非使用分散的多个命令