## Context

TypeScript 类型检查失败，报告以下错误：

```
src/arsenals/loader.ts(13,89): error TS2694: Namespace '"/.../src/infra/loader"' has no exported member 'AssetType'.
src/daemon/registry.ts(2,44): error TS2307: Cannot find module '../../arsenals/paths' or its corresponding type declarations.
src/daemon/ipc/handlers/arsenal-search.ts(3,40): error TS2307: Cannot find module '../../kernel' or its corresponding type declarations.
```

这些错误表明：
1. 某些模块的导入路径不正确
2. 类型导出方式不符合 `verbatimModuleSyntax` 要求

## Goals / Non-Goals

**Goals:**
- 修复所有 TypeScript 类型检查错误
- 确保 `pnpm run typecheck` 通过
- 移除未使用的导入

**Non-Goals:**
- 不改变业务逻辑
- 不添加新功能

## Decisions

### Decision 1: 修复 `arsenal-search.ts` 的 kernel 导入路径

**问题**: `src/daemon/ipc/handlers/arsenal-search.ts` 中 `../../kernel` 路径错误

**解决**: 该文件位于 `src/daemon/ipc/handlers/`，要到达 `src/kernel`，需要 `../../../kernel`

### Decision 2: 修复 `infra/loader.ts` 类型导出

**问题**: `src/arsenals/loader.ts` 中 `import('../infra/loader').AssetType` 失败

**原因**: `verbatimModuleSyntax` 要求明确使用 `export type` 来导出类型

**解决**: 在 `infra/loader.ts` 中添加 `export type { AssetType }`

### Decision 3: 修复 `daemon/registry.ts` 的导入

**问题**: 从 `../../arsenals/paths` 导入，但路径可能不正确

**分析**: `src/daemon/registry.ts` → `../../arsenals/paths.ts` 应该正确，因为：
- `src/daemon/` → `../` → `src/` → `../` → 项目根 → `arsenals/paths.ts`？

**实际路径**: `src/daemon/registry.ts` 在 `src/daemon/`，向上两级是 `src/`，但 `arsenals` 在 `src/arsenals/`，所以应该是 `../arsenals/paths` 或直接从 `arsenals/paths` 导入。

### Decision 4: 移除未使用导入

`src/daemon/registry.ts` 中 `join` 和 `ARSENALS_ROOT` 未使用，需要移除。

## Risks / Trade-offs

- 无

## Migration Plan

1. 修正 `src/daemon/ipc/handlers/arsenal-search.ts` 的 kernel 导入路径
2. 在 `src/infra/loader.ts` 添加 `export type { AssetType }`
3. 移除 `src/daemon/registry.ts` 中未使用的导入
4. 运行 `pnpm run typecheck` 验证