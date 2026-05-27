# Kernel Purity Specification

## ADDED Requirements

### Requirement: Kernel 层不得包含全局可变状态

Kernel 层（`src/kernel/` 目录下的所有模块）不得包含任何可变全局状态。包括但不限于：

- 禁止使用 `let` 声明的模块级变量
- 禁止使用 `var` 声明的变量
- 禁止使用可修改的 `global` 对象属性
- 禁止使用单例模式中的可修改状态

#### Scenario: 探针评判器不使用全局状态
- **WHEN** `kernel/probes/evaluator.ts` 中的 `evaluateProbe` 被调用
- **THEN** 不依赖任何模块级 `let` 变量

#### Scenario: DAG 化简器不使用全局状态
- **WHEN** `kernel/` 下的任何模块执行图计算
- **THEN** 所有中间状态通过函数参数传递，不使用全局变量存储

### Requirement: Kernel 层不得执行任何 I/O 操作

Kernel 层绝对禁止执行以下操作：

- 文件系统读写（`fs.readFileSync`, `fs.writeFileSync` 等）
- 进程执行（`child_process.spawn`, `exec` 等）
- 网络请求（`http.request`, `socket` 等）
- 事件发射（`EventEmitter` 触发事件）

#### Scenario: 探针评判不触发文件读取
- **WHEN** `evaluateProbe` 执行
- **THEN** 不调用任何文件系统相关函数

#### Scenario: 阶段缩减不产生副作用
- **WHEN** `reduceStageVerdict` 执行
- **THEN** 不产生任何 I/O 操作

### Requirement: Kernel 函数必须引用透明

Kernel 层的所有导出函数必须满足引用透明性：相同参数永远返回相同结果。

#### Scenario: 纯函数返回结果可预测
- **WHEN** 调用 `evaluateProbe(def1, obs1)`
- **THEN** 多次调用永远返回相同 verdict

#### Scenario: 策略注册后全局可观测
- **WHEN** 调用 `registerProbeStrategy` 修改策略映射
- **THEN** 这是一个副作用操作，不应在 Kernel 内部发生

### Requirement: 依赖注入替代全局单例

对于需要可配置行为的场景（如 `ProbeEvaluator`），必须使用依赖注入模式：

```typescript
// 推荐模式
function evaluateProbe(
  def: ProbeDefinition,
  obs: ProbeObservation,
  evaluator: ProbeEvaluator = defaultEvaluator
): ProbeVerdict {
  return evaluator.evaluate(obs, def.params)
}

// 不推荐模式（禁止）
let globalEvaluator: ProbeEvaluator  // 模块级可变状态
```

#### Scenario: 探针评判使用注入的 evaluator
- **WHEN** `evaluateProbe` 被调用
- **THEN** 使用传入的 evaluator 参数，不读取全局状态

#### Scenario: 默认 evaluator 保持向后兼容
- **WHEN** 调用 `evaluateProbe(def, obs)` 不传入第三个参数
- **THEN** 使用预定义的 `defaultEvaluator` 实例
