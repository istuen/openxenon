# 术语双层 SSOT + AGENTS.md 职责归位 — 执行计划

> **来源**：2026-08-01 `/grilling` session（grill-with-docs + domain-modeling skill），3 轮
> **分析对象**：`.openxenon/drafts/rfc/terminology-two-tier-ssot-rfc.md`
> **状态**：待执行（5 个 Work，暂不动手）
> **作者**：opencode（与 user 协作，2026-08-01）

---

## 0. Session 摘要

对 terminology-two-tier-ssot-rfc.md 进行 3 轮 grilling，确认 RFC 动机成立（活体漂移已证实：glossary `asset-terms.md:46` 称 AssetPaper "4 字段+auditTrail"，Domain `oxn-asset-domain.md:46` 称"3 字段"无 auditTrail），但 spec 有 6 处硬伤。经 3 轮质询后收敛为 6 项冻结决议 + 5 项 loose ends，并衍生出 AGENTS.md 瘦身与 ADR 需求。

### 关键数据（2026-08-01 实测）

| 指标 | RFC 声称 | 实测 |
|---|---|---|
| glossary term 总数 | 35 | **130**（9 文件 awk 统计） |
| Domain term 总数 | — | **157**（9 文件 `## Terms:` 段下 H3） |
| 跨 Domain 重名 term | — | **16**（Asset/AssetMap/Daemon/Infra/Insight/Kernel/OXL/OXN CLI/OXN Engine/Part/PlanLock/Probe/Proof/Roadmap/Version Hygiene/Work） |
| Domain 文件数 | 9 | 9（但 CONTEXT-MAP.md 只索引 8，漏 `oxn-draft-domain.md`） |
| glossary 文件数 | 9 | 9（但 CONTEXT-MAP.md:126 称"7 个"） |

### 活体漂移证据

```
glossary/asset-terms.md:46   synced-at: 2026-07-22   "AssetPaper 4 字段…+auditTrail"
domains/oxn-asset-domain.md:46  synced-at: 2026-07-31  "AssetPaper 3 字段"（无 auditTrail）
```

漂移 9 天，证明单向同步无自动化是真实问题。

---

## 1. 冻结决议（6 项）

| # | 决议 | RFC 修订动作 |
|---|---|---|
| 1 | sync 脚本提取**全部 ~157 个** `## Terms:` 段下 H3（丢弃"35"数字） | D4:83、D7:159 改为 ~140；glossary 预期 ~600-800 行 |
| 2 | sync + `glossary-ref` **仅作用于 `## Terms:` 段下 H3**（排除 `## Invariants` / `## Bans`） | D6 规则名改为 `domain-terms-have-glossary-ref`；D7 step 1 加限定 |
| 3 | `concepts-no-term-redef` 改为 **slug 碰撞机械检查** | D6 规则描述重写；删去"定义散文 vs 叙述散文"判定 |
| 4 | Stack 语义不动（ADR-0054 三边界框架保持，措辞松了） | §2.1 加声明：本 RFC 只改术语承载位置，不改 AssetKind 语义 |
| 5 | 不建 `.openxenon/context-map/`（MD 唯一正交点） | 放弃用户 Round 2 提议的 yaml 方案；MD frontmatter 是唯一机器可读元数据源 |
| 6 | 窄路径：terminology RFC 不升格为认知宪法 RFC | AGENTS.md 瘦身 + ADR 拆为独立 Work |

---

## 2. Loose Ends（5 项，并入 Work A）

| # | 问题 | 修订动作 |
|---|---|---|
| L1 | D7 去重 spec 单薄（16 个碰撞 term，"root 优先"+"补 desc"+"冲突"检测未定义） | 补 root 解析规则（按 references DAG）+"补 desc"=追加子项+"冲突"=首句不一致报错 |
| L2 | v0.7 排序（隐含窄路径=先行） | §4 Phase 1 加声明：D7 基于 v0.6 扁平结构，v0.7 落地后需重定向 |
| L3 | §5 自杀链（链接指向 Phase 4 要删的路径） | §5 改为占位 |
| L4 | en/ stub 矛盾（§2.2 保留 vs Phase 4 删） | 统一：Phase 4 删 en/_index.md |
| L5 | CONTEXT-MAP.md 漂移（"8 Domain"/"7 glossary"，漏 oxn-draft-domain） | 新增 Phase 0 修正 |

