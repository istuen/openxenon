# ADR→RFC 迁移主计划

> **状态**：执行总参考（流动草稿）
> **创建**：2026-07-25
> **作者**：opencode（与 user 协作，grilling #6 产出）
> **关联**：`.openxenon/drafts/rfc/0082-diagnostic-unification.md`（前置设计，本计划不涉及实施）；本计划是独立的文档架构重构

---

## 背景与目标

OXN 当前文档体系有 **ADR + OXP 双层** 决策记录机制，存在 4 个问题：

1. **双层冗余**：ADR（内部 SSOT，append-only）+ OXP（外部归档，frozen）双身份模型增加认知负担
2. **术语陈旧**：ADR 已累积 64 条 active + 6 条 Superseded，部分 ADR 内容已被后续 ADR 废弃但未归档
3. **边界违规**：19 条 `docs/` → `.openxenon/` 跨层链接，`check-doc-boundary.ts` 存在但未启用 pre-commit
4. **内置 Asset 不一致**：`OxnBuiltinRegistry` 硬编码 mock（4 probes）与 `catalog.ts`（15 probes）+ `src/builtin/probes/*.md`（15 文件）三个 SSOT 不一致

**目标**：废除 ADR+OXP 双层，统一为单层 **RFC（规范）** 机制——按主题归并 48 条 Adopted ADR 为 8 个版本级 RFC + 4 个 meta-RFC（grilling 决策），同时修复内置 Asset 不一致 + 启用文档边界守门。

---

## 决策清单（19 项，全部锁定）

### 用户原计划 12 项（grilling #6 决策）

| # | 决策 | 选择 |
|---|---|---|
| D1 | RFC 替代范围 | RFC 替代 ADR + OXP，直接是 SSOT |
| D2 | 旧 ADR 迁移 | 35 条 Adopted ADR 全迁为 RFC（实际 48 条，见 D13） |
| D3 | RFC 粒度 | 版本级设计文档（D1/D2/D3 决策段） |
| D4 | 自举循环 | Blueprint 可手动创建，存在后强制走 Work；内置基本 Asset |
| D5 | docs 隔离 | RFC 只引用 docs/glossary/ |
| D6 | RFC 演进 | Frozen + errata |
| D7 | ADR 分组 | 按主题 |
| D8 | 内置 Asset | 两层（@oxn/ fallback + init --starter） |
| D9 | RFC 编号 | 顺序编号 + theme 字段 |
| D10 | RFC 语言 | 中文 only |
| D11 | drafts/rfc/ 去留 | 保留（放未定稿 RFC 草稿） |
| D12 | 新术语归属 | 新建 oxn-project-domain |

### 探索验证后追加 7 项决策

| # | 决策 | 选择 | 触发原因 |
|---|---|---|---|
| D13 | 主题重分 | RFC-0008 重定义为「命名/演进策略」；ADR-0052→RFC-0001, 0068→RFC-0007, 0066/0071/0080→RFC-0008 | 探索发现 RFC-0008（历史/命名）有 0 条独占 ADR |
| D14 | Builtin scope 机制 | OxnBuiltinRegistry 启动时加载 .md（@oxn/ 保持内存解析，不改 scope 层） | F1/F2 发现 @oxn/ 绕过 FS + Registry 是硬编码 mock |
| D15 | Boundary enforcement | 修复 19 条跨层链接 + 启用 pre-commit（lefthook） | F6 发现 19 条违规 + checker 未启用 |
| D16 | Commit 策略 | 先 commit ~130 文件再迁移 | 工作树风险高 |
| D17 | Meta-RFC 归属 | 4 个 meta-RFC 与 8 主题 RFC 一起在 Phase 2 做（共 12 RFC） | 减少 Work 开销 |
| D18 | Registry 重写范围 | Phase 4 只做 probes+blueprints（15+3=18 文件）；domains+workflows builtin 延后 | 降低 Phase 4 风险，RFC-0011 记录延后计划 |
| D19 | ADR 归档目标 | 物理移动到 `.openxenon/.archived/docs/adrs/` | 与已归档的 6 条 Superseded ADR 统一 |

---

## 关键验证发现（探索产出）

### 假设偏差修正

| # | 用户计划假设 | 实际情况 | 影响 |
|---|---|---|---|
| H1 | "35 条 Adopted ADR / 53 total" | **48 Adopted / 64 active**（0072-0082 batch 新增 9 + INDEX Section 1 空缺 4） | Phase 2 范围 +37% |
| H2 | "8 主题，每主题 ~1-10 ADR" | RFC-0008（历史/命名）**0 条独占 ADR** | D13 重新分主题 |
| H3 | "~15 条未注册草稿" | **19 条** | Phase 3.4 范围略增 |
| H4 | "src/builtin/ 新增 domains/ + workflows/" | `src/builtin/` 已有 `probes/`(15) + `blueprints/`(3)，无 domains/workflows | D18 延后 domains+workflows |

