## Context

当前 Arsenal 和 Work 模块的实现与架构指南存在偏差。主要问题：

1. **依赖倒置**：`kernel/blueprint-freezer.ts` 直接导入 `work/part-resolver.ts`，违反"Kernel 不可依赖 Work"原则
2. **职责缺失**：`arsenals/` 缺少 `forge.ts`，资产创建逻辑散落在 CLI 层
3. **职责混淆**：`resolvePartRef` 被当作单体逻辑，混到 `oxn-dsl` 中会导致新的架构毒瘤
4. **Port 违宪**：接口设计传入 `projectBoundary` 物理参数，污染 Kernel 真空
5. **技术债务**：`promoter.ts`、`cli/draft.ts` 等直接使用原生 `fs`，违反"所有 IO 必须经由 Infra"原则

## Goals / Non-Goals

**Goals:**
- 建立 `arsenals/forge.ts` 作为资产铸造模块，统一资产创建入口
- 将 Part 引用解析拆解为"纯逻辑解析"和"物理寻址"两个阶段，分别归属 Kernel 和 Arsenal
- 定义纯净的 `PartPort` 接口（不含物理参数），Kernel 通过 Port 获取解析能力
- 清理技术债务，确保所有 IO 经由 Infra 层

**Non-Goals:**
- 不修改 Daemon 的执行逻辑（executor.ts 留在 daemon）
- 不改变 Arsenal 的 CRUD 接口（loader.ts facade 保持不变）
- 不让 `oxn-dsl` 承担物理寻址职责（它只做语法定义）

## Decisions

### Decision 1: `arsenals/forge.ts` 定位为"资产铸造"

**选择**：新建 `arsenals/forge.ts` 作为资产创建的核心模块

**理由**：
- `cli/draft.ts` 中的 `createDraftFromYaml` 等函数应该属于 Arsenal 内部职责
- Forge 是"起草"阶段，Arsenal 是"正式库"，Forge 归属 Arsenal 符合架构分层

**替代方案考虑**：
- 保持 CLI 中的 draft 创建逻辑 → 违反"资产创建收敛到 Arsenal"原则
- 将 `cli/draft.ts` 移到 `arsenals/` → 只是移动，不如新建 `forge.ts` 更清晰

### Decision 2: Part 解析职责拆分

**选择**：将 Part 引用解析拆解为两个阶段

**阶段 1 - 纯逻辑解析（L0 Kernel）**：
- 将 `oxn://parts/git-commit` 解析为 `{ scope: 'builtin', type: 'parts', name: 'git-commit' }`
- 这是纯字符串推演，不涉及任何 IO
- 保留在 `kernel/processors/namespace.ts` 或新建 `kernel/processors/part-namespace.ts`

**阶段 2 - 物理寻址（L2 Runtime/Arsenal）**：
- 根据解析出的 scope，去内存（Builtin）或磁盘（Project/Global）找到对应文件
- 封装在 Arsenal 的 `PartPort` 实现中
- `oxn-dsl` 不承担寻址职责，只做语法定义

**理由**：
- `oxn-dsl` 不能成为新的 IO 洼地
- Kernel 必须保持真空，不能知道"项目边界"这种物理概念
- 消除重复代码的正确方式是：让 Work 和 Kernel 都依赖 Kernel 的纯逻辑解析，然后由 Arsenal 提供统一的寻址实现

### Decision 3: `PartPort` 接口保持纯净

**选择**：Port 接口只接收逻辑引用，不传入任何物理路径参数

```typescript
// 放在 kernel/contracts/part-port.ts
export interface PartPort {
  /**
   * Kernel 只提供逻辑引用，Runtime 负责把它变成物理事实
   * 不传入 projectBoundary 等物理参数
   */
  fetchPartDefinition(logicalRef: string): Promise<PartDefinition>
}
```

**理由**：
- `projectBoundary` 是物理路径概念，让 Kernel 接收它等于污染真空
- Runtime 在注入时，将包含 `projectBoundary` 闭包的实现传给 Kernel
- 对 Kernel 来说，它不知道也不需要知道资产在内存还是在磁盘

### Decision 4: 所有 fs 操作经由 Infra

**选择**：逐步改造 `promoter.ts`、`cli/draft.ts` 等，通过 `Infra` 接口进行 IO

**理由**：
- 架构原则明确规定：Infra 是唯一物理出口
- 统一 IO 入口便于监控、缓存、错误处理

**实施范围**：
- `arsenals/promoter.ts` → 改用 `Infra` 接口
- `cli/draft.ts` → 改用 `Infra` 接口
- `oxn-dsl/loader/oxn-loader.ts` → 改用 `Infra` 接口

## Risks / Trade-offs

[Risk] `forge.ts` 新建可能与现有 `cli/draft.ts` 职责重叠
→ **Mitigation**：新建后逐步将 draft 创建逻辑迁移到 `forge.ts`，最终 `cli/draft.ts` 仅作为 thin wrapper（不超过 20 行）

[Risk] Part 解析职责拆分可能影响现有 Work 流程
→ **Mitigation**：保持 API 兼容，原 `resolvePartRef` 的调用方改为调用 `PartPort.fetchPartDefinition`

[Risk] Port 注入增加调用复杂度
→ **Mitigation**：Port 实现由 CLI/Daemon 层注入，Kernel 内部不感知注入逻辑

## Migration Plan

**Phase 1: 建立宪法基础**
- 新建 `kernel/contracts/part-port.ts`，定义纯净的 `PartPort` 接口（不含物理参数）
- 确保 Kernel 的纯逻辑解析器（如 `parsePartRef`）不依赖任何物理参数

**Phase 2: Infra 收口**
- 清理 `promoter.ts`、`cli/draft.ts` 等处的原生 `fs` 调用，统一改为调用 Infra 接口

**Phase 3: Arsenal 重构**
- 新建 `arsenals/forge.ts`，收敛 draft 创建逻辑
- Arsenal 实现 `PartPort`，封装 Builtin/Project/Global 的统一寻址逻辑

**Phase 4: Kernel 解绑**
- 改造 `kernel/blueprint-freezer.ts`，移除对 `work/part-resolver.ts` 的直接依赖
- 改为依赖注入的 `PartPort`

**Phase 5: 清理战场**
- 删除/重构 `work/part-resolver.ts`，不再直接访问文件系统
- 确认 `oxn-dsl` 只做语法定义，不具备运行时寻址能力

## Open Questions

1. `cli/draft.ts` 是否完全废弃，还是保留作为 thin wrapper？
   - **裁决：保留为 thin wrapper**，代码量不超过 20 行，只负责解析命令行参数和调用 `arsenals/forge.ts`

2. Port 的注入点在哪里？CLI 还是 Daemon？
   - **裁决：都在 Runtime 层**，CLI 和 Daemon 都是 Runtime 的入口，负责实例化 Infra 和 Arsenal，并将其组装（注入）到 Kernel Processor 中

3. `resolveBuiltinPart` 逻辑是否需要保留？
   - **裁决：逻辑保留，位置迁移**，Builtin 只是"内存版的 Arsenal"，`resolveBuiltinPart` 是 `PartPort` 实现的一部分，对 Kernel 透明