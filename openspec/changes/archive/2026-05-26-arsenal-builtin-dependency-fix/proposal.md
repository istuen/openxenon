## Why

当前 `infra/loader.ts` 使用 `require('../arsenals/builtin')` 获取 BUILTIN_* 常量，这违反了架构原则：Infra（L1 物理层）不应依赖 Arsenal（L2 领域层）的业务数据。此外，`work/part-resolver.ts` 直接 import `BUILTIN_PARTS`，让执行层知道了内置数据的细节，违反了"Work 只依赖 ArsenalResolver 寻址"的原则。

## What Changes

- 重构 `preloadCompileDependencies` 为依赖注入模式，所需 BUILTIN_* 由调用者传入
- 更新所有调用 `preloadCompileDependencies` 的点，传入 BUILTIN_* 参数
- 重构 `work/part-resolver.ts`，通过 ArsenalResolver 获取 Part，不直接依赖 BUILTIN_*
- 验证 `infra/loader.ts` 不再包含任何对 Arsenal 的引用

## Capabilities

### New Capabilities

- `builtin-arsenal-interface`: 定义 BuiltinArsenal 实现规范，确保内存版 Arsenal 与磁盘版 Arsenal 行为一致
- `arsenal-resolver-priority`: 定义 ArsenalResolver 的优先级查找规则（Project > Global > Builtin）

### Modified Capabilities

- 无现有 capability 的 requirement 变更

## Impact

- **修改文件**:
  - `src/infra/loader.ts` - 移除 require，改为参数注入
  - `src/work/part-resolver.ts` - 改为通过 ArsenalResolver 获取
  - `src/cli/arsenal-promote.ts` - 传入 BUILTIN_* 参数
  - `src/cli/global-arsenal-promote.ts` - 传入 BUILTIN_* 参数
  - `src/cli/oxn-dual-track.ts` - 传入 BUILTIN_* 参数
- **新增文件**:
  - `src/arsenals/builtin-arsenal.ts` - BuiltinArsenal 实现
- **依赖方向调整**:
  - Infra → Arsenal (移除)
  - Work → BUILTIN_* (移除)