### 10 个关键发现

| # | 发现 | 影响 Phase | 状态 |
|---|---|---|---|
| F1 | `OxnBuiltinRegistry` 是硬编码 mock：4 probes + 3 parts + 0 blueprints（catalog.ts 有 15 probes，.md 文件有 15 probes + 3 blueprints）— 三个 SSOT 不一致 | Phase 4 核心难点 | 待修 |
| F2 | `@oxn/` scope 绕过文件系统：`getScopeRoot('oxn')` 返回 null，只查内存 registry | Phase 4 | D14 决定不改 |
| F3 | stale path bug：`oxn-scope.ts` 用 `.openxenon/arsenals/`，实际是 `.openxenon/assets/`（有 `TODO(v1.1-path)` 标记） | Phase 4 顺手修 | 待修 |
| F4 | `oxn init` 不拷贝任何 builtin asset，无 `--starter` flag | Phase 4 | D18 延后 |
| F5 | `builtin-assets-md.test.ts` 守卫 15 probes + 3 blueprints，不覆盖 domains/workflows | Phase 4 | D18 延后 |
| F6 | 19 条 docs→.openxenon/ 跨层链接（11 条 dev→drafts 违规）— `check-doc-boundary.ts` 存在但未启用 pre-commit | Phase 5 | D15 修复+启用 |
| F7 | VitePress config：6 处 "决策记录" + 7 处 "OXP" + 6 处 slogan 文本 | Phase 1+5 | 待修 |
| F8 | 3 条 OXP 文件的 README 含跨层链接（docs/rfc → .openxenon/drafts）— 违反 `rfc-no-drafts-isolated` 规则 | Phase 3 | 重写时移除 |
| F9 | `doc-author` workflow 已有 glossary-only 约束（line 66）— 用户的 "RFC 只引用 glossary" 约束放 `doc-rfc-workflow.md` validate slot 更合适 | Phase 1 | 调整位置 |
| F10 | INDEX.md 有 6 处结构性错误：Section 1 空、Section 4/7 计数不符、ADR-0052 重复、ADR-0057 状态孤立 | Phase 3 | 删除 INDEX 自动消失 |

### 探索文件路径速查

| 关键文件 | 路径 |
|---|---|
| ADR INDEX | `.openxenon/drafts/rfc/INDEX.md` |
| OXP README | `docs/rfc/zh-cn/README.md` |
| 3 条 OXP | `docs/rfc/zh-cn/OXP-000{1,2,3}-*.md` |
| VitePress config | `docs/.vitepress/config.ts` |
| doc-rfc-workflow Blueprint | `.openxenon/assets/blueprints/doc-rfc-workflow.md` |
| doc-author workflow | `.openxenon/assets/workflows/doc-author.md` |
| 7 个 Domain 文件 | `.openxenon/assets/domains/oxn-*-domain.md` |
| OxnBuiltinRegistry | `packages/engine/src/oxl/scope/oxn-builtin-registry.ts` |
| scope 定义 | `packages/engine/src/oxl/scope/oxn-scope.ts` |
| workspace manager | `packages/engine/src/oxl/scope/oxn-workspace-manager.ts` |
| scope 测试 | `packages/engine/src/oxl/__tests__/scope-provider.test.ts` |
| probe catalog SSOT | `packages/engine/src/kernel/verdicts/catalog.ts` |
| init 命令 | `packages/cli/src/commands/init.ts` |
| builtin assets 测试 | `src/builtin/__tests__/builtin-assets-md.test.ts` |
| 15 builtin probes | `src/builtin/probes/*.md` |
| 3 builtin blueprints | `src/builtin/blueprints/*.md` |
| boundary checker | `scripts/check-doc-boundary.ts` |
| lefthook config | `lefthook.yml` |
| AGENTS.md 三层架构段 | `AGENTS.md` L85-151 |
| CONTEXT-MAP | `CONTEXT-MAP.md` |
| oxn-system roadmap | `.openxenon/assets/roadmaps/oxn-system.md` |
| glossary hub | `docs/glossary/zh-cn/_index.md` |

---

## RFC 主题分组（48 Adopted ADR → 8 主题 + 4 meta-RFC）

### 8 主题 RFC

