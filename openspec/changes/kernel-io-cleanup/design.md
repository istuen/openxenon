## Context

当前 Kernel 层残留 3 个违反 L0 零 I/O 约束的文件：

| 文件 | I/O 模块 | 用途 |
|------|---------|------|
| `kernel/processors/sandbox-manager.ts` | `fs` | 沙箱目录创建/删除 |
| `kernel/constants.ts` | `os.homedir` | 构建 `BOUNDARY_DIR` 全局路径 |
| `kernel/schemas/validators/frozen-schema.ts` | `crypto` | `computeContentHash` 内容哈希 |

这些操作必须从 Kernel 层移除，移至 Infra 层或其他适当层级。

## Goals / Non-Goals

**Goals:**
- 实现 Kernel 层零 I/O 操作（完全不含 `fs`、`os`、`crypto`）
- 将 I/O 操作迁移至 Infra 层
- 保持 Kernel 的纯函数特性

**Non-Goals:**
- 不修改 Kernel 的 Schema 层数据结构定义
- 不修改 Kernel 的 Contract 层接口定义
- 不改变现有调用方的使用方式（仅调整导入路径）

## Decisions

### Decision 1: sandbox-manager.ts 迁移至 Infra

**选择**: `sandbox-manager.ts` 迁移至 `infra/sandbox-manager.ts`

**理由**:
- 沙箱目录管理是物理操作，属于 Infra 层职责
- Work 层调用 Infra 进行沙箱管理，而不是 Kernel

**替代考虑**:
- 合并到 `infra/filesystem.ts`：不合适，sandbox 管理有独立职责

### Decision 2: constants.ts 的 homedir 逻辑迁移

**选择**: `constants.ts` 中的 `homedir` 逻辑迁移至 `infra/boundary.ts`

**理由**:
- `GLOBAL_BOUNDARY_PATH` 的构建是物理操作，需要获取用户目录
- Infra 层已存在 `infra/global.ts` 处理全局路径

### Decision 3: frozen-schema.ts 的 crypto 依赖

**选择**: `computeContentHash` 迁移至 `infra/hash.ts`，`createXenonMeta` 改为接收注入的 hasher

**理由**:
- 内容哈希是物理操作（计算），属于 Infra 层
- Kernel 使用依赖注入模式，不直接调用 crypto
- `createXenonMeta` 保持接口不变，接收 hasher 函数作为参数

## Risks / Trade-offs

[Risk] 迁移后调用方需要调整导入路径
→ Mitigation: 提供 re-export 兼容层

[Risk] constants.ts 被广泛引用，迁移可能破坏其他模块
→ Mitigation: 检查所有引用，批量更新导入路径

## Migration Plan

### Phase 1: 创建 Infra 层文件
1. 创建 `infra/hash.ts` 实现 `computeContentHash`
2. 创建 `infra/boundary.ts` 处理全局路径（含 homedir）
3. 创建 `infra/sandbox-manager.ts`（从 kernel 复制）

### Phase 2: 修改 Kernel 层
1. 修改 `kernel/constants.ts` 移除 os 导入，引用 `infra/boundary.ts`
2. 修改 `kernel/schemas/validators/frozen-schema.ts` 移除 crypto 导入
3. 修改 `kernel/processors/sandbox-manager.ts` 改为 re-export

### Phase 3: 更新调用方
1. 更新 `kernel/blueprint-freezer.ts` 使用注入的 hasher
2. 更新 `oxn-dsl/compiler/blueprint-compiler.ts` 使用 `infra/hash.ts`
3. 验证 typecheck 通过

## Open Questions

无