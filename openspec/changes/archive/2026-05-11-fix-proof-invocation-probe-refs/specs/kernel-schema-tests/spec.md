## MODIFIED Requirements

### Requirement: ProofInvocationSchema 正确校验合法调用

**FROM:**
- `probeRefs`: 可选数组，元素为 string

**TO:**
- `probeRefs`: 可选数组，元素为 ProbeInvocation（包含 type + params）

ProofInvocationSchema SHALL 接受符合以下结构的调用格式：
- `name`: 非空字符串
- `target`: 非空字符串
- `probeRefs`: 可选数组，元素为 ProbeInvocationSchema

#### Scenario: 合法 Proof Invocation 通过校验（无 probeRefs）
- **WHEN** 传入 `{ name: 'build-success', target: '构建成功' }`
- **THEN** `ProofInvocationSchema.parse()` 返回解析结果

#### Scenario: 合法 Proof Invocation 通过校验（带 probeRefs 为 string）
- **WHEN** 传入 `{ name: 'build-success', target: '构建成功', probeRefs: ['exec_exit_zero'] }`
- **THEN** `ProofInvocationSchema.parse()` 抛出 Zod 异常（string 不再被接受）

#### Scenario: 合法 Proof Invocation 通过校验（带内联 ProbeInvocation）
- **WHEN** 传入 `{ name: 'build-success', target: '构建成功', probeRefs: [{ type: 'fs_exists', params: { path: '/foo/bar' } }] }`
- **THEN** `ProofInvocationSchema.parse()` 返回解析结果

#### Scenario: 合法 Proof Invocation 通过校验（带多个内联 ProbeInvocation）
- **WHEN** 传入 `{ name: 'build-success', target: '构建成功', probeRefs: [{ type: 'fs_exists', params: { path: '/foo' } }, { type: 'exec_exit_zero', params: { command: 'npm test' } }] }`
- **THEN** `ProofInvocationSchema.parse()` 返回解析结果

#### Scenario: ProbeInvocation 内包含非法格式时抛出异常
- **WHEN** 传入 `{ name: 'build', target: '构建', probeRefs: [{ type: 'fs_exists', description: '检查', parameters: [] }] }`（使用 Definition 格式）
- **THEN** `ProofInvocationSchema.parse()` 抛出 Zod 异常

### Requirement: ProofDefinitionSchema 保持不变

ProofDefinitionSchema 的 `probes` 字段仍然是 ProbeRefSchema[]（ref + description + params），不因 ProofInvocationSchema 的修改而改变。

#### Scenario: ProofDefinition probes 格式保持 ProbeRefSchema
- **WHEN** 传入 `{ target: { description: '验证构建' }, spec: { description: '构建成功' }, probes: [{ ref: 'exec_exit_zero', description: '检查命令' }] }`
- **THEN** `ProofDefinitionSchema.parse()` 返回解析结果