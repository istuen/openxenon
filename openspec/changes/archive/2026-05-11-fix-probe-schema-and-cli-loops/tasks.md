## 1. Schema 基础修复

- [x] 1.1 `kernel/schemas/probe.ts` - 新增 `ParameterDefSchema`、`SemanticsSchema`、`ProbeDefinitionSchema`，`ProbeSchema` 改名为 `ProbeInvocationSchema`，新增 `validateProbeDefinition()`
- [x] 1.2 `kernel/schemas/proof.ts` - 新增 `ProofDefinitionSchema`、`ProofInvocationSchema`（改名），新增 `validateProofDefinition()`
- [x] 1.3 `kernel/schemas/stage.ts` - 新增 `StageDefinitionSchema`、`StageInvocationSchema`（改名），新增 `validateStageDefinition()`
- [x] 1.4 `kernel/schemas/index.ts` - 导出新 Schema 和函数

## 2. Draft CLI 校验逻辑修复

- [x] 2.1 `cli/draft.ts` - `createDraftProbe()` 改用 `validateProbeDefinition()`
- [x] 2.2 `cli/draft.ts` - `createDraftProof()` 改用 `validateProofDefinition()`
- [x] 2.3 `cli/draft.ts` - `createDraftStage()` 改用 `validateStageDefinition()`

## 3. Forge 循环验证

- [x] 3.1 先 commit 本地修改：`git add src/cli/forge.ts src/cli/task.ts`
- [x] 3.2 执行 `oxn forge probe --save 'type: fs_exists\ndescription: "test"\nparameters:\n  - name: pattern\n    type: string' --name test-probe`，验证返回 `{ ok: true, data: { path: "..." } }`
- [x] 3.3 检查文件是否正确写入 `.openxenon/arsenals/probes/test-probe/draft.yaml`

## 4. Task 循环验证

- [x] 4.1 创建测试 Blueprint 文件到 `.openxenon/tasks/test-task/blueprint.yaml`
- [x] 4.2 执行 `oxn task submit --blueprint .openxenon/tasks/test-task/blueprint.yaml`，验证返回 `taskId`
- [x] 4.3 执行 `oxn task next --task-id <id>`，验证返回 `stageId` 和 `status`
- [x] 4.4 执行 `oxn task verify --task-id <id> --stage-id <sid>`，验证返回 `verdict`

## 5. Skill 纯文本化

- [x] 5.1 `skills/oxn-forge.ts` - 删除所有 import（`createDraftFromYaml`、`fs`、`path`、`yaml`、`BOUNDARY_DIR`）
- [x] 5.2 `skills/oxn-forge.ts` - 删除辅助函数（`loadMetaBlueprintFromProject`、`getDefaultConstraints`、`parseForgeRequest`、`getForgeConstraints`），只保留 `id`、`description`、`instruction`、`examples`
- [x] 5.3 `skills/oxn-task.ts` - 删除 `import type { Stage }` 和 examples 中的 `as unknown as Stage` 类型转换
- [x] 5.4 验证 Skill 编译正常：`bun run src/skills/index.ts` 或等效编译检查
