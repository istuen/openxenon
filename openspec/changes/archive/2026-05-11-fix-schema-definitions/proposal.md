## Why

Schema Definition 有三个问题影响 AI 理解和校验：

1. **StageDefinitionSchema 缺 description**：Definition 是给 AI 看的资产定义，比 Invocation 更需要 description
2. **ProofDefinitionSchema.probes 是 string[]**：AI 无法理解每个 probe 的角色和用途
3. **ParameterDefSchema.description 是 optional**：Definition 是给 AI 看的约束文档，参数描述应该 required

## What Changes

- `src/kernel/schemas/stage.ts`: StageDefinitionSchema 加 `description: z.string()` 字段
- `src/kernel/schemas/proof.ts`: ProofDefinitionSchema.probes 改为结构化数组 `{ ref, description, params? }`
- `src/kernel/schemas/probe.ts`: ParameterDefSchema.description 改为 required

## Capabilities

### Modified Capabilities

- `StageDefinition`: 新增 `description` 字段
- `ProofDefinition`: probes 从 `string[]` 改为 `{ ref, description, params? }[]`
- `ProbeParameterDefinition`: description 从 optional 改为 required

## Impact

- `src/kernel/schemas/stage.ts`: StageDefinitionSchema 加 description 字段
- `src/kernel/schemas/proof.ts`: ProofDefinitionSchema.probes 结构化
- `src/kernel/schemas/probe.ts`: ParameterDefSchema.description required
- 需要更新所有使用这些 Schema 的地方（createDraftProbe/Proof/Stage 等）