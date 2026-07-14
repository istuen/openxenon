# v0.6.1 — Blueprint 结构重组 PR-3.2（Asset 模板跟进）

## Bug Fix

### Asset 模板跟进（S7-S10 from PR-3 副作用清单）

PR-1 + PR-3.1 已落地 Blueprint `## Use` + `## Boundaries` 新语法，**Asset 模板生成器仍输出旧语法**（`## Refs` + `## Slots`）。本 PR 把 `oxn asset create` 的 `.md` 模板改为 v0.7+ canonical 语法。

#### 修复 1：`createBlueprintTemplate` 输出 `## Use` + `## Boundaries`

`Asset/create.ts:100-134` 原 .md 分支输出 `## Refs`（S7 修复）。
改为输出 `## Use`（### domain-1 / workflow-1 / stack-1 + `- kind:` + `- ref:`）+ `## Boundaries`（### build/test with refs/observe/deps）。
保留 .oxn fallback。

#### 修复 2：`createWorkflowTemplate` 简化 Slots

`Asset/create.ts:69-94` 原 .md 分支输出 `## Slots` 下 `- deps: []`（S8 修复）。
改为 `## Slots` 下 `### <name> + - desc:` 字段（去 deps/observe）。
默认 slot 列表从 `['build', 'test', 'verify']` 改为 `['analyze', 'implement', 'verify']`（与 IAP 三阶段对齐）。
保留 .oxn fallback。

#### 修复 3：`createStackTemplate` 合并 Tools

`Asset/create.ts:136-159` 原输出 .oxn 双段格式（runtime / linter / test + ## Externals）（S9 修复）。
改为输出 .md 单一格式 `## Tools`（### typescript/node/biome/bun-test + version/config/command）。
删除 `.oxn` 双重格式（Stack 极简，单一 .md 路径）。
删除 ## Runtimes / ## Linters / ## Tests / ## Externals 旧段。

#### 修复 4：`work-manager.ts` task 模板对齐 work.ts

`Work/work-manager.ts:285-298` 原模板用 `### slot-name`（S10 修复）。
改为 `### implement`（与 `commands/work.ts:178` 路径一致）。
保留 `## Refs` 段（task-level 引用关系）。

### 注释更新

- `Asset/create.ts`：line 67 + line 97 + line 213 注释更新（移除 "🆕 v0.6.1-alpha.2" 字眼，对齐 v0.7+ canonical）
- `commands/work.ts`：line 240-247 switch 块注释更新（"## Refs 引用" → "## Use + ## Boundaries 段"）

## 测试

新增 `packages/engine/src/Asset/__tests__/create-templates.test.ts`（6 测试）：
1. Blueprint (.md) → `## Use` + `## Boundaries` 段；不含 `## Refs`
2. Workflow (.md) → `## Slots` 下 `### <name>` + `- desc:` 字段
3. Stack → `## Tools` 段；不含 `## Runtimes`/`## Linters`/`## Tests`/`## Externals`
4. Domain (.md) → 维持 `## Terms`/`## Bans`/`## Invariants`（PR-3.2 不动）
5. Stack (.oxn) 不再支持（保留 .md 单一格式）
6. `work-manager.ts addTaskToWork` 生成的 task.md 含 `### implement`，不含 `### slot-name`

**总测试**：1521 pass / 3 skip / 0 fail（1524 tests across 124 files，新增 6 个）

## 验证

- typecheck: ✅ 0 errors
- lint: ✅ 0 warnings
- `bun test packages/engine/src/Asset/__tests__/create-templates.test.ts`: 6 / 6 pass
- 本地 e2e：`oxn asset create` 生成的 Blueprint / Workflow / Stack 模板含 v0.7+ canonical 段

## 不在范围

- `.oxn` 格式输出（保留向后兼容）
- 老 ## Slots / ## Props parser 移除（已通过 deprecation warning 标记，留作 v0.7+ 工作）
- Skill 文档同步（PR-3.3 处理）
- `oxn external` 命令完全移除（v0.7+ 删除命令，本 PR 不动）
