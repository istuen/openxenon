---
version: 0.6.4-alpha.0
prerelease: alpha
date: 2026-08-09
type: breaking-change
scope: asset-convergence
status: pending
---

# 0.6.4-alpha.0: Asset 数量与定义收敛（PR-A：roadmap → assetmap）

> 来源：[`.openxenon/drafts/design-asset-convergence-v064.md`](../../.openxenon/drafts/design-asset-convergence-v064.md)（2026-08-09 `/grilling` session 收束）

## Breaking Changes

- **AssetKind=roadmap → assetmap**（break-change；5 AssetKind 封闭不变）
  - `ALL_ASSET_KINDS` 枚举值 `roadmap` → `assetmap`（`packages/engine/src/infra/paths.ts:108-116`）
  - `DEFAULT_ASSET_DIRS` 键名 `roadmap` → `assetmap`（目录仍 `assetmaps/`）
  - `IntentEntityType` 联合类型同步（`packages/engine/src/oxl/md-bridge/pipeline.ts:39-48`）
  - `ProjectConfig.assetDirs[roadmap]` → `assetDirs[assetmap]`（3 处 type 定义）
- **Roadmap/AssetMap 术语统一**：
  - `RoadmapLink/RoadmapScene/RoadmapParseResult` 类型名保留（module `Roadmap/`，目录 `.openxenon/assets/assetmaps/`）
  - 文件 frontmatter `entity: roadmap` → `entity: assetmap`（parser 兼容 legacy + 警告 deprecation）
  - 4 处 CLI 命令：`oxn assetmap {list|show|suggest|sync|validate}`（已存在，未改名）
- **AssetMap 格式升级**：
  - Scene 标题：`### scene: <name>` → `### scene-<name>`（canonical）
  - Link 格式：markdown table → bullet list `- <kind>: <name> — <description>`
  - Parser 实现向后兼容（table + colon 仍可解析，标记 deprecated）

## 修复（P0）

- **AssetMap parser 格式不兼容**：旧 parser 正则要求 `### scene: <name>` + markdown table，与 `oxn-system.md` v3.1.0 实际格式不匹配（实测 0 scenes）。现已支持 canonical 格式（bullet list + dash separator），`oxn assetmap suggest --goal ... --scene dev` 可正常返回。
- **`oxn-system.md` 悬挂 Blueprint 引用**：删除 3 个已归档 Blueprint 引用（`doc-prod-workflow` / `doc-dev-workflow` / `doc-rfc-workflow` 已在 v0.6.2-alpha.3 替换为 `draft-promote-router` + `promote-target-aware-workflow`）。
- **`oxn-source-sha: pending`** → 回填实际 git SHA。

## 文件变更（PR-A：roadmap → assetmap）

### 类型层（核心）

- `packages/engine/src/infra/paths.ts:108-116` — enum + DEFAULT_ASSET_DIRS
- `packages/engine/src/Roadmap/parser.ts` — 格式同步 + 接受 `'roadmap'` legacy alias + 新增 `parseLinksBullets()`
- `packages/engine/src/Roadmap/sync.ts` — apply 阶段支持 bullet 格式
- `packages/engine/src/Roadmap/types.ts` — 注释更新
- `packages/engine/src/Roadmap/__tests__/parser.test.ts` — 新增 2 测试（canonical + legacy warning）
- `packages/engine/src/oxl/md-bridge/pipeline.ts:39-48` — `IntentEntityType` 同步
- `packages/engine/src/oxl/md-bridge/compilers/roadmap-compiler.ts:60,173,217` — entity + error 消息
- `packages/engine/src/oxl/md-bridge/parse-md-ref.ts` — `kindToScope` 类型 + 注释
- `packages/engine/src/oxl/md-bridge/reference-checker.ts:47,113` — kind + scope map
- `packages/engine/src/oxl/scope/oxn-builtin-registry.ts:492,627` — `_type` + `subdirMap`
- `packages/engine/src/infra/assets/asset-path-resolver.ts:61,82,143,189` — kind 校验 + fallback
- `packages/engine/src/infra/probes/stale-draft-check.ts:139` — `const kinds`
- `packages/engine/src/Asset/dag-validator.ts:36` — `AssetNode.kind`
- `packages/engine/src/Asset/validate.ts:255-265` — `kind !== 'roadmap'` → `kind !== 'assetmap'`
- `packages/engine/src/Asset/create.ts:252` — case 'roadmap' → case 'assetmap'
- `packages/engine/src/Asset/__tests__/{list,validate,create-templates}.test.ts` — 测试同步
- `packages/engine/src/Draft/skeleton.ts:35` — `ASSET_KINDS` 同步
- `packages/engine/src/Draft/promote.ts:33,139,161` — `promote-asset-assetmap` + case + dir
- `packages/engine/src/Draft/promote-dispatch.ts:203,206` — `configAssetDirs` + `defaultDir`
- `packages/engine/src/Draft/__tests__/{skeleton,promote,promote-dispatch,retarget}.test.ts` — 测试同步