| RFC | 主题 | ADR 数 | ADRs |
|---|---|---|---|
| RFC-0001 | OXL / Blueprint 哲学 | 3 | 0001, 0021, 0052 |
| RFC-0002 | Kernel / L0 边界 | 8 | 0002, 0003, 0008, 0009, 0010, 0011, 0013, 0037 |
| RFC-0003 | AI 协作哲学 | 8 | 0012, 0020, 0031, 0032, 0057, 0058, 0067, 0076 |
| RFC-0004 | Work / Asset 体系 | 13 | 0004, 0005, 0024, 0025, 0035, 0049, 0050, 0051, 0054, 0055, 0056, 0061, 0075 |
| RFC-0005 | Insight / Skill | 2 | 0018, 0074 |
| RFC-0006 | Docs / Brand | 1 | 0023 |
| RFC-0007 | Domain 词汇与 OXN 定位 | 10 | 0059, 0060, 0068, 0069, 0070, 0072, 0073, 0077, 0078, 0079 |
| RFC-0008 | 命名 / 演进策略 | 3 | 0066, 0071, 0080 |
| **合计** | | **48** | |

**主题调整说明**（D13）：
- ADR-0052（Langium 退役）→ RFC-0001（OXL 哲学，格式选择决策）
- ADR-0068（Daemon 职责）→ RFC-0007（OXN 定位与边界）
- ADR-0066（术语精简）→ RFC-0008（命名/演进策略）
- ADR-0071（废除 auditTrail）→ RFC-0008（字段废弃演进）
- ADR-0080（错误术语统一）→ RFC-0008（命名/演进策略）

### 4 个 meta-RFC（grilling 产出）

| RFC | 标题 | 核心 |
|---|---|---|
| RFC-0009 | 文档三情态分离 | Asset（定义性）/ RFC（规定性）/ Doc（描述性），废除 ADR+OXP 双层 |
| RFC-0010 | RFC frozen+errata 演进策略 | accepted 后核心冻结，supersede 走新 RFC 标 §DY |
| RFC-0011 | 内置 Asset 两层机制 | @oxn/ scope fallback + init --starter 拷贝；含 D18 延后计划 |
| RFC-0012 | 自举种子豁免 | src/builtin/ Asset 手动创建不经 Work，后续变更走 Work |

### 3 条 OXP 合并映射

| OXP | 内容 | 合并到 RFC |
|---|---|---|
| OXP-0001 | 术语精简（ADR-0066） | RFC-0008 |
| OXP-0002 | 彻底不判原则（ADR-0067） | RFC-0003 |
| OXP-0003 | Daemon 职责边界（ADR-0068） | RFC-0007 |

---

## oxn-project-domain 术语草案

Phase 0 将创建 `.openxenon/assets/domains/oxn-project-domain.md`，定义 7 个 Term：

```
### RFC
- desc: 工程师对 OpenXenon 的规范（规定性文档）；住 docs/rfc/zh-cn/；frozen+errata；
  顺序编号 + theme 字段；中文 only；只引用 docs/glossary/。替代旧 ADR+OXP 双层。

### Built-in Asset
- desc: 随 OXN 发布的内置 Asset；住 src/builtin/；通过 @oxn/ scope 解析；
  项目可用 @prj/ override。自举种子——手动创建不经 Work。

### Starter Asset
- desc: oxn init --starter 拷贝到 .openxenon/assets/ 的 Built-in Asset 副本；
  用户拥有可改。与 @oxn/ fallback 两层覆盖。

### 定义性情态（Definitional Modality）
- desc: Asset 的文档情态——回答"X 是什么"；住 .openxenon/assets/。

### 规定性情态（Prescriptive Modality）
- desc: RFC 的文档情态——回答"为什么决定 X"；住 docs/rfc/。

### 描述性情态（Descriptive Modality）
- desc: Doc 的文档情态——回答"怎么用 X"；住 docs/{product,dev}/。

### 自举种子豁免（Bootstrap Seed Exemption）
- desc: src/builtin/ 内置 Asset 手动创建不经 Work；存在后后续变更走 asset-evolve Work。
```

---

## 7 阶段实施计划

### Phase -1: Commit 当前工作树（前置，~0.5 天）

**目标**：把 ~130 个未 commit 文件按逻辑分块 commit，干净起点。

| Commit | 内容 | 文件数 |
|---|---|---|
| C1 | ADR-0081/0082 设计稿 + error-code-registry + warn-removal-plan | ~5 |
| C2 | ADR-0066-0082 batch + INDEX + 17 RFC + 6 drafts | ~25 |
| C3 | docs/ topic-first 重构 + VitePress + glossary | ~30 |
| C4 | 源码改动（cli + engine + daemon） | ~45 |
| C5 | changelog 清理（删旧 + 新增 pre-0-6-history） | ~65 |
| C6 | AGENTS.md + README + CONTEXT-MAP + skills-lock | ~5 |