---

## 3. 依赖图

```
Work E (CONTEXT-MAP 修正) ──────────────────────────┐
Work D (ADR: MD 唯一正交点) ────────────────────────┤
Work A (terminology RFC 修订) ──────────────────────┤── 均可独立启动
                                                    │
Work B (Roadmap→AssetMap 命名同步) ──► Work C (AGENTS.md 瘦身)
```

- **A / D / E 互相独立**，可并行
- **C 依赖 B**（AGENTS.md 草图引用 `assetmaps/` 与 `oxn assetmaps`，命名同步后才能落地）
- **A 不依赖 B**（terminology RFC 只涉及 Domain→glossary，不碰 roadmap/assetmap）

---

## 4. Work 详情

### Work A — terminology RFC 修订

**文件**：`.openxenon/drafts/rfc/terminology-two-tier-ssot-rfc.md`
**目标**：按 6 项冻结决议 + 5 项 loose ends 修订，达到可 promote 状态

#### A1. 数字订正（决议 1）
- D4:83 "35 个跨域 term" → "~140 个 term（157 个 H3 去重后）"
- D4:83 "~400-500 行" → "~600-800 行"
- D7:159 "35 term 候选" → "全部 `## Terms:` 段下 H3（去重后 ~141 个）"
- §2.2 "200-300 行" → "~600-800 行"

#### A2. 提取范围限定（决议 2）
- D7 step 1 加限定："仅提取 `## Terms:` 段下的 `### ` H3，排除 `## Invariants` / `## Bans` 段"
- D6 规则 `domain-has-glossary-ref` 重命名为 `domain-terms-have-glossary-ref`，描述改为"每个 `## Terms:` 段下的 `### term` 必须含 `glossary-ref` 字段"

#### A3. concepts 规则机械化（决议 3）
- D6 规则 `concepts-no-term-redef` 描述重写为："`concepts/*.md` 中不得出现 `### ` 标题，其 slug（kebab-case 归一化）与 glossary.md 中任一 term slug 碰撞"
- 删除"定义散文 vs 叙述散文"判定逻辑
- 错误码 `E_GLOSSARY_REDEF_IN_CONCEPT` 触发条件改为 slug 碰撞

#### A4. D7 去重 spec 补全（loose end L1）
补入 D7 step 2：

```
合并去重规则：
  a. root 解析：按 Domain 的 references DAG 找根——
     被 0 个 Domain reference 的是 root（oxn-domain 是绝对 root）
  b. 同名 term 归属：root Domain 的定义为主，sub-Domain 的 desc 追加为
     "- <DomainName> 视角：<desc>" 子项
  c. 冲突检测：同名 term 的 desc 首句（第一个句号前）不一致时，
     报 E_GLOSSARY_DUPLICATE_TERM，列出冲突的 Domain 与首句
  d. 16 个已知碰撞 term 需逐个验证 root 归属：
     Asset / AssetMap / Daemon / Infra / Insight / Kernel / OXL /
     OXN CLI / OXN Engine / Part / PlanLock / Probe / Proof /
     Roadmap / Version Hygiene / Work
```

#### A5. v0.7 排序声明（loose end L2）
§4 Phase 1 末尾加："D7 root 解析基于 v0.6 扁平 9-Domain 结构；v0.7 层级 RFC（`.openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md`）落地后需重定向 root 解析逻辑。"

#### A6. 自杀链修复（loose end L3）
§5 "相关术语"段的 `/glossary/zh-cn/*.html#*` 链接改为占位："待 glossary.md 生成后由 sync 脚本自动填充"