### CLI 层

- `packages/cli/src/commands/assetmap.ts` — `--kind roadmap` → `--kind assetmap` + 输出格式 `### scene-<name>` + 注释
- `packages/cli/src/commands/onboard.ts` — `AssetKind` 联合 + `kindDirName` + `suggestProjectAssetNames`
- `packages/cli/src/commands/draft.ts` — `draftPromote.assetDirs` 键名
- `packages/cli/src/commands/work.ts:826` — 已正确引用 `oxn assetmap`
- `packages/cli/src/index.ts:154` — 注释更新
- `packages/cli/src/skills/loader.ts` — 5 AssetKind 列表
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/instruction.md` — 5 类列表 + 命名收敛注释 + kind=roadmap 行
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/references/{asset-creation,asset-kind-reference}.md` — table 行更新
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-draft/instruction.md` — kind 列表
- `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md` — kind 列表
- `packages/cli/src/init/builtin-skeleton-templates.ts` — `asset-roadmap.md` → `asset-assetmap.md` + `target-entity: assetmap`
- `packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts` — 文件名列表
- `packages/cli/src/__tests__/e2e/draft-e2e.test.ts:324-332` — e2e 测试 `Asset+assetmap`

### 守门脚本

- `scripts/check-asset-structure.ts:47,213-220,604,785-791` — `ENTITY_TO_KIND`/`ENTITY_DIR_HINT`/`VALID_USE_KINDS`/`BP_FIELD_LOAD_GROUPS` 接受 `assetmap`（canonical）+ `roadmap`（legacy alias）

### Asset 文件

- `.openxenon/assets/assetmaps/oxn-system.md` — frontmatter `entity: assetmap` + heading `# AssetMap:` + 删 3 悬挂 Blueprint 引用 + 7 处 `oxn roadmap` → `oxn assetmap` + `oxn-source-sha` 回填
- `.openxenon/assets/domains/oxn-asset-domain.md` — 删 `RoadmapAlias` 段 + Inv1/Inv12 + AssetMap 注释更新
- `.openxenon/assets/domains/oxn-domain.md` — AssetKind 列表更新 + v0.6.4 标记
- `.openxenon/assets/domains/oxn-project-domain.md` — AssetMap 段 + abstract v1.0.1 + RoadmapDeprecated 注释更新
- `.openxenon/assets/domains/oxn-draft-domain.md` — Skeleton 段（target-entity + 模板列表 + 5 类封闭）
- `.openxenon/assets/domains/oxn-draft-promote-domain.md` — promote-kind 列表 + skeleton 列表 + sub-target 命名
- `packages/engine/src/builtin/assetmaps/md-system.md` — frontmatter `entity: assetmap`

### 测试新增

- `packages/engine/src/Roadmap/__tests__/parser.test.ts:182-216` — 2 测试覆盖 canonical bullet format + legacy `entity: roadmap` deprecation warning
- 现有测试同步更新（5 AssetKind 列表、`entity: assetmap` 等）

## 验证结果

```
bun run typecheck    ✓ pass
bun run check        ✓ pass (1 pre-existing info)
bun scripts/check-asset-structure.ts  ✓ 36/36 pass
bun scripts/check-doc-boundary.ts     ✓ 0 violations
bun scripts/check-versioned-docs.ts   ✓ pass
bun scripts/validate-dependencies.ts  ✓ 0 violations
bun test packages/engine packages/cli  ✓ 1931/1931 pass
bun test (full)       2133/2137 pass (4 pre-existing failures unrelated)
```

## 后续 PR（按依赖排序）

- **PR-B**：Domain 收敛（Q5 + Q6：删 `oxn-insight-domain` + 合并 `oxn-probe-domain` 到 `oxn-proof-domain`）
- **PR-C**：Workflow 合并（Q8：4 个折入 `dev-workflow`）
- **PR-D**：references 语法统一（Q7：B 方案 bare name + parent-kind metadata）
- **PR-E**：物理归位（Q1 + Q3：Probe 文件迁 `.openxenon/probes/` + `AssetType` → `EngineModuleType`）

详见 `.openxenon/drafts/design-asset-convergence-v064.md` §4 PR 分解。