**验证**：每个 commit 后跑 `bun run typecheck && bun test`。
**风险**：C4 源码改动可能与 RFC 迁移冲突——需确认这些改动是否已 typecheck/test 通过。

---

### Phase 0: 新建 oxn-project-domain（4 步，~1 天）

| 步骤 | 内容 | 方式 | 产出 |
|---|---|---|---|
| 0.1 | 创建 `oxn-project-domain.md`，7 个 Term | `oxn work create oxn-project-domain --blueprint asset-workflow` | 新建 1 文件 |
| 0.2 | 更新 `CONTEXT-MAP.md`：7→8 context + 关系图 | 手动编辑 | 编辑 1 文件 |
| 0.3 | 更新 `oxn-domain.md` references 新增 `oxn-project-domain` | `oxn work create evolve-oxn-domain --blueprint asset-workflow` | 编辑 1 文件 |
| 0.4 | 新建 `docs/glossary/zh-cn/project-terms.md` + 更新 `_index.md` | `oxn work create project-glossary --blueprint doc-prod-workflow` | 新建+编辑 2 文件 |

**依赖**：Phase -1 完成

---

### Phase 1: RFC 格式 + Blueprint 更新（5 步，~0.5 天）

| 步骤 | 内容 | 产出 |
|---|---|---|
| 1.1 | 定义 RFC frontmatter 格式：`entity: rfc, id: RFC-XXXX, theme, status, date, supersedes, superseded-by, related, synced-at` | 设计 draft |
| 1.2 | 定义 RFC 正文模板：摘要 → 决策段 → 影响范围 → 相关术语(引用 glossary) → Errata | 设计 draft |
| 1.3 | 更新 `doc-rfc-workflow` Blueprint：5 处改动（abstract L5,7 + blockquote L19 + author L55 + promote L72）— OXP→RFC | 编辑 1 文件 |
| 1.4 | 新增 RFC 专属约束到 `doc-rfc-workflow.md` validate slot（F9：不放 doc-author，放 validate slot 更合适） | 编辑 1 文件 |
| 1.5 | 更新 VitePress `config.ts`：L203 label + L206 title + L207 desc + L220-223 sidebar + 6 处 "决策记录" → "规范 (RFC)" | 编辑 1 文件 |

**依赖**：Phase 0 完成（oxn-project-domain 提供 RFC Term 定义）
**验证**：`bun run docs:build` 通过

---

### Phase 2: 48 ADR + 4 grilling 决策 → 12 RFC（~3-4 天）

每个 RFC 走 IAP 4 阶段（gather→author→validate→promote），落盘到 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`。

| 步骤 | RFC | ADR 数 | Work 命令 |
|---|---|---|---|
| 2.1 | RFC-0001 OXL/Blueprint 哲学 | 3 | `oxn work create rfc-0001-oxl-philosophy --blueprint doc-rfc-workflow` |
| 2.2 | RFC-0002 Kernel/L0 边界 | 8 | `oxn work create rfc-0002-kernel-l0 --blueprint doc-rfc-workflow` |
| 2.3 | RFC-0003 AI 协作哲学 | 8 | `oxn work create rfc-0003-ai-collaboration --blueprint doc-rfc-workflow` |
| 2.4 | RFC-0004 Work/Asset 体系 | 13 | `oxn work create rfc-0004-work-asset --blueprint doc-rfc-workflow` |
| 2.5 | RFC-0005 Insight/Skill | 2 | `oxn work create rfc-0005-insight-skill --blueprint doc-rfc-workflow` |
| 2.6 | RFC-0006 Docs/Brand | 1 | `oxn work create rfc-0006-docs-brand --blueprint doc-rfc-workflow` |
| 2.7 | RFC-0007 Domain 词汇与 OXN 定位 | 10 | `oxn work create rfc-0007-domain-positioning --blueprint doc-rfc-workflow` |
| 2.8 | RFC-0008 命名/演进策略 | 3 | `oxn work create rfc-0008-naming-evolution --blueprint doc-rfc-workflow` |
| 2.9 | RFC-0009 文档三情态分离 | grilling | `oxn work create rfc-0009-doc-three-modalities --blueprint doc-rfc-workflow` |
| 2.10 | RFC-0010 RFC frozen+errata 演进策略 | grilling | `oxn work create rfc-0010-frozen-errata --blueprint doc-rfc-workflow` |
| 2.11 | RFC-0011 内置 Asset 两层机制 | grilling | `oxn work create rfc-0011-builtin-asset-two-layer --blueprint doc-rfc-workflow` |
| 2.12 | RFC-0012 自举种子豁免 | grilling | `oxn work create rfc-0012-bootstrap-exemption --blueprint doc-rfc-workflow` |

**IAP 流程**（每个 Work）：
1. **gather**：收集对应 ADR 内容（逐个阅读，不能机械合并）
2. **author**：按 RFC 模板编写版本级 RFC（摘要 → 决策段 → 影响范围 → 相关术语 → Errata）
3. **validate**：glossary 引用 + heading skeleton + lint
4. **promote**：落盘 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`