#### A7. en/ stub 矛盾消除（loose end L4）
- §2.2 改为："en/ 翻译未启动；Phase 4 删除 `docs/glossary/en/_index.md`，en 翻译另行立项"
- Phase 4 step 2 改为："删 `docs/glossary/en/_index.md`"

#### A8. CONTEXT-MAP 漂移任务（loose end L5）
§4 新增 **Phase 0：CONTEXT-MAP.md 计数修正**（在 Phase 1 之前）：
1. `CONTEXT-MAP.md:3` "8 个 Domain" → "9 个 Domain"
2. `CONTEXT-MAP.md:126` "7 个文件" → "9 个文件"
3. Contexts 表补 `OxnDraftDomain` 行（`oxn-draft-domain.md`，Draft 业务领域）
4. Relationships 图补 `OxnDraftDomain` 节点

#### A9. Stack 语义确认（决议 4）
§2.1 正面影响加一条："Stack 语义不变（ADR-0054 三边界框架保持）；本 RFC 只改术语承载位置，不改 AssetKind 语义"

**验证**：修订后通读全文，确认无"35"、无"assetmaps/"路径、无 en/ 矛盾、D7 去重规则可机械执行。

---

### Work B — Roadmap→AssetMap 命名同步

**前置依赖**：无
**目标**：让目录名、CLI 命令、skill instruction 与 RFC-0013 D4 术语一致

#### 代码现状（2026-08-01 实测）
| 草图写法 | 代码现状 | 差异 |
|---|---|---|
| `.openxenon/assets/assetmaps/` | `.openxenon/assets/roadmaps/` | 目录名未重命名 |
| `oxn assetmaps list` | `oxn roadmap list`（`packages/cli/src/commands/roadmap.ts`） | CLI 命令未重命名 |
| `oxn assetmaps suggest` | `oxn roadmap suggest`（`index.ts:155`） | 同上 |

#### B1. 目录重命名
- `.openxenon/assets/roadmaps/` → `.openxenon/assets/assetmaps/`
- 影响引用：`AGENTS.md:122,207,217`、`packages/cli/src/commands/roadmap.ts:28`

#### B2. CLI 命令重命名
- `packages/cli/src/index.ts:155` `roadmap:` → `assetmap:`
- `packages/cli/src/commands/roadmap.ts` → `packages/cli/src/commands/assetmap.ts`
- 命令名 `oxn roadmap` → `oxn assetmap`（内部 `name: 'roadmap'` → `name: 'assetmap'`）
- **注意**：AssetKind 枚举值仍为 `roadmap`（RFC-0013 D4 明确不改代码枚举）

#### B3. Skill instruction 同步
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-asset/instruction.md` 中 `oxn roadmap` → `oxn assetmap`
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md` 同步
- 跑 `bun run packages/cli/src/index.ts init -f` 重编译 SKILL.md

#### B4. AGENTS.md 路径同步
- `:217` `.openxenon/assets/roadmaps/oxn-system.md` → `.openxenon/assets/assetmaps/oxn-system.md`
- `:219` `oxn roadmap suggest` → `oxn assetmap suggest`
- `:236-237` `oxn roadmap sync` → `oxn assetmap sync`

**验证**：`bun run typecheck` + `bun test` + 手动跑 `oxn assetmap list` 确认输出 `oxn-system`。

---

### Work C — AGENTS.md 瘦身（依赖 Work B）

**前置依赖**：Work B 完成
**目标**：AGENTS.md 从 343 行瘦身到 ~80-100 行，只保留行为宪法

#### C1. 保留段落（行为宪法核心）
- 项目定位（1 段）
- 语义优先级（新增，5 级）：
  1. `.openxenon/assets/domains/*.md` 中的 invariants（最强）
  2. 各 Asset 自身的 YAML frontmatter 与正文
  3. `assetmaps/*.md` 中的 scene → asset 映射
  4. `docs/` 下的 RFC / glossary（仅解释，不约束）
  5. 本文件中的"行为规则"
