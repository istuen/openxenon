# Kernel（纯函数层）

Kernel 是 OpenXenon 的纯逻辑判定层。

## 定义

Kernel 是纯函数层，零副作用，只做逻辑判定。

## 设计约束

| 约束 | 说明 |
|------|------|
| **零副作用** | 不执行任何 I/O 操作 |
| **纯函数** | 相同输入永远产生相同输出 |
| **无状态** | 不维护任何运行时状态 |
| **可测试** | 可独立单元测试 |

## 核心职责

### Probe 评判

```typescript
function evaluateProbe(
  definition: ProbeDefinition,
  observation: ProbeObservation
): ProbeVerdict {
  // 纯函数判定
  // 不理解"文件"、"命令"的语义
  // 只比较符号
}
```

### DAG 归约

```typescript
function reduceDAG(
  dag: DAGGraph,
  stageId: string,
  verdict: StageVerdict
): DAGGraph {
  // 纯图论推导
  // 解锁下游节点
  // 返回新的不可变 DAG 对象
}
```

### Stage 归约

```typescript
function reduceStageVerdict(
  probeResults: ProbeResult[],
  policy: 'AND' | 'OR'
): StageVerdict {
  if (policy === 'AND') {
    return probeResults.every(r => r.passed) ? 'PASSED' : 'FAILED'
  }
  if (policy === 'OR') {
    return probeResults.some(r => r.passed) ? 'PASSED' : 'FAILED'
  }
}
```

## 为什么必须是纯函数？

### 1. 可测试性

纯函数可独立单元测试，无需模拟文件系统：

```typescript
// 测试 Probe 评判
const result = evaluateProbe(
  { type: 'fs_exists', pattern: 'test.txt' },
  { files: ['test.txt'] }
)
expect(result.passed).toBe(true)
```

### 2. 可复现性

相同输入永远产生相同输出，判定结果可预测：

```typescript
// 任何时间、任何环境执行
evaluateProbe(def, obs)  // → 相同结果
```

### 3. 无副作用

Kernel 不触碰文件系统，不会意外修改文件：

```typescript
// Kernel 绝对不能有这些操作
fs.readFileSync()    // ❌
process.exec()       // ❌
socket.send()        // ❌
```

## Kernel 绝对禁止的操作

| 操作 | 原因 |
|------|------|
| 文件系统读写 | 会产生副作用 |
| 进程执行 | 会产生副作用 |
| 网络请求 | 会产生副作用 |
| 状态维护 | 破坏纯函数性质 |
| EventEmitter | 破坏被动调用模式 |

## 调用链

```
Daemon/Core Engine
    │
    ├──▶ Infra 执行物理观测
    │         │
    │         ▼
    │    observation: ProbeObservation
    │
    └──▶ Kernel 纯函数判定
              │
              ▼
         verdict: ProbeVerdict
```

**关键约束**：

- Kernel **绝对不能**主动调用 Infra
- Kernel **绝对不能**有 EventEmitter
- 所有调用必须是：Core → Infra → Kernel → 返回结果