**OXP 内容合并**：
- OXP-0001（术语精简）→ 合并到 RFC-0008（步骤 2.8）
- OXP-0002（彻底不判原则）→ 合并到 RFC-0003（步骤 2.3）
- OXP-0003（Daemon 职责）→ 合并到 RFC-0007（步骤 2.7）

**依赖**：Phase 1 完成（RFC 格式 + Blueprint 更新）
**风险**：
- R1: RFC-0004（13 ADR）工作量溢出 → 可拆为 RFC-0004a（Work）+ RFC-0004b（Asset）
- R5: ADR 内容提取需逐个阅读理解，不能机械合并
- 提前在 promote 时记录 ADR→RFC 映射（供 Phase 5 链接修复用）

---

### Phase 3: 废除 OXP + 归档 ADR（5 步，~0.5 天）

| 步骤 | 内容 | 文件 |
|---|---|---|
| 3.1 | 删除 3 条 OXP 文件（内容已在 Phase 2 合并到 RFC） | 删 `docs/rfc/zh-cn/OXP-000{1,2,3}-*.md` |
| 3.2 | 归档 64 条 ADR：`.openxenon/drafts/rfc/00XX-*.md` → `.openxenon/.archived/docs/adrs/`（D19） | 移动 64 文件 |
| 3.3 | 删除 `.openxenon/drafts/rfc/INDEX.md`（被 `docs/rfc/zh-cn/README.md` 替代；F10 的 6 处结构性错误随删除自动消失） | 删 1 文件 |
| 3.4 | 保留 19 条未定稿草稿在 `.openxenon/drafts/rfc/`（v0.7-emergence-rfc.md 等） | 不动 19 文件 |
| 3.5 | 重写 `docs/rfc/zh-cn/README.md`：RFC 索引 + 生命周期 + ADR→RFC 迁移说明（F8：移除跨层链接） | 重写 1 文件 |

**依赖**：Phase 2 完成（所有 RFC 已落盘）
**注意**：归档 64 文件是物理移动，需确保 git 正确追踪 `mv`

---

### Phase 4: OxnBuiltinRegistry .md 加载（4 步，~1.5 天）

> **范围收窄**（D18）：只做 probes+blueprints；domains+workflows builtin 延后，RFC-0011 记录延后计划。

| 步骤 | 内容 | 文件 |
|---|---|---|
| 4.1 | 重写 `OxnBuiltinRegistry`：`_initProbes()` + `_initBlueprints()` 改为从 `src/builtin/**/*.md` 加载（mdast pipeline） | 编辑 `packages/engine/src/oxl/scope/oxn-builtin-registry.ts`（239 行重写） |
| 4.2 | 修复 4 probes inconsistency（F1）：4→15 probes + 0→3 blueprints + 删除 3 phantom parts（无 .md 文件） | 同上 |
| 4.3 | 更新 `scope-provider.test.ts` 断言：`>=4` → `===15` probes + blueprint 守卫 | 编辑 1 测试文件 |
| 4.4 | 修复 stale path（F3）：`oxn-scope.ts` `.openxenon/arsenals/` → `.openxenon/assets/` | 编辑 1 文件 |

**不包含**（延后到后续迭代，RFC-0011 记录）：
- ~~`src/builtin/` 新增 `domains/` + `workflows/` 子目录~~
- ~~拷贝 starter set 到 `src/builtin/`~~
- ~~`oxn init --starter` flag~~
- ~~`builtin-assets-md.test.ts` 扩展 domains+workflows 守卫~~

**依赖**：Phase 0 完成（oxn-project-domain 定义 Built-in Asset Term）
**可与 Phase 2/3 并行**（不涉及 ADR/RFC 文件）
**风险**：
- R2: mdast pipeline 在 L1-OXL，Registry 也在 L1，不跨层——依赖检查应通过
- `scope-provider.test.ts`（L175-260）需更新断言

---

### Phase 5: 文档同步 + 清理 + boundary enforcement（5 步，~1 天）

