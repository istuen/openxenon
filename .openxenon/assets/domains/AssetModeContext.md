---
entity: domain
version: 0.3.0
name: AssetModeContext
oxn-source-sha: 37062a00c9d2dbff131e13d6cfa74cf5d8f5e04dbebf708c2634294c885e5179
synced-at: 2026-07-08T13:52:19.197Z
---

# Domain: AssetModeContext

> Asset 生命周期 v0.6.1 限界上下文: 5 AssetKind (domain/blueprint/stack/library/external) + Work Asset Mode (--type asset --asset-kind X) + Asset-Lifecycle (创建/演进/归档) + Asset-DAG (references 校验)

## Terms

### AssetKind
- desc: 5 类资产枚举: domain (业务限界上下文) / blueprint (技术 slot DAG) / stack (技术栈约束) / library (文档聚合) / external (外部资源链接);v0.6.1-alpha.1 Batch 2 加 library/external

### AssetMode
- desc: v0.6.1-alpha.1 Batch 2 新增: oxn work create --type asset --asset-kind X;走 Asset 生命周期而非 task DAG;无 .work/.run

### AssetTemplate
- desc: assets/{kind}.md 模板: domain.md (Terms/Bans/Invariants) / blueprint.md (Props/Slots) / stack.md (Runtimes/Linters/Tests) / library.md (Sources) / external.md (Links)

### AssetLifecycle
- desc: Asset 完整生命周期: create (oxn work create --type asset) / evolve (oxn work create --evolve-from) / archive (oxn asset archive) / delete (oxn asset delete);v0.6.3+ planLock hard-block

### PlanLock
- desc: Asset 创建后强校验卡 (v0.6.3+ 计划): 锁定 fileHash + citations + DAG;漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH

### AssetCitation
- desc: Asset 反向引用计数: 任何 Asset 引用方 (其他 Asset/Work) 自动 +1;asset-evolution 同步 +1

### AssetDAG
- desc: Asset references[] 字段构建的依赖图: 禁止自环 + 禁止循环依赖;cycleHint 提示循环路径

### AssetPaper
- desc: Asset 4 字段不变量: abstract (一句话业务边界) + references (DAG 入边) + citations (反向计数) + auditTrail (创建/修改/归档历史);4 字段必填

### WorkAssetMode
- desc: Asset 模式 Work: --type asset --asset-kind X --evolve-from Y (可选);底层走 IAP 闭环 (Intent-Align-Proof) 但跳过 task DAG

### AssetFileResolver
- desc: resolveAssetFile / resolveAssetDir / resolveAssetCandidates: 6 类资产路径解析;primary=v0.6 (assets/{kind}/) + fallback=v0.5 ({kinds}/)

### AssetCategoryWhitelist
- desc: 5 AssetKind 的 H2 分类白名单: domain≠blueprint≠stack≠library≠external;混用 → E_MD_CATEGORY_UNKNOWN

### AssetFrontmatter
- desc: Asset .md 格式的 YAML frontmatter: entity + version + name (+ references/citations);H1 实体 / H2 分类 / H3 实例

### OxnAsset
- desc: oxn asset 子命令族: list/show/validate/create/archive/delete;v0.6.1-alpha.1 起独立子命令 (不在 work 下)

### AssetRefMode
- desc: Asset 引用模式: Asset 内 references[] 字段声明依赖 Asset 列表;CLI 加载期 fail-fast 校验

### DomainCompiler
- desc: EntityCompiler 接口的 8 个实现之一 (DomainCompiler/BlueprintCompiler/StackCompiler/LibraryCompiler/ExternalCompiler/WorkCompiler/TaskCompiler/ProofCompiler);把 .md 编译为 IR

### AssetMigration
- desc: v0.5 → v0.6 布局迁移: .openxenon/domains/X.oxn → .openxenon/assets/domains/X.oxn;v0.6.1-alpha.1 Phase 1 已落

## Bans

### forbidden-constructs
- items:
  - ignoreAssetLock
  - directWriteOxn
  - copyFromOldLayout
  - assetModeTask
  - assetBypassWork
  - AssetKindMix
  - CategoryMix
  - missingAbstract
  - missingReferences
  - missingCitations
  - missingAuditTrail
  - selfReference
  - cyclicReference
  - oldLayoutPath
  - oxn-asset-new
