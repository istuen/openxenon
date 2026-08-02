---
entity: draft
type: report
created: 2026-08-02
status: active
related:
  - docs/adrs/0088-test-suite-architecture.md
  - .changes/0-6-2-alpha-1-pool-and-glossary.md
  - .changes/0-6-2-alpha-2-rfc-0015-implementation.md
  - .changes/0-6-2-alpha-2-rfc-0016-implementation.md
  - .changes/0-6-2-alpha-2-meta-layer.md
  - .changes/0-6-2-alpha-2-collab-boundary.md
  - .changes/0-6-2-alpha-3-draft-promote-routing.md
  - .changes/0-6-3-draft-promote-ng6-actual-write.md
  - .openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md
---

# Draft: feature→test 映射审计（ADR-0088 ADR-P2 交付）

> **状态**：🟢 Ready（2026-08-02 phase 3.5 落地）
> **作者**：opencode（与 user 协作，2026-08-02）
> **目的**：按 ADR-0088 D8，扫 `.changes/` 按版本（v0.6.0 / v0.6.1 / v0.6.2-alpha.0/1/2/3 / v0.6.3）列特性，标 source module + test file + 状态（covered / gap / redundant / stale）
> **scope**：覆盖 = feature→test 映射审计（**不**是代码覆盖率 %，bunfig 未配 coverage）

## 0. 测试统计基线

| 指标 | 数值 |
|---|---|
| Test 文件数 | 159（ADR-0088 P6 拆分后） |
| Test case 数 | **1971 pass / 0 fail / 0 skip**（v0.6.3 收尾完成） |
| 测试源码 LOC | ~26,809 + 拆分后调整 |
| wall-clock | 33.9s（v0.6.3 收尾后实测平均） |
| Engine 拆分覆盖 | T0-T2 全部进并发（bunfig.toml） |
| CLI 桶拆分 | 14 unit 进并发 / 14 e2e 维持串行（P3 done） |

## 1. v0.6.0 → v0.6.1：核心架构期

| 版本 | 特性 | source module | test file | 状态 |
|---|---|---|---|---|
| v0.6.0 | IAP 三阶段重构（Intent → Align → Proof） | `packages/engine/src/Work/intent.ts`, `align.ts`, `proof/` | `Work/__tests__/intent*.test.ts`, `align*.test.ts`, `Proof/__tests__/*` | ✅ covered |
| v0.6.1 | Asset.md 默认格式 | `packages/engine/src/Asset/markdown.ts` | `Asset/__tests__/markdown*.test.ts` | ✅ covered |
| v0.6.1 | Asset Paper (abstract/references/citations 三字段不变) | `Asset/paper.ts` | `Asset/__tests__/paper*.test.ts` | ✅ covered |
| v0.6.1 | Blueprint 结构 PR1/PR2/PR3-1/PR3-2 | `Asset/blueprint.ts` (多文件) | `Asset/__tests__/blueprint*.test.ts` (多文件) | ✅ covered |
| v0.6.1 | Doc skeleton 三层拆分 | `Asset/doc.ts` | `Asset/__tests__/doc*.test.ts` | ✅ covered |
| v0.6.1 | Doc 三层重构（RFC→概念→HOW） | `Asset/doc.ts` + `Work/` | `Asset/__tests__/` + `Work/__tests__/` | ✅ covered |
| v0.6.1 | Domain hierarchy（根域/子域） | `Asset/domain.ts` | `Asset/__tests__/domain*.test.ts` | ✅ covered |
| v0.6.1 | ideal-data-flow（端到端 IAP 路径） | `Work/ideal-data-flow.ts` + RFC + Blueprint | `Work/__tests__/ideal-data-flow.test.ts`, e2e | ✅ covered + e2e |
| v0.6.1 | OXN deprecation（legacy → new） | `Asset/migrate.ts` | `Asset/__tests__/migrate*.test.ts` | ✅ covered |
| v0.6.1 | Phase A/B/C/D | `Work/phase-*.ts` | `Work/__tests__/phase*.test.ts` | ✅ covered |
| v0.6.1 | PR1 RFC T19 cleanup | `Asset/blueprint.ts` | `Asset/__tests__/blueprint*.test.ts` | ✅ covered |
| v0.6.1 | PR2 MD prefix（asset 默认 frontmatter） | `Asset/markdown.ts` | `Asset/__tests__/markdown*.test.ts` | ✅ covered |
| v0.6.1 | PR3 Asset canonical flip | `Asset/canonical.ts` | `Asset/__tests__/canonical*.test.ts` | ✅ covered |
| v0.6.1 | PR4 extension builtin md | `Asset/builtin-ext.ts` | `Asset/__tests__/builtin-ext.test.ts` | ✅ covered |
| v0.6.1 | PR4 langium-freeze（DSL 冻结） | `oxl/md-pipeline/` | `oxl/__tests__/md-pipeline*.test.ts` | ✅ covered |
| v0.6.1 | Three-boundary blueprint elevation | `Asset/blueprint.ts` | `Asset/__tests__/blueprint*.test.ts` | ✅ covered |
| v0.6.1 | Trust chain completion | `Asset/trust-chain.ts` | `Asset/__tests__/trust*.test.ts` | ✅ covered |

