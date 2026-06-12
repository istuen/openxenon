## Why

当前 oxn-init、oxn-status、oxn-stop、oxn-trace、oxn-arsenal 这 5 个技能都是独立的 System 操作类技能，功能相对简单但分散。用户需要记忆多个命令入口，不利于统一体验。将这些技能合并到 oxn-cli 可以提供一致的 CLI 操作入口，降低用户认知负担。

## What Changes

- **移除** 5 个独立的 System 操作技能目录：
  - `oxn-init/` — 初始化项目围栏
  - `oxn-status/` — 状态体检
  - `oxn-stop/` — 人工熔断
  - `oxn-trace/` — 轨迹取证
  - `oxn-arsenal/` — Arsenal 资产管理
- **整合** 这 5 个技能的功能到 `oxn-cli` 技能中
- **保留** 以下技能不变（不在本次合并范围内）：
  - oxn-task、oxn-work、oxn-forge、oxn-explore、oxn-plan、oxn-resume

## Capabilities

### New Capabilities
- `oxn-cli-system`: 将 oxn-init、oxn-status、oxn-stop、oxn-trace、oxn-arsenal 的功能整合为 oxn-cli 的 system 子命令

### Modified Capabilities
- `oxn-cli`: 扩展现有 oxn-cli 技能，新增 system 子命令分组（init/status/stop/trace/arsenal）

## Impact

- 技能源文件：`src/skills/locales/zh-CN/` 下的 oxn-init/、oxn-status/、oxn-stop/、oxn-trace/、oxn-arsenal/ 目录将被移除
- 技能编译：`src/skills/loader.ts` 中的 skillMeta 需更新
- 迁移：oxn init 时加载的技能从 11 个变为 6 个（剩余：oxn-cli, oxn-task, oxn-work, oxn-forge, oxn-explore, oxn-plan）