## Context

代码中 `standards-paths.ts` 使用大写 `DRAFT`/`CANONICAL`，但 `.openxenon/` 下其他目录都是小写。为保持一致性，应改为小写。

## Goals / Non-Goals

**Goals:**
- 统一路径为小写：`arsenals/probes/draft/`
- 保持向后兼容（可选）

**Non-Goals:**
- 不改变 Zod Schema 中的枚举值

## Decisions

### 1. 路径常量改为小写

`ARSENALS_PROBES_DRAFT` → `ARSENALS_PROBES_DRAFT` (仍然大写因为是 TypeScript 常量)
实际目录名：`~/.openxenon/arsenals/probes/draft/`

### 2. AssetState 类型

```typescript
export type AssetState = 'draft' | 'canonical'  // 改为小写
```

### 3. 向后兼容

保留旧的 `DRAFT`/`CANONICAL` 作为别名，确保现有代码不受影响。

## Risks / Trade-offs

无风险。使用别名保持向后兼容。

## Open Questions

无