## 2. v0.6.2-alpha.0/1/2/3：alpha 演进期

### 2.1 v0.6.2-alpha.1：规划池 + 术语 + RFC-0013

| 特性 | source module | test file | 状态 |
|---|---|---|---|
| 规划池（Pool）模块 | `packages/engine/src/Pool/` | `Pool/__tests__/{gatekeeper,create,list}.test.ts` (ADR-P4 +26 case) | ✅ covered |
| Pool create 命令 | `cli/src/commands/pool-create.ts` | `cli/__tests__/pool-create*.test.ts` | ✅ covered |
| Pool list / approve / review / reject | `cli/src/commands/pool-*.ts` | `cli/__tests__/pool-*.test.ts` | ✅ covered |
| sync-domain-glossary 脚本 | `scripts/sync-domain-glossary.ts` | **无**（script 类，逻辑已由 0.6.3 Work G 精简） | 🟡 manual review |
| 术语新增（7 条 + Bootstrapping Closure v2） | `.openxenon/assets/domains/*.md` | **N/A**（domain 是设计，不是 code） | ✅ by design |
| RFC-0013 Errata | `docs/rfc/...` | **N/A**（RFC 是设计） | ✅ by design |

### 2.2 v0.6.2-alpha.2：RFC-0015 + RFC-0016 + Meta + Collab

