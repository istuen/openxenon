## Why

Skill 编译产物目录结构错误。当前：
- Skill 源码：`src/skills/oxn-*.ts`
- 编译产物：`.opencode/skills/oxn-*.md`（单文件）

正确结构应该是目录形式：
- 编译产物：`.opencode/skills/oxn-*/SKILL.md`

参考 `.opencode/skills/oxn-forge/SKILL.md`（已存在），其他 Skill 都应该迁移到同一结构。

## What Changes

- 修改 `skill-compiler.ts` 的 `compileSkill()` 函数
- 输出路径从 `.opencode/skills/<skillId>.md` 改为 `.opencode/skills/<skillId>/SKILL.md`
- 同一目录下可以放额外资源（如 schema、图标等）
- 迁移现有 Skills 到新结构

## Capabilities

### New Capabilities

- `skill-directory-structure`: Skill 编译产物使用目录形式

### Modified Capabilities

- `skill-compiler`: 输出路径从单文件改为目录/SKILL.md

## Impact

- `src/cli/skill-compiler.ts`: 修改 `outputPath` 逻辑
- 所有现有 `.opencode/skills/*.md` 文件需要迁移
- Skills 加载逻辑可能需要调整（如果有用到）