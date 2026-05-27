## ADDED Requirements

### Requirement: ProbeDefinitionSchema 正确校验合法定义

ProbeDefinitionSchema SHALL 接受符合以下结构的定义格式：
- `type`: 必须是 `fs_exists`、`fs_content_match` 或 `exec_exit_zero` 之一
- `description`: 非空字符串
- `parameters`: 非空数组，每个元素包含 name、type、description

#### Scenario: 合法 fs_exists Definition 通过校验
- **WHEN** 传入 `{ type: 'fs_exists', description: '检查文件存在', parameters: [{ name: 'path', type: 'string', description: '文件路径' }] }`
- **THEN** `ProbeDefinitionSchema.parse()` 返回解析结果

#### Scenario: 合法 fs_content_match Definition 通过校验
- **WHEN** 传入 `{ type: 'fs_content_match', description: '检查文件内容', parameters: [{ name: 'path', type: 'string', description: '文件路径' }, { name: 'pattern', type: 'string', description: '正则模式' }] }`
- **THEN** `ProbeDefinitionSchema.parse()` 返回解析结果

#### Scenario: 合法 exec_exit_zero Definition 通过校验
- **WHEN** 传入 `{ type: 'exec_exit_zero', description: '检查命令成功', parameters: [{ name: 'command', type: 'string', description: '命令' }] }`
- **THEN** `ProbeDefinitionSchema.parse()` 返回解析结果

### Requirement: ProbeDefinitionSchema 拒绝非法定义

ProbeDefinitionSchema SHALL 拒绝以下格式：

#### Scenario: 缺少 description 时抛出异常
- **WHEN** 传入 `{ type: 'fs_exists', parameters: [{ name: 'path', type: 'string', description: '路径' }] }`
- **THEN** `ProbeDefinitionSchema.parse()` 抛出 Zod 异常

#### Scenario: 缺少 parameters[x].description 时抛出异常
- **WHEN** 传入 `{ type: 'fs_exists', description: '检查', parameters: [{ name: 'path', type: 'string' }] }`（缺 description）
- **THEN** `ProbeDefinitionSchema.parse()` 抛出 Zod 异常

#### Scenario: 使用 params 而非 parameters 时抛出异常（拒绝 Invocation 格式）
- **WHEN** 传入 `{ type: 'fs_exists', params: { path: '/foo' } }`
- **THEN** `ProbeDefinitionSchema.parse()` 抛出 Zod 异常

#### Scenario: 未知 type 时抛出异常
- **WHEN** 传入 `{ type: 'unknown_type', description: '测试', parameters: [] }`
- **THEN** `ProbeDefinitionSchema.parse()` 抛出 Zod 异常

### Requirement: ProbeInvocationSchema 正确校验合法调用

ProbeInvocationSchema SHALL 接受符合以下结构的调用格式：
- `type`: 必须是 `fs_exists`、`fs_content_match` 或 `exec_exit_zero` 之一
- `params`: 包含对应 type 所需的参数

#### Scenario: 合法 fs_exists Invocation 通过校验
- **WHEN** 传入 `{ type: 'fs_exists', params: { path: '/foo/bar' } }`
- **THEN** `ProbeInvocationSchema.parse()` 返回解析结果

#### Scenario: 合法 fs_content_match Invocation 通过校验
- **WHEN** 传入 `{ type: 'fs_content_match', params: { path: '/foo', pattern: '*.js' } }`
- **THEN** `ProbeInvocationSchema.parse()` 返回解析结果

#### Scenario: 合法 exec_exit_zero Invocation 通过校验
- **WHEN** 传入 `{ type: 'exec_exit_zero', params: { command: 'npm test' } }`
- **THEN** `ProbeInvocationSchema.parse()` 返回解析结果

### Requirement: ProbeInvocationSchema 拒绝非法调用

ProbeInvocationSchema SHALL 拒绝以下格式：

#### Scenario: 使用 parameters 而非 params 时抛出异常（拒绝 Definition 格式）
- **WHEN** 传入 `{ type: 'fs_exists', description: '检查', parameters: [{ name: 'path', type: 'string', description: '路径' }] }`
- **THEN** `ProbeInvocationSchema.parse()` 抛出 Zod 异常

#### Scenario: 缺少 params.path 时抛出异常
- **WHEN** 传入 `{ type: 'fs_exists', params: {} }`
- **THEN** `ProbeInvocationSchema.parse()` 抛出 Zod 异常

### Requirement: Definition 和 Invocation 格式互斥

DefinitionSchema SHALL NOT 接受 Invocation 格式，反之亦然。

#### Scenario: DefinitionSchema 拒绝 Invocation 格式
- **WHEN** 用 ProbeInvocationSchema 的合法输入调用 ProbeDefinitionSchema.parse()
- **THEN** 抛出 Zod 异常

#### Scenario: InvocationSchema 拒绝 Definition 格式
- **WHEN** 用 ProbeDefinitionSchema 的合法输入调用 ProbeInvocationSchema.parse()
- **THEN** 抛出 Zod 异常

### Requirement: ProofDefinitionSchema 正确校验合法定义

ProofDefinitionSchema SHALL 接受符合以下结构的定义格式：
- `target`: 包含 description
- `spec`: 包含 description
- `probes`: 非空数组，每个元素包含 ref 和 description

#### Scenario: 合法 Proof Definition 通过校验
- **WHEN** 传入 `{ target: { description: '验证构建成功' }, spec: { description: '构建必须成功' }, probes: [{ ref: 'exec_exit_zero', description: '检查命令' }] }`
- **THEN** `ProofDefinitionSchema.parse()` 返回解析结果

#### Scenario: 缺少 probes 数组时抛出异常
- **WHEN** 传入 `{ target: { description: '测试' }, spec: { description: '测试' } }`（缺 probes）
- **THEN** `ProofDefinitionSchema.parse()` 抛出 Zod 异常

### Requirement: ProofInvocationSchema 正确校验合法调用

ProofInvocationSchema SHALL 接受符合以下结构的调用格式：
- `name`: 非空字符串
- `target`: 非空字符串
- `probeRefs`: 可选数组

#### Scenario: 合法 Proof Invocation 通过校验
- **WHEN** 传入 `{ name: 'build-success', target: '构建成功' }`
- **THEN** `ProofInvocationSchema.parse()` 返回解析结果

### Requirement: StageDefinitionSchema 正确校验合法定义

StageDefinitionSchema SHALL 接受符合以下结构的定义格式：
- `id`: 非空字符串
- `name`: 非空字符串
- `description`: 非空字符串
- `proof`: 非空字符串
- `deps`: 可选数组

#### Scenario: 合法 Stage Definition 通过校验
- **WHEN** 传入 `{ id: 'build-stage', name: '构建', description: '执行构建', proof: 'build-proof' }`
- **THEN** `StageDefinitionSchema.parse()` 返回解析结果

#### Scenario: 缺少任一必填字段时抛出异常
- **WHEN** 传入 `{ id: 'build-stage', name: '构建' }`（缺 description 和 proof）
- **THEN** `StageDefinitionSchema.parse()` 抛出 Zod 异常

### Requirement: StageInvocationSchema 正确校验合法调用

StageInvocationSchema SHALL 接受符合以下结构的调用格式：
- `name`: 非空字符串
- `proof`: 非空字符串
- `description`: 可选字符串
- `deps`: 可选数组

#### Scenario: 合法 Stage Invocation 通过校验
- **WHEN** 传入 `{ name: 'build', proof: 'build-proof' }`
- **THEN** `StageInvocationSchema.parse()` 返回解析结果