## ADDED Requirements

### Requirement: Stage Definition Schema Validation
Stage 资产的定义格式 (canonical.yaml / draft.yaml) SHALL 使用 `StageDefinitionSchema` 进行校验。

### Requirement: Stage Invocation Schema Validation
Stage 资产的调用格式 SHALL 使用 `StageInvocationSchema` 进行校验。

### Requirement: Stage Definition Structure
Stage 定义格式 SHALL 包含：
- `id`: Stage 标识符，字符串
- `name`: Stage 名称，字符串
- `proof`: Proof 引用，字符串类型（引用 Proof 名称）
- `deps`: 依赖 Stage ID 数组，字符串类型，可选

### Requirement: Stage Invocation Structure
Stage 调用格式 SHALL 包含：
- `id`: Stage 标识符，字符串
- `name`: Stage 名称，字符串
- `proof`: 内联 Proof 实例，`ProofInvocation` 类型
- `deps`: 依赖 Stage ID 数组，字符串类型

### Requirement: Stage DAG Validation
Stage 的依赖关系 SHALL 通过 DAG 验证，确保无环依赖。

### Requirement: Stage Validation Functions
系统 SHALL 提供两个独立的校验函数：
- `validateStageDefinition()`: 用于校验资产定义格式
- `validateStage()`: 用于校验调用格式

#### Scenario: Create Stage Draft with Valid Definition Format
- **WHEN** AI 调用 `oxn forge stage --save '<yaml>' --name test-stage`
- **THEN** `createDraftStage()` 调用 `validateStageDefinition()` 校验成功
- **AND** Draft 文件正确保存到 `.openxenon/arsenals/stages/`

#### Scenario: Blueprint with Cyclic Dependencies Rejected
- **WHEN** Blueprint 包含循环依赖：A → B → C → A
- **THEN** DAG 验证失败，返回错误 "OXN_DAG_CYCLE"
