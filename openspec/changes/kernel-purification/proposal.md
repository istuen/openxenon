## Why

当前 Kernel 层混入了业务语义（`probes/evaluator.ts`、`blueprint-compiler.ts`、`task-trace.ts`、`policies/execution-policy.ts`），违反了"Kernel 是兰姆达真空"的架构公理。这些文件包含探针判定规则、蓝图编译逻辑、任务状态机、执行策略等 OpenXenon 领域概念，使 Kernel 从"纯逻辑引擎"退化为"带业务偏好的特定流水线"。

同时，`frozen.json` 的定位需要从"事前防篡改锁"转变为"事后不可变快照"，与 CLI CRUD 约束下的 AI 行为模型对齐。

## What Changes

1. **迁移探针评判逻辑至 L2 Work**
   - `probes/evaluator.ts` 中的 `fs_exists`、`shell_exec` 等策略下沉至 `work/probe-evaluator.ts`
   - Kernel 仅保留通用谓词求值器：`evaluate(expected, actual, operator) → Verdict`

2. **迁移蓝图编译至 L1 OXN DSL**
   - `blueprint-compiler.ts` 中的模板渲染 `${params.x}`、`{{}}` 语法、Slot 解析迁移至 `oxn-dsl/compiler.ts`
   - Kernel 仅保留纯数据结构变换

3. **迁移任务状态机至 L2 Work**
   - `task-trace.ts` 中的 `TASK_START`、`PART_COMPLETE` 等事件及状态迁移下沉至 `work/task-trace.ts`

4. **迁移执行策略至 L2 Work**
   - `policies/execution-policy.ts` 中的 Production/Sandbox 策略下沉至 `work/policies/`

5. **重构 frozen.json 范式**
   - 从"执行前生成 frozen.json"转变为"执行后生成不可变快照"
   - 作为工作流执行的回溯锚点

6. **Kernel Processor 层重构**
   - 剩余纯逻辑组件：通用谓词求值器、DAG 拓扑排序器、Schema 校验器、数据变换管道

## Capabilities

### New Capabilities

- `kernel-pure-processor`: Kernel 纯处理器能力，将业务语义剥离后的通用逻辑组件
- `task-state-machine`: 任务状态机能力，管理任务实例的生命周期（Pending→Running→Complete/Failed）
- `probe-judgment-logic`: 探针评判逻辑能力，基于物理观测值和期望规则的判定执行
- `frozen-snapshot`: frozen 快照能力，将执行结果锚点化为不可变历史记录

### Modified Capabilities

- `blueprint-compilation`: 模板渲染和 Slot 解析从 Kernel 迁移至 OXN DSL 层

## Impact

**迁移文件**:
- `src/kernel/processors/probes/evaluator.ts` → `src/work/probe-evaluator.ts`
- `src/kernel/processors/blueprint-compiler.ts` → `src/oxn-dsl/compiler.ts`
- `src/kernel/processors/task-trace.ts` → `src/work/task-trace.ts`
- `src/kernel/processors/policies/execution-policy.ts` → `src/work/policies/`

**Kernel 重构**:
- 移除所有探针类型特定策略
- 剩余 `evaluatePredicate`、`topologicalSort`、`validateSchema`、`transformData`

**架构约束**:
- L0 Kernel 禁止任何 I/O 操作
- L1 OXN DSL 负责语法文本 ↔ 纯数据结构的转换
- L2 Work 负责运行时业务逻辑和状态管理