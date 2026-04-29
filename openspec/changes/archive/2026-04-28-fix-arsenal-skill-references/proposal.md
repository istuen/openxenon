## Why

CLI 命令已从 `oxn standards` 重命名为 `oxn arsenal`，但 Skill 源码和编译产物仍引用旧命令，导致 AI 助手生成的指令无法正确执行。同时 `oxn arsenal inspect` 需要 PATH 参数，但用户期望在项目目录下执行时能自动列出可用资产。

## What Changes

- 修复 `src/skills/oxn-forge.ts` 中的命令引用：`oxn standards` → `oxn arsenal`
- 修复 `.opencode/skills/oxn-forge/SKILL.md` 编译产物中的命令引用
- 增强 `arsenal inspect` 命令：无 PATH 参数时自动列出可用资产（交互式选择）

## Capabilities

### New Capabilities

- `arsenal-inspect-default`: 无 PATH 参数时列出可用资产供用户选择

### Modified Capabilities

- `oxn-forge`: 更新 Skill 指令中的 CLI 命令引用（`oxn standards` → `oxn arsenal`）

## Impact

- `src/skills/oxn-forge.ts` - 更新命令引用
- `.opencode/skills/oxn-forge/SKILL.md` - 更新编译产物
- `src/commands/arsenal-inspect.ts` - 添加无参数时的默认行为
