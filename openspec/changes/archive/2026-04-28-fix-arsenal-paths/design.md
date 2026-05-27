## Context

代码中使用了 `STANDARDS_ROOT = join(GLOBAL_BOUNDARY_PATH, 'standards')`，但 CLI 命令和 Skill 已统一使用 `arsenal` 作为资产目录名称。同时，`.openxenon/` 下其他目录均为复数（proofs、tasks），所以应为 `arsenals`。

## Goals / Non-Goals

**Goals:**
- 重命名 `standards-paths.ts` 中的路径常量
- 更新所有相关导入
- 目录名使用复数 `arsenals`

**Non-Goals:**
- 不修改资产目录结构的逻辑
- 不修改文件名或 state 值的大小写（DRAFT/CANONICAL 保持大写）

## Decisions

### 1. 重命名路径常量

将 `STANDARDS_ROOT` 改为 `ARSENALS_ROOT`（复数），相应地：
- `STANDARDS_PROBES` → `ARSENALS_PROBES`
- `STANDARDS_PROOFS` → `ARSENALS_PROOFS`
- `STANDARDS_STAGES` → `ARSENALS_STAGES`
- DRAFT/CANONICAL 路径变量相应更新

### 2. 目录结构

最终路径：`~/.openxenon/arsenals/probes/DRAFT/`

## Risks / Trade-offs

无风险。这是纯重命名操作。

## Open Questions

无