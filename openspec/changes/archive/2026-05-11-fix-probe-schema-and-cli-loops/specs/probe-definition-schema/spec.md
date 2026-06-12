## ADDED Requirements

### Requirement: Probe Definition Schema Validation
Probe 资产的定义格式 (canonical.yaml / draft.yaml) SHALL 使用 `ProbeDefinitionSchema` 进行校验，不使用调用格式的 `ProbeInvocationSchema`。

### Requirement: Probe Invocation Schema Validation
Probe 资产的调用格式 (step-manifest.json 中的 probeArgs) SHALL 使用 `ProbeInvocationSchema` 进行校验。

### Requirement: Probe Type Enumeration
Probe 的 type 字段 SHALL 只接受以下枚举值：`fs_exists`、`fs_content_match`、`exec_exit_zero`。

### Requirement: Probe Parameter Definitions
Probe 的 parameters 字段 SHALL 是 `ParameterDefSchema` 的数组，每个元素包含：
- `name`: 参数名称，字符串
- `type`: 参数类型，只接受 `string`、`number`、`boolean`
- `required`: 是否必需，布尔值，可选默认为 false
- `default`: 默认值，可选
- `description`: 参数描述，字符串，可选

### Requirement: Probe Semantics
Probe 的 semantics 字段 SHALL 是可选的 `SemanticsSchema`，包含：
- `intent`: 意图描述，字符串
- `useWhen`: 使用场景，字符串，可选

### Requirement: Probe Schema Naming Compatibility
`ProbeSchema` SHALL 作为 `ProbeInvocationSchema` 的别名存在，确保向后兼容。

### Requirement: Probe Validation Functions
系统 SHALL 提供两个独立的校验函数：
- `validateProbeDefinition()`: 用于校验资产定义格式
- `validateProbe()`: 用于校验调用格式（保持原有签名）

#### Scenario: Create Probe Draft with Valid Definition Format
- **WHEN** AI 调用 `oxn forge probe --save '<yaml>' --name test-probe`，其中 YAML 包含 `type`、`description`、`parameters`
- **THEN** `createDraftProbe()` 调用 `validateProbeDefinition()` 校验成功
- **AND** 返回 `{ ok: true, data: { path: "..." } }`

#### Scenario: Create Probe Draft with Invalid Definition Format
- **WHEN** AI 调用 `oxn forge probe --save '{ type: "fs_exists", params: { path: "/" } }'`
- **THEN** `createDraftProbe()` 校验失败，返回 `{ ok: false, error: { code: "OXN_FORGE_SAVE_FAILED", message: "Invalid probe structure" } }`

#### Scenario: Daemon Invokes Probe with Valid Invocation Format
- **WHEN** Daemon 从 step-manifest.json 提取 probeArgs：`{ type: "fs_exists", params: { path: "/etc/app" } }`
- **THEN** `validateProbe()` (调用 InvocationSchema) 校验成功
