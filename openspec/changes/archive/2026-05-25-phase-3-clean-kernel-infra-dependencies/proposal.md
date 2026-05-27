## Why

当前 `kernel/schemas/part-asset.ts` 和 `kernel/schemas/blueprint.schema.ts` 直接从 `infra/loader.ts` 导入 `ProbeTypeSchema`、`isValidProbeRef` 等函数。根据分层原则，`ProbeTypeSchema` 应该下沉到 Kernel，`isValidProbeRef` 等引用解析函数应该重新导出到 `kernel/probes/namespace.ts`。

## What Changes

- 将 `ProbeTypeSchema` 从 `infra/loader.ts` 迁移至 `kernel/schemas/probe.ts`
- 将引用解析函数 (`isValidProbeRef`, `isBareProbeRef`, `parseProbeNamespace`) 的源位置改为 `kernel/probes/namespace.ts`
- 更新 `kernel/schemas/part-asset.ts` 和 `kernel/schemas/blueprint.schema.ts` 的 import 路径
- 移除 `kernel/probes/namespace.ts` 对 `infra/loader.ts` 的 re-export，改为从本地图入

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `probe-type-schema`: ProbeTypeSchema 位置从 infra 迁移至 kernel

## Impact

### 受影响的文件

**迁移源（ProbeTypeSchema）：**
- `infra/loader.ts` - 移除 `ProbeTypeSchema` 定义

**迁移目标：**
- `kernel/schemas/probe.ts` - 已有定义，需确认内容
- `kernel/schemas/part-asset.ts` - 更新 import
- `kernel/schemas/blueprint.schema.ts` - 更新 import

**引用解析函数：**
- `kernel/probes/namespace.ts` - 已有 re-export，需确认源位置