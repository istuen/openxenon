## Why

项目中存在多个过时的文档，它们使用了旧的 Xenonix 命名和架构：

| 文档 | 问题 |
|------|------|
| `OpenXenon (修订版).md` | Xenonix 旧白皮书 |
| `README-v2.md` | 旧版 README |
| `docs/xenonix-concept-white-paper-2.md` | Xenonix 白皮书 |
| `docs/database.md` | 使用 `~/.xenonix/` 路径 |
| `docs/types.md` | "Xenonix TypeScript 类型定义" |
| `docs/xdr.md` | "Xenonix 架构决策记录" |
| `docs/proof-architecture.md` | "Xenonix 的 Proof 架构" |
| `docs/proof-development-guide.md` | Xenonix 示例 |
| `docs/skill-development.md` | "Xenonix Skill" |
| `docs/adapter-development.md` | "XenonixSkill" |

这些文档与当前的 v1.1 架构（`docs/architecture.md`）不一致，会造成混淆。

## What Changes

1. 删除根目录下的过时文档：
   - `OpenXenon (修订版).md`
   - `README-v2.md`

2. 删除 `docs/` 下过时的文档：
   - `docs/xenonix-concept-white-paper-2.md`
   - `docs/database.md`
   - `docs/types.md`
   - `docs/xdr.md`
   - `docs/proof-architecture.md`
   - `docs/proof-development-guide.md`
   - `docs/skill-development.md`
   - `docs/adapter-development.md`

3. 保留：
   - `docs/architecture.md` - 最新 v1.1 架构文档
   - `docs/adr/adr-001-mvp-0.1-architecture.md` - 历史 ADR
   - `docs/manual/` - 使用手册

## Impact

- 仓库更干净，无过时文档混淆
- 与当前架构保持一致

## High Risk

- 这些文件已被 git 跟踪，需要从 git 中移除