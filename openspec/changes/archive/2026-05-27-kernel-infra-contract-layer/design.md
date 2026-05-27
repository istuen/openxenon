## Context

当前架构中，Kernel（纯函数层）与 Infra（副作用层）的接口定义分散在多个文件中：

**问题现状：**

```
kernel/probes/evaluator.ts  → 定义 ProbeStrategy, defaultStrategies, ProbeEvaluator
kernel/probes/namespace.ts  → 定义 ProbeNamespace, ParsedProbeRef
kernel/schemas/probe.ts     → 定义 Zod schemas
infra/probes/index.ts       → 定义 ProbeHandler, probeHandlers
infra/loader.ts             → 重复定义 ProbeNamespace, ParsedProbeRef
```

类型重复定义：`ProbeObservation` 在 `kernel/probes/evaluator.ts:16` 和 `infra/probes/index.ts:9` 各自定义，内容几乎一致但互不引用。

全局状态问题：`kernel/probes/evaluator.ts:199` 存在 `let globalEvaluator`，违反纯函数设计原则。

## Goals / Non-Goals

**Goals:**
- 建立 `kernel/contracts/` 目录作为 Kernel 与 Infra 之间的唯一契约层
- 统一 `ProbeObservation` 接口定义，消除重复
- 显式化 `ProbeStrategy ↔ ProbeHandler` 配对关系
- 移除 Kernel 层的全局可变状态
- 消除 `infra/loader.ts` 中对 Kernel 已有类型的重复定义

**Non-Goals:**
- 不改变 Probe 的实际执行逻辑（Infra 仍执行 fs 操作，Kernel 仍执行判断）
- 不引入新的 Probe 类型
- 不修改 Daemon/Core 层的调度逻辑

## Decisions

### Decision 1: 建立 kernel/contracts/probe.ts 作为核心契约

**选择：**
在 `src/kernel/contracts/probe.ts` 中定义所有跨层接口：

```typescript
// kernel/contracts/probe.ts

// 观察结果 - Infra 层产生，Kernel 层消费
export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
}

// 评判策略 - Kernel 内置，纯函数
export type ProbeStrategy = (observation: ProbeObservation, params: Record<string, unknown>) => ProbeVerdict

// 执行处理器 - Infra 实现，有副作用
export type ProbeHandler = (params: Record<string, unknown>, context: ProbeContext) => Promise<ProbeObservation>

// 配对规范：每个 Handler 产生特定类型的 Observation，由对应 Strategy 评判
export interface ProbeStrategyMapping {
  handler: string  // 'fs_exists'
  strategy: string // 'fs_exists'
  observationType: string // 'fs_exists'
}
```

**替代方案考虑：**
- 将契约放在 `infra/` 下：违反架构原则（Kernel 不应依赖 Infra），不可行
- 独立的 `contracts/` 顶层目录：增加目录层级，不必要
- 结论：`kernel/contracts/` 是最优解，Infra 通过相对路径引用 Kernel 的契约

### Decision 2: 移除 globalEvaluator，改用依赖注入

**选择：**
将 `ProbeEvaluator` 作为参数传入，而非全局单例：

```typescript
// Before (全局状态)
export function evaluateProbe(def: ProbeDefinition, obs: ProbeObservation): ProbeVerdict {
  return globalEvaluator.evaluate(obs, def.params)
}

// After (依赖注入)
export function evaluateProbe(
  def: ProbeDefinition,
  obs: ProbeObservation,
  evaluator: ProbeEvaluator = defaultEvaluator
): ProbeVerdict {
  return evaluator.evaluate(obs, def.params)
}
```

**替代方案考虑：**
- 保持全局状态：通过 `setGlobalProbeEvaluator` 修改，违反纯函数原则
- 使用 ThreadLocal 或类似机制：增加复杂度，收益不明显
- 结论：依赖注入是最佳平衡

### Decision 3: 统一 ProbeContext 定义位置

**选择：**
`ProbeContext` 保留在 Infra 层（因为它包含 `projectRoot` 等 I/O 相关上下文），仅将接口契约共享：

```typescript
// kernel/contracts/probe.ts
export interface ProbeContextBase {
  projectRoot: string
}

// infra/probes/fs-exists.ts
import type { ProbeContextBase } from '../../kernel/contracts/probe'
export interface ProbeContext extends ProbeContextBase {
  // Infra 特有扩展
}
```

### Decision 4: 探索模块类型转换重构

**选择：**
在 Kernel 层定义转换函数，Infra 层调用：

```typescript
// kernel/explore/converters.ts
export function toExplorationContext(raw: RawExplorationContext): ExplorationContext {
  return {
    projectFiles: raw.projectFiles,
    projectDirs: raw.projectDirs.map(toProjectDir),
    probes: raw.probes.map(toProbeInfo),
    // ...
  }
}

// infra/explore/collector.ts
import { toExplorationContext } from '../../kernel/explore/converters'

export async function collectContext(projectRoot: string): Promise<ExplorationContext> {
  const raw = await collectRawContext(projectRoot)
  return toExplorationContext(raw)  // Infra 调用 Kernel 的转换函数
}
```

**替代方案考虑：**
- Infra 直接返回 Kernel 类型：Infra 层需引入 Kernel 类型定义，增加耦合
- 使用 `as` 类型断言（现状）：脆弱，编译期无法检查
- 结论：Kernel 提供转换函数，Infra 调用，是最优解

