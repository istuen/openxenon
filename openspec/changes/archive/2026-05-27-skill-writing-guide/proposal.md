## Why

当前 OXN Skill 编写缺乏统一规范，导致 AI 执行行为不一致：

1. **不确定性**: Skill 中的变量占位符 `<task-id>` 允许 AI 自由拼装参数，导致输出格式不确定
2. **缺乏熔断机制**: 错误处理分散或缺失，AI 遇到问题时可能胡乱重试或继续执行
3. **JSON 输出不稳定**: CLI 命令未强制 `--json`，AI 可能解析人类可读终端文本
4. **Skill 分层不清**: `oxn-cli` 与 `oxn-work` 的错误处理粒度不统一

本提案建立 OXN Skill 编写的基础规范，为 AI 提供确定性执行路径。

## What Changes

### 核心规范

1. **变量占位符**: 统一使用 `{{VARIABLE (constraint)}}` 格式，将约束内嵌在变量旁
2. **强制 JSON**: 所有 CLI 命令必须带 `--json` 参数
3. **统一重试**: 失败时重试 3 次，第 4 次失败后触发熔断
4. **统一熔断**: 所有 Skill 默认统一熔断，后续按需升级
5. **熔断报告**: 写入 `.openxenon/error/skills/<date>-<skill>-<step>.md` + 打印标准报告

### Skill 文件位置

- 源文件: `src/skills/locales/zh-CN/<skill>/instruction.md`
- Skill 通过 `src/skills/loader.ts` 加载并导出

## Capabilities

### New Capabilities

- `skill-writing-guide`: 定义 OXN Skill 的标准编写规范，包括变量格式、执行步骤、熔断流程

## Impact

### 受影响 Skill

- `oxn-cli/instruction.md`
- `oxn-task/instruction.md`
- `oxn-work/instruction.md`
- `oxn-forge/instruction.md`
- `oxn-explore/instruction.md`
- `oxn-plan/instruction.md`

### 新增目录

- `.openxenon/error/skills/` — 由 `oxn init` 预创建