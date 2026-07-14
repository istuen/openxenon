# v0.6.1 — Blueprint 结构重组 PR-3.1（消费侧解析跟进）

## Bug Fix

### 消费侧解析跟进（S1-S6 from PR-3 副作用清单）

PR-1 落地了 Blueprint `## Use` / `## Boundaries` 新语法，但**消费侧解析器未跟进**——work.md 的 `## Use` 段和 Blueprint 的 `## Use` + `## Boundaries` 段未被识别。本 PR 跟进。

#### 修复 1：`extractBlueprintRefs` 支持 .md

`per-work-blueprints-merger.ts:81-90` 原只支持 .oxn 格式（`blueprint "X" ref "Y";`）。
现在同时支持 .md 格式（`## Use` 段下的 `### name` + `- kind: blueprint` + `- ref: @prj/...`），
并兼容"@prj/blueprints/foo"和"name @prj/blueprints/foo"两种 ref 格式。

**验证结果**（本地 e2e）：`oxn work create` + `oxn work validate` 后 `blueprints.json.declaredRefs` 从 `[]` 变为 `["@prj/blueprints/create-doc-md"]`，`blueprintCount: 1`（S1 修复）。

#### 修复 2：`parseBlueprintSlim` 支持 .md

`per-work-blueprints-merger.ts:189-257` 原只支持 .oxn。
现在优先识别 .md 格式（frontmatter `---` 开头 或 包含 `## Use`/`## Boundaries` 段），
fallback 到 .oxn 解析。`## Use` 段支持两种格式：
- 格式 A：`### name` H3 + `- kind` / `- ref`
- 格式 B：H2 下的 list 直接 `- kind: ref`

`## Boundaries` 段解析为 slots（每个 boundary 当作一个 slot，name 沿用，deps/observe 提取）。

**验证结果**（本地 e2e）：`oxn blueprint validate` 输出 "3 boundaries, 3 use refs"（S5+S6 修复）。

#### 修复 3：`collectWorkDomainProofs` 读 `## Use`

`work.ts:2892` 原读 `## Refs` 段找 `kind: domain`。
改为读 `## Use` 段（S2 修复）。

#### 修复 4：`blueprint-index-builder.ts` 支持 .md

`oxl/compiler/blueprint-index-builder.ts:189` 原只支持 .oxn（`blueprint "X" {`）。
现在优先识别 .md 格式（frontmatter 或 `## Use`/`## Boundaries`），fallback 到 .oxn。
新增 `parseBlueprintSlimMdFormat` 处理 .md 格式（提取 name/version from frontmatter，提取 description from blockquote，提取 slotNames from `## Boundaries`）。

**版本处理**（.md 用 semver 如 "0.7.0"）：提取主版本号，0.x 归 1（schema min=1）。

#### 修复 5：`extractBlueprintIR` 支持 .md

`oxl/md-pipeline/transformers/blueprint.ts` 原要求 `## Use` 下有 `### H3` 块。
现在显式扫描 `## Use` 段，支持：
- 格式 A：H3 + list
- 格式 B：直接 list（无 H3）

#### 修复 6：Asset 模板跟进

`Asset/blueprint-manager.ts` 的 `blueprintCreateTemplate` 原生成 `## Slots` H2 段。
改为生成 `## Boundaries` H2 段（与 PR-1 新语法对齐）。

### 注释更新

- `work-skeleton.ts`：5 处 "work ## Refs" 改为 "work ## Use"
- `work.ts`：4 处 "Blueprint ## Refs" 改为 "Blueprint ## Use"
- `per-work-blueprints-merger.ts`：注释更新

## 测试

- `per-work-blueprints-merger.test.ts`：新增 6 个 .md 格式测试（extractBlueprintRefs 5 个 + parseBlueprintSlim 1 个）+ 1 个 .md work.md 端到端测试
- `all.test.ts`（blueprint transformer）：保留原有 11 个测试（含 1 个 v0.7 测试），全部通过
- `blueprint-index-builder.test.ts`：35 个测试全部通过
- `blueprint-index-e2e.test.ts`：10 个测试全部通过

**总测试**：1515 pass / 3 skip / 0 fail（1518 tests across 123 files，新增 8 个）

## 验证

- typecheck: ✅ 0 errors
- lint: ✅ 0 warnings
- 本地 e2e：work create → work validate 完整跑通，`declaredRefs` 不再为空