| 步骤 | 内容 | 文件 |
|---|---|---|
| 5.1 | 重写 `AGENTS.md` §文档三层架构（L85-151）：ADR/OXP → RFC 三情态；OXP 生命周期段重写；4 条 Promote 工作流段更新 | 编辑 1 文件 |
| 5.2 | 更新 `oxn-system.md` Roadmap `doc` scene：新增 `oxn-project-domain` 行；`doc-rfc-workflow` 描述去掉 "ADR" | 编辑 1 文件 |
| 5.3 | 修复 19 条跨层链接（F6）：11 条 dev→drafts 违规 → 改为引用 `docs/rfc/zh-cn/RFC-000X-*.md`；8 条 dev→assets 链接 → 改为引用 `docs/glossary/` | 编辑 ~8 文件 |
| 5.4 | 启用 `check-doc-boundary.ts` 到 lefthook pre-commit（D15） | 编辑 `lefthook.yml` |
| 5.5 | 更新 VitePress config 6 处 slogan + nav label（F7） | 编辑 1 文件 |

**19 条跨层链接详情**（F6）：

| 文件 | 行 | 当前目标 | 修复为 |
|---|---|---|---|
| `docs/dev/zh-cn/debugging.md` | 64 | `.openxenon/drafts/rfc/0031-*.md` | `docs/rfc/zh-cn/RFC-0003-*.md` |
| `docs/dev/zh-cn/l0-l3-constitution.md` | 61 | `.../0006-*.md` | `docs/rfc/zh-cn/RFC-0004-*.md` |
| `docs/dev/zh-cn/l0-l3-constitution.md` | 62 | `.../0009-*.md` | `docs/rfc/zh-cn/RFC-0002-*.md` |
| `docs/dev/zh-cn/extending/custom-probe.md` | 46 | `.../0008-*.md` | `docs/rfc/zh-cn/RFC-0002-*.md` |
| `docs/dev/zh-cn/extending/dsl-extension.md` | 38 | `.../0052-*.md` | `docs/rfc/zh-cn/RFC-0001-*.md` |
| `docs/dev/zh-cn/extending/dsl-extension.md` | 39 | `.../v0.7-emergence-rfc.md` | 移除或改 glossary |
| `docs/dev/zh-cn/extending/custom-part.md` | 38 | `.../0024-*.md` | `docs/rfc/zh-cn/RFC-0004-*.md` |
| `docs/dev/zh-cn/extending/custom-part.md` | 39 | `.../0025-*.md` | `docs/rfc/zh-cn/RFC-0004-*.md` |
| `docs/dev/zh-cn/oxn-cli.md` | 139 | `.../v0.7-domain-hierarchy-*.md` | 移除或改 glossary |
| `docs/dev/zh-cn/oxn-engine.md` | 153 | `.../v0.7-domain-hierarchy-*.md` | 移除或改 glossary |
| `docs/dev/zh-cn/ai-collaboration.md` | 57 | `.../0012-*.md` | `docs/rfc/zh-cn/RFC-0003-*.md` |
| `docs/dev/zh-cn/oxn-cli.md` | 7,136,137 | `.openxenon/assets/domains/` | `docs/glossary/zh-cn/cli-terms.md` |
| `docs/dev/zh-cn/oxn-engine.md` | 7,147,148 | `.openxenon/assets/domains/` | `docs/glossary/zh-cn/engine-terms.md` |
| `docs/dev/zh-cn/architecture.md` | 97,287 | `.archived/` | 移除或改 glossary |

**依赖**：Phase 3 完成（RFC 文件已落盘，链接目标存在）+ Phase 4 完成（builtin asset 已就位）
**风险**：R3: boundary checker 启用可能暴露更多隐藏违规——预留调试时间

---

### Phase 6: 验证（6 项检查，~0.5 天）

| 检查 | 命令 | 期望 |
|---|---|---|
| 6.1 | `bun run docs:build` | 0 dead link + 0 build error |
| 6.2 | `bun run typecheck` | 通过 |
| 6.3 | `bun test` | 1487+ tests pass |
| 6.4 | `bun run lint` | 架构守卫通过 |
| 6.5 | `bun scripts/validate-dependencies.ts` | L0-L3 依赖图通过 |
| 6.6 | `bun scripts/check-doc-boundary.ts` | 0 跨层违规 |

---

## 执行依赖图

