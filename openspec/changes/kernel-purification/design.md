## Context

当前 Kernel 层（`src/kernel/`）包含 4 个带有业务语义的 Processor 文件：

| 文件 | 业务语义 |
|------|---------|
| `processors/probes/evaluator.ts` | `fs_exists`、`shell_exec` 等探针类型判定逻辑 |
| `processors/blueprint-compiler.ts` | 模板渲染 `${params.x}`、`{{}}` 语法、Slot 解析 |
| `processors/task-trace.ts` | `TASK_START`、`PART_COMPLETE` 等事件及状态机 |
| `processors/policies/execution-policy.ts` | Production/Sandbox 执行策略 |

这违反了架构公理"Kernel 是兰姆达真空"——Kernel 应仅包含纯逻辑运算，不含任何 OpenXenon 领域概念。

同时，`frozen.json` 当前作为"执行前防篡改锁"使用，但在 CLI CRUD 约束下 AI 已被限制在结构化指令内，该定位需要调整为"事后不可变快照"。

## Goals / Non-Goals

**Goals:**
- 将所有业务语义从 Kernel 剥离，迁移至对应层级（L1 OXN DSL、L2 Work）
- Kernel 剩余组件均为纯逻辑运算（无 I/O、无领域语义）
- 重构 frozen.json 为执行后快照，作为工作流回溯锚点
- 确立 Kernel Processor 的最终形态：通用谓词求值器、DAG 拓扑排序器、Schema 校验器、数据变换管道

**Non-Goals:**
- 不修改 Kernel 的 Contract 层（接口定义保持不变）
- 不修改 Kernel 的 Schema 层（数据结构定义保持不变）
- 不修改 Infra 层（物理操作层保持不变）
- 不改变 L0-L3 层级之间的调用关系

## Decisions

### Decision 1: 探针评判逻辑迁移至 L2 Work

**选择**: `probes/evaluator.ts` 整体迁移至 `src/work/probe-evaluator.ts`

**理由**:
- 探针判定规则（exitcode=0 为成功、files.length>0 为 PASS）是业务逻辑，不是纯数学
- L2 Work 是任务执行域，负责根据探针类型调用 Infra 获取物理观测值，然后执行判定
- Kernel 仅保留通用谓词求值：`evaluate(expected, actual, operator) → Verdict`

**替代考虑**:
- 拆分到 L1 Infra + L2：Infra 已有 `infra/probes/` 执行物理动作，再拆分判定规则会造成职责重叠

### Decision 2: 蓝图编译迁移至 L1 OXN DSL

**选择**: `blueprint-compiler.ts` 迁移至 `src/oxn-dsl/compiler.ts`

**理由**:
- 模板渲染（`{{params.x}}`、`${task.id}`）和 Slot 解析是 DSL 语义
- L1 OXN DSL 职责："将带有语法的文本映射为纯数据结构"
- L2 Arsenal/Work 只关心"编译好的纯数据"，不关心语法糖

### Decision 3: 任务状态机迁移至 L2 Work

**选择**: `task-trace.ts` 迁移至 `src/work/task-trace.ts`

**理由**:
- 状态机（Pending→Running→Complete/Failed）是任务实例的生命周期管理
- 这是最典型的 L2 领域逻辑：Work 管理实例的执行和状态

### Decision 4: 执行策略迁移至 L2 Work

**选择**: `execution-policy.ts` 迁移至 `src/work/policies/`

**理由**:
- Production/Sandbox 策略是业务规则（终止条件、删除规则、draft 资产权限）
- L3 Runtime（CLI/Daemon）在启动时将策略配置注入给 L2
- L2 Work 在调度时应用策略

### Decision 5: frozen.json 范式转变

**选择**: 从"事前防篡改锁"转变为"事后不可变快照"

**理由**:
- CLI CRUD 约束下 AI 被限制在结构化指令内，`.oxn` 本身安全
- 事前冻结无法预知执行过程中的 Artifact，无法动态调整
- 事后快照可作为回溯锚点，追踪"从哪一步开始漂移"

## Risks / Trade-offs

[Risk] 迁移过程中可能破坏现有调用链
→ Mitigation: 保持接口契约不变，新位置提供 re-export 兼容层

[Risk] Kernel 剩余组件是否足够支撑上层调用
→ Mitigation: 验证 DAG 拓扑排序、Schema 校验是核心依赖，无需探针策略

[Risk] frozen.json 新范式需要 CLI/Daemon 协同修改
→ Mitigation: 作为独立 Capability 逐步推行，不影响现有执行路径

## Migration Plan

### Phase 1: 准备阶段
1. 创建 `src/work/probe-evaluator.ts`、`src/work/task-trace.ts`、`src/work/policies/` 目标位置
2. 创建 `src/oxn-dsl/compiler.ts` 目标位置

### Phase 2: 迁移执行
1. 迁移 `probes/evaluator.ts` → `work/probe-evaluator.ts`
2. 迁移 `blueprint-compiler.ts` → `oxn-dsl/compiler.ts`
3. 迁移 `task-trace.ts` → `work/task-trace.ts`
4. 迁移 `execution-policy.ts` → `work/policies/`

### Phase 3: 重构 Kernel
1. 实现 `evaluatePredicate(expected, actual, operator)` 通用谓词求值器
2. 验证 DAG 拓扑排序器独立性
3. 实现 Schema 校验器
4. 实现数据变换管道

### Phase 4: 快照范式
1. 修改 Work 执行流程：先产出 Artifact，再生成 frozen.json
2. 更新 CLI/Daemon 交互协议

## Open Questions

1. `kernel/index.ts` 的 export 需要清理，哪些保留、哪些重定向？
2. 迁移后 Kernel 的 `schemas/` 目录是否需要重组？
3. frozen.json 新范式下的验证流程如何与现有探针验证衔接？