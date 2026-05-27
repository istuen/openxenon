## Why

当前 CLIForge 的 `--save` 参数已实现，但 `createDraftProbe()` 使用 `ProbeSchema` (调用格式) 校验 canonical.yaml/forge 结果 (定义格式)，导致校验必然失败。同时 Forge 和 Task 循环存在架构污染和未实现的子命令。需要修复 Schema 错位问题，闭合两个循环，清理 Skill 架构污染。

## What Changes

1. **新增 ProbeDefinitionSchema / ProofDefinitionSchema / StageDefinitionSchema**
   - 定义格式 Schema 与调用格式 Schema 分离
   - 各管各的校验职责

2. **改造现有 Schema 为 InvocationSchema**
   - `ProbeSchema` → `ProbeInvocationSchema`
   - `ProofSchema` → `ProofInvocationSchema`
   - `StageSchema` → `StageInvocationSchema`

3. **修改 `cli/draft.ts` 的校验逻辑**
   - `createDraftProbe()` 使用 `validateProbeDefinition()`
   - `createDraftProof()` 使用 `validateProofDefinition()`
   - `createDraftStage()` 使用 `validateStageDefinition()`

4. **实现 `oxn forge --save` 完整功能**
   - 本地修改已包含 `--save/--name/--global` 参数
   - 修通 Schema 后 Forge 循环正式闭合

5. **实现 `oxn task` 四个子命令**
   - submit / next / verify / status
   - 本地修改已包含空壳，需要实现完整逻辑

6. **清理 Skill 架构污染**
   - `oxn-forge.ts` 删除所有 import 和辅助函数
   - `oxn-task.ts` 删除 kernel type import
   - 保留纯文本 instruction

## Capabilities

### New Capabilities
- `probe-definition-schema`: Probe 资产定义格式 Schema，与调用格式分离
- `proof-definition-schema`: Proof 资产定义格式 Schema，与调用格式分离
- `stage-definition-schema`: Stage 资产定义格式 Schema，与调用格式分离
- `forge-loop`: Forge 循环完整闭合，AI 可通过 CLI 保存 Draft 资产
- `task-loop`: Task 循环完整闭合，AI 可通过 CLI 提交/执行/验证任务

### Modified Capabilities
- (无现有 spec 可对照，留空)

## Impact

- **涉及的代码**:
  - `src/kernel/schemas/probe.ts`: 新增 DefinitionSchema，改名现有 Schema
  - `src/kernel/schemas/proof.ts`: 新增 DefinitionSchema
  - `src/kernel/schemas/stage.ts`: 新增 DefinitionSchema
  - `src/kernel/schemas/index.ts`: 导出新函数
  - `src/cli/draft.ts`: 修改 createDraft* 校验调用
  - `src/cli/forge.ts`: 已实现 --save (本地修改)
  - `src/cli/task.ts`: 已实现子命令空壳 (本地修改)
  - `src/skills/oxn-forge.ts`: 清理架构污染
  - `src/skills/oxn-task.ts`: 清理架构污染

- **影响的系统**:
  - Forge 循环：AI 通过 Skill 指令调用 `oxn forge --save` 保存 Draft
  - Task 循环：AI 通过 Skill 指令调用 `oxn task submit/next/verify`
  - 探针/证明/工序的三权分立架构得到正确实现
