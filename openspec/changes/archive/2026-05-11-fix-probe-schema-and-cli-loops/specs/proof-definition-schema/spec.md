## ADDED Requirements

### Requirement: Proof Definition Schema Validation
Proof 资产的定义格式 (canonical.yaml / draft.yaml) SHALL 使用 `ProofDefinitionSchema` 进行校验。

### Requirement: Proof Invocation Schema Validation
Proof 资产的调用格式 SHALL 使用 `ProofInvocationSchema` 进行校验。

### Requirement: Proof Structure
Proof 定义格式 SHALL 包含：
- `target`: 目标描述对象，包含 `description` 字段
- `spec`: 规格描述对象，包含 `description` 字段和可选的 `constraints`
- `probes`: Probe 引用数组，字符串类型

### Requirement: Proof Invocation Structure
Proof 调用格式 SHALL 包含：
- `target`: 目标描述对象
- `spec`: 规格描述对象
- `probeRefs`: Probe 调用实例数组，每个元素是 `ProbeInvocation` 类型

### Requirement: Proof Validation Functions
系统 SHALL 提供两个独立的校验函数：
- `validateProofDefinition()`: 用于校验资产定义格式
- `validateProof()`: 用于校验调用格式

#### Scenario: Create Proof Draft with Valid Definition Format
- **WHEN** AI 调用 `oxn forge proof --save '<yaml>' --name test-proof`
- **THEN** `createDraftProof()` 调用 `validateProofDefinition()` 校验成功
- **AND** Draft 文件正确保存到 `.openxenon/arsenals/proofs/`

#### Scenario: Daemon Invokes Proof with Valid Invocation Format
- **WHEN** Daemon 执行 Stage 时需要调用 Proof
- **THEN** `validateProof()` (调用 ProofInvocationSchema) 校验成功
