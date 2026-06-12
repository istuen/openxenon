## Context

当前 Infra 层 (L1) 存在架构越界问题：

1. **路径常量越界**: `infra/paths.ts` 包含 `GLOBAL_ARSENALS_*`、`GLOBAL_FORGES_*` 等 8 条业务路径常量，这些属于 Arsenal (L2) 的业务知识，不该在 L1

2. **内置资产依赖**: `infra/loader.ts` 引用 `arsenals/builtin` 的 `BUILTIN_PROBES`、`BUILTIN_PARTS`，L1 依赖了 L2

3. **业务类型依赖**: `infra/compile-cache.ts` 依赖 `kernel/schemas/frozen-schema` 的 `FrozenBlueprint`；`infra/explore/collector.ts` 依赖 `kernel/explore/types` 的 `ExplorationContext`

根据 L0-L3 宪法，Infra 应该是"纯物理做功层"，只提供 IO 能力，不携带任何业务知识。

## Goals / Non-Goals

**Goals:**
- 净化 Infra，使其成为零业务依赖的物理做功层
- 业务路径常量移至 Arsenal (L2)
- 业务类型依赖移除，类型转换上移至 L2/L3

**Non-Goals:**
- 不改变 Infra 的 IO 抽象接口
- 不改变现有功能行为
- 不涉及其他层的重构

## Decisions

### Decision 1: 路径常量拆分

**选择**: 将 `infra/paths.ts` 的业务路径常量迁移至 `arsenals/paths.ts`

**理由**:
- 业务路径 (arsenals/forges) 属于 L2 领域知识
- L1 只保留框架常量 (BOUNDARY_DIR, GLOBAL_BOUNDARY)
- 依赖方向从 `infra → arsenals` 变为 `arsenals → infra`

**替代方案考虑**:
- 方案 B: 保留在 infra，在调用处注入 — 未采纳，因为路径常量属于业务领域，不该在 L1

### Decision 2: Loader 内置逻辑迁移

**选择**: 将 `scanBuiltin()` 移至 `arsenals/loader.ts`

**理由**:
- BUILTIN_* 是 Arsenal 的业务概念
- L1 不该知道有哪些内置资产
- L2 负责组合 IO 结果和内置资产

### Decision 3: 业务类型上移

**选择**: `infra/compile-cache.ts` 返回 `Record<string, unknown>` 而非 `FrozenBlueprint`

**理由**:
- L1 只负责 IO，不负责类型校验
- 类型转换由 L2/L3 的调用方负责
- 保持 Infra 的纯净性

## Risks / Trade-offs

[风险]: `arsenals/loader.ts` 需要重新实现内置资产加载逻辑
→ 缓解: 复用现有 `BUILTIN_*` 定义，只需迁移函数调用

[风险]: `infra/compile-cache.ts` 的 `CacheEntry` 类型变化
→ 缓解: 调用方需要更新类型断言，但这是正确的依赖方向

[风险]: 多个 CLI 文件依赖 `infra/paths.ts` 的业务常量
→ 缓解: 这些 CLI 属于 L3，可以同时依赖 Arsenal 和 Infra

## Migration Plan

1. 创建 `arsenals/paths.ts`，导入 `infra/paths.ts` 并添加业务路径常量
2. 修改 `arsenals/loader.ts`，移除对 `infra/loader.ts` 的越界依赖
3. 修改 `infra/compile-cache.ts`，移除 `FrozenBlueprint` 类型依赖
4. 修改 `infra/explore/collector.ts`，移除 `ExplorationContext` 类型依赖
5. 更新所有引用业务路径常量的 CLI 文件

**回滚策略**: 如果出现问题，可以通过 git revert 快速回滚，因为只涉及文件移动和 import 变更。