| 特性 | source module | test file | 状态 |
|---|---|---|---|
| **RFC-0015 D1**：产物命名（PROOF_OUTCOME_MD / work-snapshot.md / PROOF_RUNNING_JSON） | `packages/engine/src/kernel/constants.ts` | `kernel/__tests__/constants.test.ts` | ✅ covered |
| **RFC-0015 D2**：Taint 机制（probe handler 经 Provider IO） | `packages/engine/src/infra/probes/*` (18/19) | `infra/probes/__tests__/*.test.ts` (含 ADR-P5 mock 化) | ✅ covered |
| **RFC-0015 D3**：proof outcome writer | `packages/engine/src/Proof/outcome-writer.ts` | `Proof/__tests__/outcome-writer.test.ts` (ADR-P5 +21 case) | ✅ covered |
| **RFC-0015 D4**：trust chain | `packages/engine/src/Asset/trust-chain.ts` | `Asset/__tests__/trust*.test.ts` | ✅ covered |
| **RFC-0015 D5**：probe mock 化（spyOn + mock.restore()） | `infra/probes/{shell-exec,ts-compiles}.test.ts`, `infra/providers/shell-provider.test.ts` | 同一文件（commit `495ebd3`） | ✅ covered |
| **RFC-0015 D6**：verdict strategy 改写 | `kernel/verdicts/` | `kernel/__tests__/verdicts.test.ts` | ✅ covered |
| **RFC-0015 D7**：trust chain closure | `Asset/trust-closure.ts` | `Work/__tests__/trust-closure.test.ts` | ✅ covered |
| **RFC-0016 D1**：file-hash probe | `infra/probes/file-hash.ts` | `infra/probes/__tests__/file-hash.test.ts` | ✅ covered |
| **RFC-0016 D2**：test-coverage probe | `infra/probes/test-coverage.ts` | `infra/probes/__tests__/test-coverage.test.ts` | ✅ covered |
| **RFC-0016 D3**：shell-out probe | `infra/probes/shell-out.ts` | `infra/probes/__tests__/shell-out.test.ts` | ✅ covered |
| **RFC-0016 D4**：json-schema probe | `infra/probes/json-schema.ts` | `infra/probes/__tests__/json-schema.test.ts` | ✅ covered |
| **Meta layer**：RFC-0018 + check-doc-boundary 新规则 | `scripts/check-doc-boundary.ts` (5 新规则) | `scripts/__tests__/check-doc-boundary.test.ts` | ✅ covered |
| **Collab boundary**：ADR-0084 跨层引用 | `Asset/` + `infra/probes/doc-boundary.ts` | `infra/probes/__tests__/doc-boundary.test.ts` | ✅ covered |

### 2.3 v0.6.2-alpha.3：RFC-0019 路由 + Promote

| 特性 | source module | test file | 状态 |
|---|---|---|---|
| Draft 4 命令（create / list / archive / discard） | `cli/src/commands/draft.ts` + `engine/src/Draft/{create,list,archive,discard}.ts` | `engine/src/Draft/__tests__/{create,list,archive,discard}.test.ts` | ✅ covered |
| Draft `oxnrc draftDir` 配置 | `engine/src/config/project-config.ts` | `__tests__/project-config.test.ts` | ✅ covered |
| RFC-0019 NG1-NG5：路由总览 + 7 sub-target | `engine/src/Draft/{promote,promote-dispatch}.ts` | `Draft/__tests__/promote-dispatch.test.ts` (17 case, NG6) | ✅ covered |
| RFC-0019 NG6：Promote 实际写文件 | `engine/src/Draft/promote-dispatch.ts` | `Draft/__tests__/promote-dispatch.test.ts` | ✅ covered |
| RFC-0019 D7：retarget 保留工程师内容 | `engine/src/Draft/retarget.ts` | `Draft/__tests__/retarget.test.ts` | ✅ covered |
| Skeleton 派生（draft-skeleton-fork） | `engine/src/Draft/skeleton.ts` | `Draft/__tests__/skeleton.test.ts` | ✅ covered |
| **v0.6.3 Fix #1**：`oxn init` 落地 7 skeleton 模板 | `cli/src/init/builtin-skeleton-templates.ts` (279 行) | `cli/src/init/__tests__/` (覆盖 builtin-skeleton-templates.ts) | ✅ covered |
| **v0.6.3 Fix #2**：`.oxnrc` draftPromote 配置 + `--target-dir` flag | `engine/src/Draft/promote.ts` (扩 commit/force/rfcNumber) | `Draft/__tests__/promote*.test.ts` (+7 case) | ✅ covered |
| **v0.6.3 Fix #3**：retarget 保留 frontmatter | `engine/src/Draft/retarget.ts` | `Draft/__tests__/retarget.test.ts` (更新 +2 case) | ✅ covered |

## 3. v0.6.3：RFC-0019 NG6 + 收尾期