## Risks / Trade-offs

[Risk: 迁移期间两类接口并存]
→ Mitigation: 使用 `kernel/contracts/` 作为唯一真实源，原有定义逐步迁移，迁移完成后删除

[Risk: 依赖注入增加调用方复杂度]
→ Mitigation: 提供 `defaultEvaluator` 默认参数，保持向后兼容

[Risk: 探索模块重构影响其他模块]
→ Mitigation: 先完成 contracts 层，再逐步迁移，每次迁移后运行测试

---

## Appendix: Arsenal-BUILTIN-Infra 依赖约束（三方 AI 审查结论）

### 核心洞察

**BUILTIN 只是"内存版 Arsenal"。** 在 OXN 的业务语义中，`BUILTIN`、`PROJECT`、`GLOBAL` 本质上都是资产的**作用域**，唯一的区别是存储介质不同：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Arsenal 三层作用域                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Project Arsenal   (.openxenon/arsenals/*)                    │
│     └─ 磁盘读写，依赖 Infra                                       │
│                                                                  │
│  2. Global Arsenal   (~/.openxenon/arsenals/*)                  │
│     └─ 磁盘读写，依赖 Infra                                       │
│                                                                  │
│  3. Builtin Arsenal  (代码中的常量 BUILTIN_*)                    │
│     └─ 纯内存，不依赖 Infra                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 禁止的依赖方向

```
❌ Work → BUILTIN_*      (执行者不直接接触内置数据)
❌ Work → Infra          (执行者不直接接触物理层)
❌ Infra → BUILTIN_*     (物理层不包含业务数据)
❌ DSL → Arsenal         (L1 不依赖 L2)
```

### 正确架构

```
L3 Runtime (CLI/Daemon)
    │
    ├──▶ L2 Work (执行者)
    │         └── 只依赖 ArsenalResolver，不知道 BUILTIN 存在
    │
    ├──▶ L2 Arsenal (寻址者)
    │         ├── BuiltinArsenal (内存版，不依赖 Infra)
    │         ├── FileBasedArsenal (磁盘版，依赖 Infra)
    │         └── ArsenalResolver (优先级链: Project > Global > Builtin)
    │
    └──▶ L1 Infra (物理做功)
              └── 纯净: readFile/writeFile/scanDir，无业务数据
```

### Decision 5: BUILTIN_* 必须留在 Arsenal 层

**选择：**
`BUILTIN_*` 定义在 `src/arsenals/builtin.ts`，封装为 `BuiltinArsenal`：

```typescript
// arsenals/builtin.ts
export const BUILTIN_PARTS: Record<string, PartDefinition> = { ... }
export const BUILTIN_PROBES: Record<string, ProbeDefinition> = { ... }

// arsenals/builtin-arsenal.ts
class BuiltinArsenal implements Arsenal {
  get(type, name) {
    if (type === 'parts') return BUILTIN_PARTS[name]
    if (type === 'probes') return BUILTIN_PROBES[name]
    return null
  }
  list(type) { ... }
  create() { throw new Error('Builtin arsenal is read-only') }
}
```

**禁止：**
- `Infra` 层不得 import `arsenals/builtin.ts`
- `Infra` 层不得包含任何 BUILTIN_* 常量

### Decision 6: preloadCompileDependencies 必须使用依赖注入

**选择：**
`preloadCompileDependencies` 所需的 BUILTIN_* 由调用者注入：

```typescript
// Before (违反依赖方向)
export function preloadCompileDependencies(projectBoundary: string) {
  const { BUILTIN_PROBES, BUILTIN_PARTS } = require('../arsenals/builtin')  // ❌
  // ...
}

// After (依赖注入)
export function preloadCompileDependencies(
  projectBoundary: string,
  builtinParts: BuiltinParts,
  builtinProbes: BuiltinProbes
): CompileDependencies {
  // 直接使用注入的参数，不依赖 Arsenal
}
```

**调用点 (L3 Runtime)：**
```typescript
// L3 Runtime 装配
const deps = preloadCompileDependencies(
  boundary,
  BUILTIN_PARTS,   // Arsenal 提供
  BUILTIN_PROBES    // Arsenal 提供
)
```

### Decision 7: Work 通过 ArsenalResolver 获取资产

**选择：**
Work 只向 ArsenalResolver 要数据，不知道资产来自哪个作用域：

```typescript
// Work 层
class WorkEngine {
  constructor(private resolver: ArsenalResolver) {}

  async resolvePart(name: string): Promise<PartDefinition> {
    const asset = this.resolver.resolve('parts', name)
    if (!asset) throw new Error(`Part not found: ${name}`)
    return parsePartDefinition(asset.content)
  }
}
```

**ArsenalResolver 优先级实现：**
```typescript
class ArsenalResolver {
  constructor(private scopes: Arsenal[]) {}  // [ProjectArsenal, GlobalArsenal, BuiltinArsenal]

  resolve(type, name): StandardAsset | null {
    for (const scope of this.scopes) {
      const asset = scope.get(type, name)
      if (asset) return asset
    }
    return null
  }
}
```

## Open Questions

1. `infra/loader.ts` 中的 `parseProbeNamespace` 是否需要迁移？它是被 loader 自己使用，不是跨层接口
2. `kernel/probes/namespace.ts` 是否保留在原处还是合并到 `kernel/contracts/`？建议保留在原处，`namespace.ts` 偏向探针命名空间解析，与契约接口不同
