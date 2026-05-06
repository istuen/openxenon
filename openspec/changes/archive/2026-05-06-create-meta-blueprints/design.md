## Context

当前 `meta-forge.ts` 将所有元蓝图合并在一个 TypeScript 文件中。这导致：
- 无法单独管理每个资产
- 不便于使用 `oxn arsenal` 命令查看和更新
- 与其他资产风格不一致

## Goals / Non-Goals

**Goals:**
- 将 4 个元蓝图拆分为独立的 arsenal 资产
- 保持向后兼容，`oxn-forge` 技能仍能正常工作

**Non-Goals:**
- 不删除 `meta-forge.ts`，保留作为 fallback
- 不修改 `oxn-forge` 技能的指令内容

## Decisions

### Decision 1: 资产结构

**选择：**
每个元蓝图作为独立的 Stage 资产：
- `arsenals/stages/meta-blueprint-for-probe/draft.yaml`
- `arsenals/stages/meta-blueprint-for-proof/draft.yaml`
- `arsenals/stages/meta-blueprint-for-stage/draft.yaml`
- `arsenals/stages/meta-blueprint-for-blueprint/draft.yaml`

**理由：**
- 元蓝图本身是 Stage 的一种
- 符合新目录结构

### Decision 2: 向后兼容

**选择：**
`oxn-forge` 技能优先从 arsenal 加载元蓝图，如果不存在则 fallback 到 `meta-forge.ts`。

**理由：**
- 逐步迁移，无需一次性更新所有代码
- 出错时可回退

## Risks / Trade-offs

- **加载顺序** → 确保 arsenal 加载逻辑先于 fallback