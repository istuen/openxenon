## Why

Kernel 层在 `kernel-purification` 迁移后仍残留违反 L0 零 I/O 约束的文件：
- `sandbox-manager.ts` 使用 `fs` 模块
- `constants.ts` 使用 `os.homedir` 构建全局路径
- `frozen-schema.ts` 使用 `crypto` 模块进行内容哈希

这些 I/O 操作必须在 Kernel 层消除，移至 Infra 或其他适当层级，以符合"Kernel 是兰姆达真空"的架构公理。

## What Changes

1. **迁移 sandbox-manager.ts 至 Infra**
   - `sandbox-manager.ts` 负责沙箱目录管理（创建、删除），包含 fs 操作
   - 移至 `infra/sandbox-manager.ts`，由 Work 层调用

2. **迁移 constants.ts 的 os 依赖至 Infra**
   - `constants.ts` 使用 `os.homedir()` 获取用户目录构建 `BOUNDARY_DIR`
   - 移至 `infra/global.ts` 或创建 `infra/boundary.ts` 处理全局路径解析

3. **迁移 frozen-schema.ts 的 crypto 依赖至 Infra**
   - `frozen-schema.ts` 中的 `computeContentHash` 使用 `crypto.createHash`
   - 移至 `infra/hash.ts`，Kernel 仅使用计算结果

4. **重构 frozen-schema.ts**
   - 移除 `computeContentHash` 实现
   - 保留 `createXenonMeta` 函数签名，接收外部注入的 hasher

## Capabilities

### New Capabilities

- `kernel-zero-io`: Kernel 零 I/O 能力，确保 Kernel 层完全不含任何 I/O 操作

### Modified Capabilities

- `frozen-snapshot`: `computeContentHash` 需外部注入，不再直接调用 crypto

## Impact

**迁移文件**:
- `src/kernel/processors/sandbox-manager.ts` → `src/infra/sandbox-manager.ts`
- `src/kernel/constants.ts` 的 `homedir` 逻辑 → `src/infra/boundary.ts`
- `src/kernel/schemas/validators/frozen-schema.ts` 的 crypto → `src/infra/hash.ts`

**Kernel 修改**:
- 移除所有 `fs`、`os`、`crypto` 导入
- `frozen-schema.ts` 改为接收外部注入的 content hasher

**调用方调整**:
- Work 层调用 `infra/sandbox-manager.ts` 进行沙箱管理
- `oxn-dsl/compiler/blueprint-compiler.ts` 调用 `infra/hash.ts` 获取 content hash