```
Phase -1 (commit, ~0.5d)
    ↓
Phase 0 (oxn-project-domain, ~1d) ────────────┐
    ↓                                           │
Phase 1 (RFC 格式, ~0.5d)                       │
    ↓                                           ↓
Phase 2 (12 RFC, ~3-4d)             Phase 4 (Registry, ~1.5d)  ← 可并行
    ↓                                   ↓
Phase 3 (归档, ~0.5d)                    │
    ↓                                   │
Phase 5 (文档同步, ~1d) ←────────────────┘
    ↓
Phase 6 (验证, ~0.5d)
```

**可并行**：Phase 2 与 Phase 4（不涉及相同文件）
**必须串行**：Phase -1 → 0 → 1 → 2 → 3 → 5 → 6

---

## 总工作量估算

| Phase | 工作量 | 文件改动 | 关键产出 |
|---|---|---|---|
| -1 Commit | ~0.5 天 | ~130 文件（分 6 commits） | 干净工作树 |
| 0 oxn-project-domain | ~1 天 | ~4 文件 | 新 Domain + glossary |
| 1 RFC 格式 | ~0.5 天 | ~3 文件 | RFC 模板 + Blueprint 更新 |
| 2 ADR→RFC | ~3-4 天 | ~12 RFC 文件 | 12 个版本级 RFC |
| 3 废除 OXP | ~0.5 天 | ~68 文件（移动+删除） | 3 OXP 删除 + 64 ADR 归档 |
| 4 Registry | ~1.5 天 | ~3 文件 | Registry .md 加载 + stale path 修复 |
| 5 文档同步 | ~1 天 | ~12 文件 | AGENTS.md + 19 链接 + boundary pre-commit |
| 6 验证 | ~0.5 天 | 0 | 6 项验证全过 |
| **合计** | **~8.5-9.5 天** | **~130 改 + ~50 新建/移动** | |

---

## 风险登记

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | Phase 2 RFC-0004（13 ADR）工作量溢出 | 中 | Phase 2 延期 | 可拆为 RFC-0004a（Work）+ RFC-0004b（Asset） |
| R2 | Phase 4 Registry 重写触及 L0-L3 依赖边界 | 中 | typecheck 失败 | mdast pipeline 在 L1-OXL，Registry 也在 L1，不跨层 |
| R3 | Phase 5 boundary checker 启用暴露更多隐藏违规 | 高 | Phase 5 延期 | 预留调试时间；checker 有 dry-run 模式 |
| R4 | Phase -1 commit C4 源码改动未通过 typecheck | 中 | C4 阻塞 | 先跑 `bun run typecheck` 确认 |
| R5 | 19 条跨层链接修复需逐个确认 RFC 替代链接 | 中 | Phase 5 延期 | 提前在 Phase 2 promote 时记录 ADR→RFC 映射 |
| R6 | ADR 归档 git mv 追踪失败 | 低 | Phase 3 回滚 | 使用 `git mv` 而非 `mv`；分批移动 |

---

## 进度追踪

> 每个 Phase 完成后更新此处。

| Phase | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| -1 Commit | ✅ 完成 | 2026-07-26 | 5 commits（Phase 0/2/3/4/5） |
| 0 oxn-project-domain | ✅ 完成 | 2026-07-26 | 9 Term（superset） |
| 1 RFC 格式 | ✅ 完成 | 2026-07-26 | RFC frontmatter + 模板 + Blueprint v0.2 |
| 2 ADR→RFC | ✅ 完成 | 2026-07-26 | 12 RFC 落盘（1751 行） |
| 3 废除 OXP | ✅ 完成 | 2026-07-26 | 3 删 + 72 归档 + README 重写 |
| 4 Registry | ✅ 完成 | 2026-07-26 | .md 加载 + stale path 修复 |
| 5 文档同步 | ✅ 完成 | 2026-07-26 | 见 `rfc-migration-remediation-plan.md` 收尾修复 |
| 6 验证 | ✅ 完成 | 2026-07-26 | 6 项验证全过 |

---

## 收尾修复

Phase 0-6 已完成。grilling #7 发现 10 个深层次问题由收尾修复处理：

- **G1+G3+G10**：54 死链 + 48 失效 frontmatter + Accepted 语义矛盾 → RFC 降回 Proposed → 镜像 ADR 到 `docs/adrs/` → 修链接 → 加 Errata → 升 Accepted v1.0.1
- **G2**：Boundary checker 3 盲区（B1 YAML 扫描 + B2 targetPattern 去 `^` + B3 取消 `.archived` 隐式豁免）
- **G4-G7**：README + glossary frontmatter 格式修复 + three-tier-docs.md 6 处 OXP→RFC + oxn-system.md doc scene 缺 domain + master plan 进度表

详见 [`.openxenon/drafts/rfc-migration-remediation-plan.md`](./rfc-migration-remediation-plan.md)。

---

