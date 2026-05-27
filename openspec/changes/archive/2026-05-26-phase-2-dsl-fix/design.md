## Context

当前 `oxn-dsl/compiler/oxn-adapter.ts` (L1 编译器) 存在两处越界依赖：

1. **work/part-resolver**: 编译器依赖了 L2 执行域的解析器，做了运行时链接的活
2. **kernel/lib/project**: 编译器依赖了应用层概念 `getProjectBoundaryPath()`

这违反了 DSL "纯翻译器" 的设计原则。编译器应该只负责将 `.oxn` 文本翻译为 JSON，不知道也不关心这个 JSON 将来怎么被调度和执行。

## Goals / Non-Goals

**Goals:**
- 移除 DSL 对 work/part-resolver 的直接依赖
- 移除 DSL 对 kernel/lib/project 的直接依赖
- DSL 只依赖 Schema 类型 (L0)，不依赖业务实现

**Non-Goals:**
- 不改变 OxnKernelAdapter 的输出格式 (FrozenBlueprint)
- 不改变 DSL 编译管线的整体结构
- 不改变 Work 域的 Part 解析职责

## Decisions

### Decision 1: 引入 IPartResolver 接口

**选择**: DSL 定义 `IPartResolver` 接口，调用方通过依赖注入提供实现

**理由**:
- DSL 不该知道 Part 怎么解析，只声明需要的能力
- 调用方 (L3 CLI) 在编排时注入 resolver
- 保持了 DSL 的纯净性和可测试性

**接口设计**:
```typescript
interface IPartResolver {
  resolve(ref: string, boundary: string): PartResolution | null
}
```

### Decision 2: Project Boundary 通过 Context 传入

**选择**: 移除 `getProjectBoundaryPath()` 调用，改为 `AdapterContext.boundary` 参数

**理由**:
- DSL 不该知道 "project boundary" 概念
- 调用方负责解析边界，结果通过 context 传入
- 符合"数据由外部注入，DSL 只做翻译"的原则

### Decision 3: 保持现有 DAG 校验

**选择**: 保留 `validateDagTopology()` 调用，只迁移其位置

**理由**:
- DAG 校验是编译期的语义检查，属于 L1 DSL 的职责
- `DagNode` 类型属于 Schema (L0)，依赖合法
- 不改变校验逻辑，只移除越界依赖

## Risks / Trade-offs

[风险]: 依赖注入会增加调用方的复杂度
→ 缓解: L3 CLI 可以提供默认 resolver，保持向后兼容

[风险]: OxnKernelAdapter 的构造函数签名变化
→ 缓解: 提供可选参数，向后兼容现有调用

[风险]: part-resolver 从 kernel 移除后可能被 DSL 误用
→ 缓解: 通过接口隔离，明确边界

## Migration Plan

1. 在 `oxn-dsl/compiler/oxn-adapter.ts` 定义 `IPartResolver` 接口
2. 修改 `OxnKernelAdapter` 构造函数，接受可选的 `IPartResolver`
3. 修改 `adapt()` 方法，从 `ctx.partResolver` 获取解析器
4. 修改所有调用点 (主要在 CLI)，传入 resolver 实例
5. 移除 `import { resolvePartRef }` 和 `import { getProjectBoundaryPath }`

**回滚策略**: 如果出现问题，可以快速回滚到直接依赖版本，因为接口设计是向后兼容的。