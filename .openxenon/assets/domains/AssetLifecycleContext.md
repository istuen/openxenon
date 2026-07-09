---
entity: domain
version: 0.3.0
name: AssetLifecycleContext
abstract: "Asset lifecycle v0.6.x: define create/evolve/archive vocabulary and invariants for oxn-asset Skill"
references: []
citations: 0
---

# Domain: AssetLifecycleContext

> 资产生命周期业务边界 v0.6.x: 定义 create/evolve/archive 三个执行路径的术语、禁用与不变量。供 oxn-asset Skill 消费。

<!-- auditTrail: created by oxn-asset Skill at 2026-07-10 -->

## Terms

### AssetCreate
- desc: 资产创建执行路径

### AssetEvolve
- desc: 资产演进执行路径

### AssetArchive
- desc: 资产归档执行路径

### AssetKindSelection
- desc: Skill 执行步骤 1: 从 references/asset-kind-reference.md 选 6 种 AssetKind 之一

### AssetTemplateFork
- desc: Skill 执行步骤 2: 从 assets/{kind}.md 模板 fork 出目标文件；模板是 SSOT

### AssetContentFill
- desc: Skill 执行步骤 3: 按 AssetKind 模板填内容（domain / blueprint / stack / roadmap / library / external）

### AssetCompletion
- desc: Skill 执行步骤 6: oxn asset list 确认入库 + citations 字段自动 +1

### AssetPaper4Fields
- desc: Asset 4 字段不变量: abstract + references + citations + auditTrail; 4 字段必填

### AssetCitation
- desc: Asset 反向引用计数: 任何引用方自动 +1; archive 时保留

### AssetMigration
- desc: v0.5 → v0.6 布局迁移: .openxenon/domains/X.oxn → .openxenon/assets/domains/X.oxn

### AssetFrontmatter
- desc: Asset .md 格式的 YAML frontmatter: entity + version + name + abstract + references + citations

### AssetNaming
- desc: Asset 命名规范: domain PascalCase; blueprint/stack/roadmap kebab-case; library/external 推荐 kebab-case

### AssetReferenceScope
- desc: Asset.references 仅引用同 kind Asset (v0.6.x 决策 1); 跨 kind 组合由 Roadmap scene 承担 (避免依赖地狱)

### AssetRefBudget
- desc: Asset.references 数量上限预算 N=5 (决策 3); 超过视为过度耦合 (需用 Roadmap 拆解)

## Bans

- items:
  - ignoreAssetLock
  - directWriteOxn
  - copyFromOldLayout
  - assetBypassWork
  - AssetKindMix
  - CategoryMix
  - missingAbstract
  - missingReferences
  - missingCitations
  - missingAuditTrail
  - oxn-asset-new
  - skipValidation
  - forceBypass
- desc: ignoreAssetLock, directWriteOxn, copyFromOldLayout, assetBypassWork, AssetKindMix, CategoryMix, missingAbstract, missingReferences, missingCitations, missingAuditTrail, oxn-asset-new, skipValidation, forceBypass

## Invariants

### inv-1
- value: Asset 4 字段必填: abstract + references + citations + auditTrail 缺一不可; 缺失触发 IAP_INTENT_ASSET_INCOMPLETE

### inv-2
- value: --type asset 必填 --asset-kind X; 6 AssetKind 之外的值触发 OXN_INVALID_ASSET_KIND

### inv-3
- value: Asset 创建后 planLock 强校验 fileHash; 漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH

### inv-4
- value: Asset 引用 DAG 无环: 循环触发 IAP_INTENT_DAG_CYCLE (含 cycleHint)

### inv-5
- value: Asset 不能引用自己 (v0.6.3+ hard-block)

### inv-6
- value: Asset 模式 (--type asset) 不走 task DAG; 不写 .work / .run

### inv-7
- value: Asset 模板 (assets/{kind}.md) 是 SSOT; 禁止 in-place 改模板

### inv-8
- value: 重复创建同 name 资产触发 OXN_ASSET_EXISTS (PATH_CONFLICT); --force 覆盖

### inv-9
- value: Asset 归档 (--reason Y) 文件 mv 到 .openxenon/.archived/{kinds}/

### inv-10
- value: Asset 删除 (--force) 仅当无任何引用 + 业务团队同意才能硬删; 否则触发 IAP_ASSET_HAS_REFS

### inv-XX
- value: Asset.references 仅限引用同 kind Asset; 跨 kind 协作走 Roadmap scene.links (避免依赖地狱); 违反触发 IAP_INTENT_CROSS_KIND_REF (v0.6.2+ hard-block; 当前 soft-warn)
