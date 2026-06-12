## Why

Skill 文件中引用 `.openxenon/arsenal/`（单数），但代码实际使用 `.openxenon/arsenals/`（复数）。同时，目录名 `DRAFT` 使用大写，但 `.openxenon/` 下其他目录都是小写（proofs、tasks）。

## What Changes

- 更新 `src/skills/oxn-forge.ts` 中的路径引用：`.openxenon/arsenal/` → `.openxenon/arsenals/`
- 更新 `src/commands/arsenal-inspect.ts` 中的路径分割逻辑
- 将 `DRAFT` / `CANONICAL` 改为 `draft` / `canonical`（小写）
- 更新 `src/core/standards-paths.ts` 中的类型定义
- 重新编译 Skill

## Capabilities

### Modified Capabilities

- `oxn-forge-skill-paths`: 更新 Skill 中的路径引用
- `arsenal-state-case`: 将状态目录名从大写改为小写