| 特性 | source module | test file | 状态 |
|---|---|---|---|
| Promote `--commit` 实际写文件 | `engine/src/Draft/promote-dispatch.ts` | `Draft/__tests__/promote-dispatch.test.ts` (6 RFC + 7 Asset + 2 Work + 2 edge = 17 case) | ✅ covered |
| `--force` 覆盖 | `engine/src/Draft/promote-dispatch.ts` | 同上 | ✅ covered |
| 自动 RFC-XXXX 编号 | `engine/src/Draft/promote-dispatch.ts` (扫描 max+1) | 同上 | ✅ covered |
| 5 AssetKind per-kind frontmatter | `engine/src/Draft/promote-dispatch.ts` | 同上 | ✅ covered |
| 冲突检测（默认拒绝） | `engine/src/Draft/promote-dispatch.ts` | 同上 | ✅ covered |
| 事务语义（写失败回滚） | `engine/src/Draft/promote-dispatch.ts` | 同上 | ✅ covered |
| `OXN_DRAFT_PROMOTE_TARGET_EXISTS` 等 3 错误码 | `engine/src/Draft/errors.ts` | `Draft/__tests__/promote-dispatch.test.ts` | ✅ covered |
| **Q1**：7 skeleton `entity: skeleton` 独立 entity | `cli/src/init/builtin-skeleton-templates.ts` + `engine/src/infra/probes/boundary-guard.ts` | `infra/probes/__tests__/boundary-guard.test.ts` | ✅ covered |
| **Q3**：inv-5 推荐性 + `OXN_DRAFT_SKELETON_NOT_FOUND` hint | `engine/src/Draft/skeleton.ts` | `Draft/__tests__/skeleton.test.ts` | ✅ covered |
| **Work G**：sync-domain-glossary 精简 | `scripts/sync-domain-glossary.ts` (-132 行) | **manual**（script 改动无 test，依赖 smoke-run 验证） | 🟡 manual review |

## 4. ADR-0088 自身 phase

| Phase | commit | test 增量 | 状态 |
|---|---|---|---|
| P0 + P0d | `fd62346` | 修复 232 test drift；零回归 | ✅ done |
| P1 | `6eb3d4c` (同期 P3) | bunfig 精确化（infra 5 子目录进并发） | ✅ done |
| P3 CLI 桶拆分 | `6eb3d4c` | 14 e2e 移到 `__tests__/e2e/`；wall-clock -6800ms | ✅ done |
| P4 Insight unit | `f941e5c` | +22 case | ✅ done |
| P4 Pool unit | `222df0b` | +26 case | ✅ done |
| P5 Proof unit | `fff3cc7` | +12 + 9 = +21 case | ✅ done |
| P6 拆分 | `phase 3.4` | 1007 + 895 行 → 6 文件 | ✅ done (phase 3.4) |
| P7 orphan | `phase 3.1` | N/A（不存在 orphan） | ✅ done |
| P8 核实 | `phase 3.2` | 删 4 废弃 `.skip`（-21 行） | ✅ done (phase 3.2) |
| P2 审计 | `phase 3.5` | **本 draft** | ✅ done (phase 3.5) |

## 5. 缺口与冗余清单

### 5.1 Gap（特性无测试 / 测试不足）

| 缺口 | 影响 | 建议 |
|---|---|---|
| sync-domain-glossary.ts 脚本 | 0 自动化 test；依赖 `bun scripts/sync-domain-glossary.ts --write` 手动验证 | 加 `scripts/__tests__/sync-domain-glossary.test.ts`（v0.7.x follow-up） |
| builtin-skeleton-templates.ts（279 行） | 仅 oxn init e2e 覆盖；缺 7 skeleton 模板 string-by-string unit | 加 `cli/src/init/__tests__/builtin-skeleton-templates.test.ts`（v0.7.x follow-up） |

### 5.2 Redundant（重复 / 废弃测试）