- Agent 行为规则（5-7 条）：
  - 不得修改 Domain 文件中的 invariants
  - 不得把 glossary / docs 当 SSOT
  - 执行任务前必须先建 Work，禁止在 Asset 外裸奔写代码
  - Proof 只记录过程，不评判质量
  - 读 AssetMap 是为了"找 Blueprint"，不是找 Domain 关系
- 意图解析流程（4 步）：
  1. 从用户话里抽 goal
  2. 调 `oxn assetmap suggest --goal "<goal>"` 拿到 assetmap + scene
  3. 读对应 assetmap 里该 scene 块，挑最相关 Blueprint
  4. `oxn work create --blueprint <name>` 进入执行
- 常用命令（5-6 条）
- 入口指针（README.md / .openxenon/assets/ / docs/）

#### C2. 迁出段落
| 现段落 | 行号 | 迁往 |
|---|---|---|
| L0-L3 宪法表 | :30-46 | 已在 RFC-0018 + `docs/dev/zh-cn/architecture.html`；AGENTS.md 仅留指针 |
| 构建/校验命令 | :48-58 | `docs/dev/zh-cn/`；AGENTS.md 仅留 `bun test` / `bun run build` 两行 |
| CLI 架构 | :60-70 | `docs/dev/zh-cn/architecture.html` |
| OXN DSL | :72-76 | `docs/product/zh-cn/` |
| 文档四层 SSOT | :91-170 | 已在 RFC-0009 + RFC-0018；AGENTS.md 仅留 1 段指针 |
| 开发者操作指南 | :172-270 | `dev/README.md` 已承载；AGENTS.md 删 |
| v0.2/v0.3 路线图归档 | :272-343 | `.changes/pre-0-6-history.md` 已承载；AGENTS.md 删 |

#### C3. 删除 scene 路由表（:213-237）
- 6 scene 速查表 + AssetMap 变更后 sync 提示，全部删除
- 替换为 1 行："scene 路由数据见 `.openxenon/assets/assetmaps/oxn-system.md`；用 `oxn assetmap suggest --goal --scene` 查询"

**验证**：`bun run lint`（ESLint 架构守卫）+ `bun scripts/check-doc-boundary.ts` + `bun scripts/validate-dependencies.ts` 全通过。

---

### Work D — ADR: "MD 唯一正交点"原则

**前置依赖**：无
**文件**：`docs/adrs/0086-md-single-orthogonal-point.md`（接 0085 之后）
**目标**：记录"MD frontmatter 既是人类文档又是 CLI 元数据源，禁止平行 yaml"决策

#### ADR 内容

```markdown
# MD 唯一正交点

OXN 的 Asset .md 文件同时承载人类可读文档与 CLI/Engine 机器可读元数据
（YAML frontmatter）。禁止为"机器可读"目的新建平行 yaml/json 配置文件。

## 背景

2026-08-01 grilling session 曾提议 .openxenon/context-map/{layers,dependencies,rules}.yaml
作为"机器真理"层，与 docs/ 人类镜像分离。该方案被否决。

## 理由

- MD frontmatter 已是 CLI 元数据源（oxn assetmap list 读 frontmatter）
- 平行 yaml 会制造第二个 SSOT，必然漂移
- "人类文档"与"机器配置"同源是 OXN 的设计纪律，非缺陷
```

**验证**：`ls docs/adrs/` 确认 0085 是最高编号。

---

### Work E — CONTEXT-MAP.md 漂移修正

**前置依赖**：无（可立即启动，最快）
**目标**：修正计数 + 补索引
**注意**：与 Work A 的 A8（Phase 0）同构，可合并执行

