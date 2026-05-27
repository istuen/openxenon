## Why

`kernel/lib/blueprint-parser.ts` 依赖 `daemon/types`，而 Kernel 不应知道 daemon 的 payload 格式。`kernel/lib/part-resolver.ts` 需要拆分，其实现在需要用到 OXN DSL 的 Langium 解析器和 Infra 的文件系统扫描，职责边界不清晰。

## What Changes

- 将 `kernel/lib/blueprint-parser.ts` 迁移至 CLI 层或删除（取决于 CLI 是否有自己的解析逻辑）
- 将 `kernel/lib/part-resolver.ts` 迁移至 `work/part-resolver.ts`（暂存）

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- 无

## Impact

### 受影响的文件

**blueprint-parser.ts:**
- `kernel/lib/blueprint-parser.ts` - 迁移或删除
- `kernel/index.ts` - 移除 `parseBlueprintYaml` 导出

**part-resolver.ts:**
- `kernel/lib/part-resolver.ts` → `work/part-resolver.ts`

**依赖方:**
- `kernel/executor/expectation-runner.ts`（已迁至 oxn-dsl）
- `oxn-dsl/compiler/oxn-adapter.ts`（依赖 `resolvePartRef`）