## 附录：探索验证数据

### ADR 状态实际分布（探索验证）

| Status | INDEX 声称 | 实际（探索验证） | 说明 |
|---|---|---|---|
| ✅ Adopted | 43 | **48** | 44 在 INDEX 表 + 4 缺失（0001/0002/0003/0021，Section 1 空） |
| 🟡 Partially Adopted | 5 | 5 | — |
| 💡 Proposed | 11 | 11 | 含 ADR-0081/0082 |
| ⛔ Superseded | 6 | 6 | 已归档到 `.archived/` |
| **Total active** | 63 | **64** | 1 差异 = ADR-0057 状态孤立（文件声明 Superseded 但 INDEX 标 Adopted） |

### INDEX.md 6 处结构性错误（F10，随 Phase 3 删除自动消失）

| 问题 | 详情 |
|---|---|
| Section 1 空 | "OXL / Blueprint 哲学（8 条）" 表格 0 行；0001/0002/0003/0021 应在此 |
| Section 4 计数不符 | Header "10 条" 但实际 15 行 |
| Section 7 计数不符 | Header "14 条" 但实际 15 行 |
| ADR-0052 重复 | 同时在 Section 7 和 Section 8 |
| ADR-0057 状态孤立 | 文件声明 Superseded by ADR-0066，INDEX 仍标 Adopted，未归档 |
| Adopted 计数 off by 1 | Theme 表 44 unique Adopted，status 表声明 43 |

### 19 条未注册草稿（H3 修正：实际 19 条，非 15）

| # | 文件 | 状态 |
|---|---|---|
| 1 | `2026-07-05-archive-0040-0047-memory-series-superseded.md` | 墓碑文件 |
| 2 | `openxenon-architecture-from-adrs.md` | 架构景观提取 |
| 3 | `openxenon-architecture-from-adrs-simplified.md` | 简化版 |
| 4 | `oxn-deprecation-rfc.md` | ✅ 已实施 |
| 5 | `spike-probe-converge.md` | v0.3 spike |
| 6 | `three-boundary-blueprint-elevation-rfc.md` | ✅ 已实施 |
| 7 | `v0.6.3-asset-paper-schema-rfc.md` | 🟡 Partial |
| 8 | `v0.7-domain-hierarchy-restructure-rfc.md` | ✅ 已实施 |
| 9 | `v0.7-emergence-rfc.md` | 🟢 Approved |
| 10 | `v0.7.0-infra-ports-rfc.md` | 📝 Draft |
| 11 | `v0.7.1-ai-three-modes-rfc.md` | 📝 Draft |
| 12 | `v0.7.2-anchor-slot-rfc.md` | 📝 Draft |
| 13 | `v0.7.3-ideal-data-flow-rfc.md` | ✅ 已实施 |
| 14 | `v0.8.0-term-upstream-dag-rfc.md` | 📝 Draft |
| 15 | `v0.8.1-probe-system-evolution-rfc.md` | 📝 Draft |
| 16 | `v0.8.1-proof-traceability-rfc.md` | 📦 archived |
| 17 | `v0.8.4-probe-outcome-type-rfc.md` | 📦 archived |
| 18 | `version-unification-rfc.md` | 📝 Draft |
| 19 | `work-unified-model-rfc.md` | ✅ 已实施 |

### OxnBuiltinRegistry 三 SSOT 不一致详情（F1）

| Source | Location | Probe count | Blueprint count | Part count | 机制 |
|---|---|---|---|---|---|
| **catalog.ts（SSOT）** | `packages/engine/src/kernel/verdicts/catalog.ts` | **15** | — | — | 硬编码 `internalRef: '@oxn/probes/<name>'` |
| **.md 文件** | `src/builtin/probes/*.md` | **15** | **3** | 0 | MD 文件（与 catalog 1:1） |
| **Registry mock** | `packages/engine/src/oxl/scope/oxn-builtin-registry.ts` | **4** | **0** | **3** | 硬编码 `as const` 对象 |

缺失的 11 probes（在 catalog + .md 但不在 Registry mock）：
`ts-compiles`, `lint-check`, `git-branch-exists`, `http-responds`, `git-clean`, `deps-resolved`, `file-exports`, `fs-parseable`, `git-merge-feasible`, `test-pass`, `git-status-clean`

3 phantom parts（在 Registry mock 但无 .md 文件）：
`git-commit`, `create-branch`, `develop-feature`

3 blueprints（在 .md 文件但 Registry mock 声明 0）：
`verify-pipeline`, `git-workflow`, `leader-test-dsl`

---

*本计划是流动草稿，执行过程中如遇偏差可直接编辑更新。*
