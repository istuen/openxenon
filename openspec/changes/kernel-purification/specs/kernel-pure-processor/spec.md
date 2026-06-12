## ADDED Requirements

### Requirement: Kernel 提供通用谓词求值器

Kernel SHALL 提供 `evaluatePredicate(expected, actual, operator)` 函数，用于纯逻辑比对，不含任何探针类型特定知识。

#### Scenario: 相等判定
- **WHEN** 调用 `evaluatePredicate(true, true, 'eq')`
- **THEN** 返回 `{ passed: true, message: 'Equal' }`

#### Scenario: 不等判定
- **WHEN** 调用 `evaluatePredicate(0, 1, 'neq')`
- **THEN** 返回 `{ passed: true, message: 'Not equal' }`

#### Scenario: 正则匹配
- **WHEN** 调用 `evaluatePredicate('foo.*', 'foobar', 'regex')`
- **THEN** 返回 `{ passed: true, ... }`

#### Scenario: 包含判定
- **WHEN** 调用 `evaluatePredicate('bar', 'foobar', 'contains')`
- **THEN** 返回 `{ passed: true, ... }`

### Requirement: Kernel 提供 DAG 拓扑排序器

Kernel SHALL 提供 `topologicalSort(nodes, edges)` 函数，对有向无环图进行拓扑排序，并检测环。

#### Scenario: 正常拓扑排序
- **WHEN** 对节点 `['a', 'b', 'c']` 和边 `[{from:'a', to:'b'}, {from:'b', to:'c'}]` 排序
- **THEN** 返回 `['a', 'b', 'c']`

#### Scenario: 环检测
- **WHEN** 对包含环的图进行排序
- **THEN** 返回错误 `Cycle detected`

### Requirement: Kernel 提供 Schema 结构校验器

Kernel SHALL 提供 `validateSchema(shape, actual)` 函数，校验数据是否符合结构约束。

#### Scenario: 结构校验通过
- **WHEN** 校验 `{ type: 'object', properties: {...} }` 与实际数据匹配
- **THEN** 返回 `{ valid: true }`

#### Scenario: 类型不匹配
- **WHEN** 期望 `string` 但收到 `number`
- **THEN** 返回 `{ valid: false, error: 'Type mismatch' }`

### Requirement: Kernel 提供数据变换管道

Kernel SHALL 提供 `transformData(source, mapping)` 函数，根据映射规则对数据进行变换。

#### Scenario: 字段映射
- **WHEN** 源数据 `{ a: 1 }` 通过映射 `{ b: 'a' }` 变换
- **THEN** 返回 `{ b: 1 }`

### Requirement: Kernel 零 I/O 约束

Kernel SHALL 不执行任何 I/O 操作（文件系统、网络、进程等）。

#### Scenario: 无 fs 导入
- **WHEN** 检查 Kernel 源代码
- **THEN** 不存在任何 `from 'fs'` 或 `from 'path'` 导入

#### Scenario: 无 process 导入
- **WHEN** 检查 Kernel 源代码
- **THEN** 不存在任何 `from 'process'` 或 `from 'child_process'` 导入