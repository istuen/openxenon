---
entity: domain
version: 0.3.0
name: AssetLifecycleContext
---

# Domain: AssetLifecycleContext

> 资产生命周期业务边界 v0.6.x: 定义 create/evolve/archive 三个执行路径的术语、禁用与不变量。供 oxn-asset Skill 消费，配合 AssetModeContext 共同覆盖 Skill 全部 5 步执行流程。

## Terms

### AssetCreate
- desc: 资产创建执行路径

### AssetEvolve
- desc: 资产演进执行路径

### AssetArchive
- desc: 资产归档执行路径

### AssetKindSelection
- desc: Skill 执行步骤 1: 从 references/asset-kind-reference.md 选 6 种 AssetKind 之一（domain/blueprint/stack/roadmap/library/external）

### AssetTemplateFork
- desc: Skill 执行步骤 2: 从 assets/{kind}.md 模板 fork 出目标文件；模板是 SSOT，禁止 in-place 改模板

### AssetContentFill
- desc: Skill 执行步骤 3: 按 AssetKind 模板填内容（domain: Terms/Bans/Invariants;blueprint: Props/Slots;stack: Runtimes/Linters/Tests;roadmap: Scenes;library: Sources;external: Links）

### AssetCompletion
- desc: Skill 执行步骤 6: oxn asset list 确认入库 + citations 字段自动 +1（任何引用方变化触发反向计数）

### AssetPaper4Fields
- desc: Asset 4 字段不变量: abstract (一句话业务边界) + references (DAG 入边) + citations (反向计数) + auditTrail (创建/修改/归档历史);4 字段必填

### AssetCitation
- desc: Asset 反向引用计数: 任何 Asset 引用方 (其他 Asset/Work) 自动 +1;asset-evolution 同步 +1;archive 时保留

### AssetMigration
- desc: v0.5 → v0.6 布局迁移: .openxenon/domains/X.oxn → .openxenon/assets/domains/X.oxn;v0.6.1-alpha.1 Phase 1 已落

### AssetFrontmatter
- desc: Asset .md 格式的 YAML frontmatter: entity + version + name (+ references/citations);H1 实体 / H2 分类 / H3 实例

### AssetNaming
- desc: Asset 命名规范: domain 必须 PascalCase (MemberContext);blueprint/stack/roadmap 必须 kebab-case (dev-workflow);library/external 推荐 kebab-case

## Bans

### forbidden-constructs
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
- value: Asset 4 字段必填: abstract + references + citations + auditTrail 缺一不可;缺失 → IAP_INTENT_ASSET_INCOMPLETE (YIELD_TO_HUMAN)

### inv-2
- value: --type asset 必填 --asset-kind X;6 AssetKind 之外的值 → OXN_INVALID_ASSET_KIND (CLI 加载期拒绝)

### inv-3
- value: Asset 创建后 planLock 强校验 fileHash;漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH (与 Work planLock 4 组件 hash 等效)

### inv-4
- value: Asset 引用 DAG 无环: AssetA.references 含 AssetB + AssetB.references 含 AssetA → IAP_INTENT_DAG_CYCLE (含 cycleHint)

### inv-5
- value: Asset 不能引用自己: Asset.references 含自身 → IAP_INTENT_SELF_REFERENCE (v0.6.3+ hard-block)

### inv-6
- value: Asset 模式 (--type asset) 不走 task DAG;不写 .work / .run;只写 .openxenon/assets/{kinds}/{name}.oxn + .md 镜像

### inv-7
- value: Asset 模板 (assets/{kind}.md) 是 SSOT;CLI 创建时复用模板;禁止 in-place 改模板

### inv-8
- value: 重复创建同 name 资产 → OXN_ASSET_EXISTS (PATH_CONFLICT);--force 覆盖;不静默合并

### inv-9
- value: Asset 归档 (--reason Y) 文件 mv 到 .openxenon/.archived/{kinds}/;citations 保留;planLock 仍可查询 (只读)

### inv-10
- value: Asset 删除 (--force) 仅当无任何引用 + 业务团队同意才能硬删;否则 → IAP_ASSET_HAS_REFS (YIELD_TO_HUMAN)
