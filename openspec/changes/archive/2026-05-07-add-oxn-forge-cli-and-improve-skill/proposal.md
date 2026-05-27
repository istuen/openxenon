## Why

区分两个概念的职责：
- **CLI (`oxn`)**: 工程师直接使用的命令，用于查看信息、执行操作
- **Skill (`/oxn-forge`)**: AI 模型执行的指令，让 AI 帮助工程师完成任务

需要：
1. 提供 `oxn forge` CLI 命令，让工程师可以直接获取元蓝图模板
2. 改进 `/oxn-forge` Skill，让 AI 模型通过 CLI 获取元蓝图后生成资产

## What Changes

1. **新增 CLI 命令 `oxn forge <type>`**
   - 显示指定类型的元蓝图约束
   - 类型可选：`probe`, `proof`, `stage`, `blueprint`

2. **改进 Skill `/oxn-forge`**
   - 更新 instruction，让 AI 模型通过 `oxn forge <type>` 获取模板
   - AI 生成后调用 `createDraftFromYaml` 保存

## Capabilities

### New Capabilities

- `oxn-forge-cli`: 提供 `oxn forge <type>` 命令查看元蓝图

### Modified Capabilities

- `oxn-forge-skill`: 改进指令，让 AI 通过 CLI 获取元蓝图

## Impact

- 新增 `src/commands/forge.ts` CLI 命令
- 修改 `src/skills/oxn-forge.ts` 指令内容