- desc: ignoreAssetLock, directWriteOxn, copyFromOldLayout, assetModeTask, assetBypassWork, AssetKindMix, CategoryMix, missingAbstract, missingReferences, missingCitations, missingAuditTrail, selfReference, cyclicReference, oldLayoutPath, oxn-asset-new

## Invariants

### inv-1
- value: 5 AssetKind 白名单不可混用: domain 的 H2 (Terms/Bans/Invariants) 与 blueprint 的 H2 (Props/Slots) 严格隔离;混用 → E_MD_CATEGORY_UNKNOWN

### inv-2
- value: --type asset 必填 --asset-kind X;5 AssetKind 之外的值 → OXN_INVALID_ASSET_KIND (CLI 加载期拒绝)

### inv-3
- value: Asset 模式 (--type asset) 不走 task DAG;不写 .work / .run;只写 .openxenon/assets/{kinds}/{name}.oxn + .md 镜像

### inv-4
- value: Asset 4 字段不变量: abstract + references + citations + auditTrail 必填;缺失 → IAP_INTENT_ASSET_INCOMPLETE (YIELD_TO_HUMAN)

### inv-5
- value: Asset 引用 DAG 无环: AssetA.references 含 AssetB + AssetB.references 含 AssetA → IAP_INTENT_DAG_CYCLE (含 cycleHint)

### inv-6
- value: Asset 不能引用自己: Asset.references 含自身 → IAP_INTENT_SELF_REFERENCE (v0.6.3+ hard-block)

### inv-7
- value: v0.6.3+ planLock 计划: Asset 创建后强校验 fileHash;漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH (与 Work planLock 4 组件 hash 等效)

### inv-8
- value: Asset 演进 (--evolve-from) 创建新版本, 旧版 planLock 自动失效;新 Asset 必须有 auditTrail 引用旧版

### inv-9
- value: Asset 归档 (oxn asset archive X --reason Y): 文件 mv 到 .openxenon/.archived/{kinds}/X.oxn;citations 保留;planLock 仍可查询 (只读)

### inv-10
- value: Asset 删除 (oxn asset delete X --force): 仅当无任何引用 + 业务团队同意才能硬删;否则 → IAP_ASSET_HAS_REFS (YIELD_TO_HUMAN)

### inv-11
- value: Asset 物理位置 v0.6 默认: .openxenon/assets/{kinds}/X.oxn;v0.5 fallback: .openxenon/{kinds}/X.oxn (保留兼容但新项目不再使用)

### inv-12
- value: Asset 命名规范: domain 必须 PascalCase (MemberContext);blueprint/stack 必须 kebab-case (dev-workflow);library/external 推荐 kebab-case

### inv-13
- value: Asset 名称规范化: toKebab(declared) === toKebab(file_stem);不一致 → IAP_INTENT_NAME_FILE_MISMATCH (YIELD_TO_HUMAN, 跨平台 case-insensitive 防御)

### inv-14
- value: 重复创建同 name 资产 → OXN_ASSET_EXISTS (PATH_CONFLICT);--force 覆盖;不静默合并

### inv-15
- value: 5 AssetKind 编译器 (DomainCompiler/BlueprintCompiler/StackCompiler/LibraryCompiler/ExternalCompiler) 注册到 EntityRegistry 单例;不可重复注册

### inv-16
- value: Asset 不与 Work 混用: 同一 .openxenon/ 目录下 Asset (.oxn) 与 Work (.work) 互不引用;Asset 通过 @prj 寻址被 Work 引用

### inv-17
- value: Asset 模板 (assets/{kind}.md) 是 SSOT;CLI 创建时复用模板;禁止 in-place 改模板 (改动必须走 PR)

### inv-18
- value: oxn asset list --type domain 必填 kind 之一;不接受 --all (与 oxn work list 行为不同)

### inv-19
- value: Asset 引用方 (Work/Task/Asset) 变更后, 引用目标 citations 字段自动 +1;不需手工改
