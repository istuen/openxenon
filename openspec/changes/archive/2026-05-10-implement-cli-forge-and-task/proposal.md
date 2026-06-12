## Why

Skills 和 CLI 说的是两套语言。AI 被 Skill 教着走一条路，但 CLI 根本没铺那条路。

根本原因：
- `cli/forge.ts` 只显示约束，不保存 draft
- `cli/task.ts` 是空壳，没有子命令
- Daemon 侧的 IPC handlers 已存在，但 CLI 没有包装
- Skills 指令指向不存在的命令

## What Changes

- `cli/forge.ts` 增加 `--save` 参数，调用 `createDraftFromYaml()` 保存 draft
- `cli/task.ts` 从空壳改为 3 个子命令：`submit`、`next`、`verify`
- 修改 4 个 Skills 指令，让它们指向真实存在的 CLI 命令

## Capabilities

### New Capabilities

- `cli-forge-save`: `oxn forge --save '<yaml>' --name <name>` 保存 draft
- `cli-task-submit`: `oxn task submit --blueprint <path>` 提交 Blueprint
- `cli-task-next`: `oxn task next --task-id <id>` 获取下一个 Stage
- `cli-task-verify`: `oxn task verify --task-id <id> --stage-id <id>` 验证

### Modified Capabilities

- `oxn-forge-skill`: 显式 `--save` 用法
- `oxn-task-skill`: 指向 `oxn task submit/next/verify`
- `oxn-init-skill`: `oxn status` → `oxn daemon status`
- `oxn-status-skill`: `oxn api task-status` → `oxn task status`

## Impact

- `src/cli/forge.ts`: +30 行，加 `--save` 参数
- `src/cli/task.ts`: +80 行，3 个子命令
- `src/skills/oxn-task.ts`: ~20 行，修改 instruction
- `src/skills/oxn-forge.ts`: ~10 行，加 `--save` 用法
- `src/skills/oxn-init.ts`: ~3 行
- `src/skills/oxn-status.ts`: ~5 行