| Redundant | 处理 |
|---|---|
| `external-cli-e2e.test.ts` 4 个 `.skip` 块（旧 ## Externals H2 废弃） | ✅ 已删 21 行（ADR-P8 phase 3.2） |
| `validatePartTemplates (@deprecated)` describe label（误导） | ✅ 标签改为正常 describe（ADR-P8 phase 3.2） |
| `*.serial.test.ts` rename（历史 stale） | ✅ 13cf1d6 → 495ebd3 已 revert |

### 5.3 Stale（test 引用已删特性）

| Stale | 处理 |
|---|---|
| 无 stale 测试（v0.6.0-v0.6.3 期间所有 module 都保留） | ✅ clean |

## 6. cross-reference：P7 / P8 / P2 三角验证

| 维度 | P7 (orphan) | P8 (废弃核实) | P2 (本审计) |
|---|---|---|---|
| orphan tests | 0 found（ADR 描述失准） | — | — |
| fixtures 冗余 | 0 found（5 fixture 全部 used） | — | — |
| 废弃 `.skip` | — | 4 found, 21 行已删 | 一致 ✅ |
| 误导 `@deprecated` label | — | 1 found, 标签已修 | 一致 ✅ |
| Stale rename | — | 1 found (已 revert) | 一致 ✅ |
| sync-domain-glossary 测试 | — | — | 🟡 follow-up |

## 7. 决策 ↔ 测试覆盖矩阵

| 决策 (ADR-0088) | 测试层 | 状态 |
|---|---|---|
| D1 4 层测试架构（T0-T3） | bunfig.toml 配置 | ✅ |
| D2 测试 vs Proof 边界 | 文档固化，无 phase 落地 | ✅ by design |
| D3 "不评判"哲学 | 文档固化，无 phase 落地 | ✅ by design |
| D4 T3 CLI 双轨制 | e2e 14 文件 + unit 桶（ADR-P3） | ✅ |
| D5 L0-L3 → T0-T3 映射 | 文档 + bunfig 间接落地 | ✅ |
| D6 colocated + 三层嵌套 | 测试目录结构（ADR-P3 + ADR-P6 拆分） | ✅ |
| D7 typecheck 覆盖 | tsconfig 含 engine src + tests | ✅ |
| **D8 feature→test 映射** | **本 audit** | ✅ done |
| D9 子包 files | follow-up ADR-0089 | 🔵 deferred |

## 8. 不在范围（明确推迟）

- ❌ 代码覆盖率 %（bunfig 未配 coverage；ADR-0088 §D6 决议区分 feature→test 映射 ≠ 代码覆盖率）
- ❌ sync-domain-glossary.ts 加 unit test（v0.7.x follow-up）
- ❌ builtin-skeleton-templates.ts 加 unit test（v0.7.x follow-up）
- ❌ ADR-0089 子包 files 策略（独立 ADR 候选）
- ❌ Per-feature probe coverage 细化（与 D8 重复，留 v0.7.x）

## 9. 总结

| 维度 | 数值 |
|---|---|
| 总特性数（v0.6.0 → v0.6.3） | ~50 |
| ✅ covered | ~48 |
| 🟡 manual review（脚本类） | 2 |
| ❌ gap | 0（除 2 个 manual 维度外全 covered） |
| redundant 已清理 | 21 行 + 1 标签 |
| stale | 0 |

**结论**：v0.6.0 → v0.6.3 期间所有核心特性（Asset / Work / Proof / Insight / Pool / Draft）均有 unit + 部分 e2e 覆盖；仅脚本类（sync-domain-glossary / builtin-skeleton-templates）依赖 manual smoke-run，建议 v0.7.x 加 unit test 收口。ADR-0088 P2 审计目标达成。

## 10. 关联

- **ADR-0088**：`docs/adrs/0088-test-suite-architecture.md` §D8 + Migration Plan §P2
- **本 draft** 落点：`.openxenon/drafts/test-coverage-audit.md`（作为 v0.7.x 测试补缺的输入）
- **wrap-up 主 draft**：`.openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md` Phase 3 §3.5