#### E1. 修正内容
- `:3` "8 个 Domain" → "9 个 Domain"
- `:10-21` Contexts 表补 `OxnDraftDomain` 行：
  ```
  | **OxnDraftDomain** | .openxenon/assets/domains/oxn-draft-domain.md | Draft 业务领域；描述性工作稿管理 |
  ```
- `:25-44` Relationships 图补 `OxnDraftDomain` 节点
- `:126` "7 个文件" → "9 个文件"

**验证**：`awk '/^### /{c++} END{print c}'` 统计与文件数一致。

---

## 5. 推荐执行顺序

```
第 1 批（并行）：Work E（5 min）+ Work D（10 min）+ Work A（30 min）
第 2 批（串行）：Work B（30 min）
第 3 批（串行）：Work C（40 min，依赖 B）
```

总计约 2 小时。全部完成后跑 `bun run lint && bun run typecheck && bun test` 确认无回归。

---

## 6. 未决问题（执行时需逐个确认）

### 16 个碰撞 term 的 root 归属

sync 脚本 D7 去重规则需要逐个验证以下 16 个跨 Domain 重名 term 的 root 归属：

| Term | 候选 root | 出现的 Domain |
|---|---|---|
| Asset | oxn-domain | oxn-domain / oxn-asset-domain / oxn-work-domain |
| AssetMap | oxn-asset-domain | oxn-asset-domain / oxn-project-domain |
| Daemon | oxn-engine-domain | oxn-engine-domain / oxn-cli-domain |
| Infra | oxn-engine-domain | oxn-engine-domain / oxn-cli-domain |
| Insight | oxn-insight-domain | oxn-domain / oxn-insight-domain |
| Kernel | oxn-engine-domain | oxn-engine-domain / oxn-cli-domain |
| OXL | oxn-engine-domain | oxn-engine-domain / oxn-cli-domain |
| OXN CLI | oxn-domain | oxn-domain / oxn-cli-domain |
| OXN Engine | oxn-domain | oxn-domain / oxn-engine-domain |
| Part | oxn-work-domain | oxn-work-domain / oxn-proof-domain |
| PlanLock | oxn-asset-domain | oxn-asset-domain / oxn-work-domain |
| Probe | oxn-proof-domain | oxn-proof-domain / oxn-work-domain |
| Proof | oxn-proof-domain | oxn-domain / oxn-proof-domain / oxn-work-domain |
| Roadmap | oxn-asset-domain | oxn-asset-domain / oxn-project-domain |
| Version Hygiene | oxn-project-domain | oxn-project-domain / oxn-engine-domain |
| Work | oxn-work-domain | oxn-domain / oxn-work-domain |

**判定方法**：按 references DAG，被 0 个 Domain reference 的是 root。oxn-domain 是绝对 root（无 references）。其余按 `references` frontmatter 字段判定。

### CONTEXT-MAP.md 的最终角色

Round 2 讨论中曾提议把 root `CONTEXT-MAP.md` 降级为 `docs/context-map.md` 的人类镜像。Round 3 放弃该方案后，`CONTEXT-MAP.md` 的角色未显式重新确认。当前理解：**保持现状**——root `CONTEXT-MAP.md` 继续作为 9 Domain 索引 + 核心术语锐化段（Work E 只修正计数，不改角色）。若后续需调整，另立 RFC。

---

## 7. Grilling Session 轨迹

| 轮次 | 焦点 | 产出 |
|---|---|---|
| Round 1 | RFC spec 6 处硬伤（数字偏差 4x、去重 spec 单薄、v0.7 耦合、H3 范围歧义、linter 不可实现、内部不一致） | 4 个关键问题 |
| Round 2 | 用户提出 5 角色认知模型（Domain / Context Map / Blueprint / Glossary / AGENTS）+ `.openxenon/context-map/*.yaml` | 3 个张力问题 |
| Round 3 | 用户收敛：放弃 yaml 方案，回到"MD 唯一正交点"+ AGENTS.md 行为宪法；确认 Stack 语义不动 | 6 项冻结决议 + 执行计划 |
