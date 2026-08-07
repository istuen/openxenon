---
entity: skeleton
target-entity: rfc
promote-target: rfc
theme: version-iteration-redesign
status: Draft
date: 2026-08-07
synced-at: 2026-08-07
created-from: draft-skeleton-fork@0.1.0
source: design-version-iteration-redesign
---

# Design: 版本迭代重设计（三层承诺流水线 · Goal-Centric Versioning）

- **DraftType**: design（设计稿）
- **状态**: draft（grilling session 收束，待 promote 为 RFC）
- **创建日期**: 2026-08-07
- **主题**: 版本迭代从"前瞻 lock 文档"转为"Work-聚合回顾记录"；Goal 成为主规划单元；Intent Pool v3 退役并吸收进 Draft
- **关联**:
  - `AGENTS.md` §版本号中性原则 §意图解析流程
  - `docs/rfc/zh-cn/RFC-0013-versioning-policy.md`
  - `docs/rfc/zh-cn/RFC-0019-draft-promote-routing.md`
  - `dev/meta/version-unification.md`（v0.6.x 合并叙事，二次失败的历史证据）
  - `dev/pool/README.md`、`dev/versions/README.md`（当前 lifecycle 文档）
  - `.openxenon/assets/domains/oxn-project-domain.md`（Version / Roadmap / PlanningPool / Version Fragment 术语 SSOT）
  - `.openxenon/assets/domains/oxn-draft-domain.md`、`oxn-draft-promote-domain.md`、`oxn-insight-domain.md`
- **Grilling 来源**: 2026-08-07 `/grilling` session（domain-modeling 技能，6 轮交互收束）
- **作者**: opencode（与 issac 协作）

---

## 1. 背景与目标

### 1.1 版本链断裂三层

OpenXenon 当前版本状态**三层互相矛盾**：

| 层 | 实际位置 | 差距 |
|---|---|---|
| npm 发布 | `v0.4.0`（最后一个真 tag，`v1.0.0-alpha` 是占位，`v0.5.0`/`v0.6.0` 决定不补打） | 落后代码 4 个版本 |
| git branch | `feat/v0.6.1` | 代码已到 `0.6.4-context-template`（`.changes/0-6-4-context-template.md` 已写） |
| `.changes/` 末尾 | `0-6-4-context-template.md`（`status: draft`） | 30+ fragment 全是事后手写，无强制 mechanism 触发 |

三个"当前版本"同时存在（0.4 / 0.6.1 / 0.6.4）。这不是"版本乱了"，是版本链**断了三层**。

### 1.2 三次失败的历史证据

| 次序 | 时间 | 文档 | 规划了什么 | 实际发生 |
|---|---|---|---|---|
| 第 1 次 | 2026-07-01 | `v0.6.x-roadmap-rfc`（已 Superseded） | 5 个 release（Daemon/Insight/Token/Hook/Hall） | **一周内废弃**，实际走了 Asset 类型体系 |
| 第 2 次 | 2026-07-10 | `version-unification-rfc` → `dev/meta/version-unification.md` | v0.6.1 alpha.0~7 + release，§3.4 列 12 条验收 checklist | **几周内偏离**，变成 0.6.2/0.6.3/0.6.4，release 从未发生 |
| 第 3 次 | 2026-07-27 | RFC-0013 Errata（`dev/pool/` + `dev/versions/` 拆分） | pool 备选 → versions 绑版本 → archived | `dev/versions/` 至今**空**，从未执行；10 个 entry 全在 pool 未调度 |

**三次设计，零次执行。** 病根不是"规划内容错"，是"规划层与执行层没有机械连接，必然漂移"。

### 1.3 当前 domain 模型的根本错误

`oxn-project-domain.md:96` 写：

> PlanningPool 与 Roadmap 是**同一类文档**的两个生命周期阶段：备选 vs 已绑版本。

这意味着"版本"被建模成**一个 Markdown 文档**，生命周期是 `dev/pool/*.md → git mv → dev/versions/*.md → git mv → .archived/`。全是**手动文件改名 + 手改 frontmatter**，**零 CLI 支持**。

而真正产出代码的 **Work** 走另一条平行轨道：`Draft → oxn work create --blueprint → IAP → finalize`。**这两条轨道在 model 里没有任何交汇点**——Work 不带版本号，Version 文档不引用 Work。

后果必然：
1. Version 文档是**描述**，会漂移；Work 是**现实**，会 ship。两者永远对不上。
2. 发版时 `.changes/` fragment 只能**靠回忆手写**——因为没有 mechanism 聚合"哪些 Work 属于这个版本"。
3. Version 文档成 ceremony，没人维护，`dev/versions/` 空到只剩 README。

### 1.4 三套重叠的预承诺系统

OpenXenon 现有**三套**功能重叠的"前瞻性文档"系统，但执行层度各异：

| | Draft（`.openxenon/drafts/`） | Intent Pool v3（`.openxenon/pools/`） | PlanningPool/Goal（`dev/pool/`） |
|---|---|---|---|
| **承诺等级** | 零承诺（探索） | 系统提议（待人批准） | 已承诺（绑 Work） |
| **谁产生** | 人 | Insight 系统（E4） | 人 |
| **类型** | report/issue/design（domain 锁 3 类，实际漂移 14+ 前缀） | research/design/issue/audit/journal | — (单一形态) |
| **CLI 支持** | ✅ 6 命令完整（create/list/archive/discard/promote/retarget） | ✅ 5 命令完整（create/review/approve/reject） | ❌ 零 |
| **现状** | 活跃，~26 份 | **目录不存在**，从未创建 entry | 10 份，全在 pool 未调度 |

它们不是冗余，是**同一条流水线的不同站**——但没有机械连接，三个站各干各的。DrafType 还膨胀到 14+ 前缀 trying to be everything-to-everyone（`proof-`/`doc-`/`v0-6-3-`/`domain-`/`oxn-`/`product-`/`terminology-`/`ssot-`/`sync-`/`onboarding-`/`draft-system-`/`probe-coef-slot-cost-grilling-`...）。

### 1.5 目标

提出一个**机械化的三层承诺流水线**，让：
- 探索、承诺、发布**各司其职，承诺等级递增**；
- 每个过渡都**CLI 化**，不依赖手 `git mv` / 手改 frontmatter；
- **Forcing function 存在**，不可能再让 npm 停在 0.4 四个月。

---

## 2. 设计提案：三层承诺流水线

```
Draft（探索层 · .openxenon/drafts/）
  ├─ 类型收敛回 3 种：report / issue / design
  ├─ origin 字段：human | insight（系统提议归人审，不再单独成池）
  └─ promote 路由扩 4 条：rfc | asset | goal | work
                          ↑新增 "goal"

Goal（承诺层 · dev/pool/，概念正名为 Goal）
  ├─ = 一条分支 = 一份 Work = 一个清晰边界
  ├─ source: 从 Draft promote 来，或直接建
  └─ 不带版本号（晚绑）

Version（发布层 · .changes/）
  ├─ cut 时诞生，回顾性，frozen-at-cut
  └─ 收录 N 个 Goal + 对应 Work 的交付证据
```

### 2.1 三层映射到分形 IAP

```
Goal    = Intent  （前瞻、可变、"要回答什么问题"）
Work    = Align   （执行、IAP 循环）
Version = Proof   （回顾、不可变、"实际回答了什么"）
```

Work 内部已有 IAP（Intent→Align→Proof per work）。Release 层也是 IAP。**分形 IAP**——不是生硬套用，是"规划-执行-验收"本就是 IAP，之前被硬塞进一个 Version 文档，现在拆成三个对象各司其职。

### 2.2 各层精确定义

#### Goal（取代 PlanningPool）
- **物理位置**: `dev/pool/<slug>.md`（路径保留，**概念正名**为 Goal）
- **frontmatter**（最小迁移）:
  ```yaml
  ---
  id: <slug>                    # kebab-case
  theme: <human-readable>
  priority: low | medium | high | critical
  status: planned
  created-at: YYYY-MM-DD
  scheduled-version: ~          # 改语义："未绑版本"（Goal 天然晚绑）
  synced-at: YYYY-MM-DD
  branch: feat/goal-<slug>      # 新增：强制显式分支名
  source: draft | direct         # 新增：来源标记
  source-ref: <draft-path>      # 可选：若 source=draft
  ---
  ```
- **入池条件**: (a) 有清晰边界（一个 Goal = 一个"OpenXenon 是什么"的子问题），(b) 有最小 RFC/ADR 引用或 source Draft，(c) 工程师 mental commit 会做
- **出池（→ Version）**: 由 forcing function 触发（见 §2.4），cut 时 Goal 自动归档到 `.openxenon/.archived/dev/pool/`
- **1:1 with branch**: 每个 Goal 强制对应 `feat/goal-<slug>` 分支（从 dev 拉）。不创建分支 = 未开工
- **1:1 with Work**: 每个 Goal 强制对应一份 Work（通过 `oxn goal work <slug>` 创建，自动选 Blueprint）

#### Version（取代 Roadmap + Version Fragment）
- **物理位置**: `.changes/0-X-Y-<theme>.md`
- **诞生时机**: cut 时创建，**不是 planning 时**
- **frontmatter**:
  ```yaml
  ---
  version: 0.X.Y
  date: YYYY-MM-DD
  type: patch | minor | major
  status: released
  theme: <一句话主题>
  goals:                       # 取代 Roadmap 的"内容项"
    - dev/pool/<slug-1>.md
    - dev/pool/<slug-2>.md
  works:                       # 交付证据
    - .openxenon/works/<id-1>/work.md
    - .openxenon/works/<id-2>/work.md
  tag: v0.X.Y
  branch: dev                  # cut 来源分支
  ---
  ```
- **不可变**: frozen-at-cut。Version 文档**永远不说谎**——它只记录已发生的事实
- **包含关系**: N 个 Goal（1:N，理想 1:1）
- **回顾性聚合**: 在 `.changes/` 落盘，**对外可查阅**（用户视角），跟"Goal 是什么"文档分离

#### Draft（探索层，强化）
- **类型收敛**: domain 锁死 3 类（report/issue/design）。**强制执行**——`oxn draft create` 不再接受其他 prefix（v0.6.3 调研显示 ~14 种 prefix 漂移）
- **新增 origin 字段**: frontmatter 加 `origin: human | insight`。Intent Pool v3 退役后，Insight 改为创建 Draft（`prefix=issue, origin=insight`），不再单独成池
- **新增 promote target: `goal`**（D2）: `oxn draft promote --target goal --goal-slug <s>` 把探索稿升华为承诺单元
- **废弃 promote target: `work`**（D3）: `--target work` 改为报错引导走 goal（保留逃生口的代价 = 过去的失控源）

### 2.3 DraftType 漂移治理

现 14+ 前缀按 promote-target 重新归类：

| 现存前缀 | 归类 |
|---|---|
| `proof-`/`probe-`（无 Goal 对应） | 留 Draft（exploration），不升 Goal |
| `doc-`/`domain-`/`glossary-`/`terminology-`/`ssot-`/`sync-` | 升 RFC（prescriptive decision） |
| `design-` | 视情况：升 RFC（若系统性）/ 升 Goal（若实施性）/ 留 Draft |
| `v0-X-Y-`/`v0-X-X-`（已经带版本号的"changelog 草稿"） | 转 Version 草稿（cut 时落盘） |
| `report-`/`test-` | 留 Draft（investigation 类） |
| `onboarding-`/`product-`/`draft-system-`/`oxn-`（元工作） | 留 Draft 或升 Goal |

执行：每个 active draft 由 owner 决定归类；超过截止无归类的 → 归档（保留历史）。**截止后强制清理周期**（见 §4.6）。

### 2.4 Forcing Function（a + b + c）

**任一触发即 cut**：

**(b) 最小 Goal 完成** — Goal 边界清晰（§2.2 入池条件 a），Work finalized + Domain proof PASS → 立即 cut
**(c) Goal 变更** — 开发中发现 Goal 边界需要改（scope 蔓延/方向偏移）→ 立即 cut 当前（即使未完成），新 Goal 开新 Version
**(a) 时间节奏** — 每 1 周自动检查：未 cut 的 finalized Goal + 1 周时间到 → 强制 cut 当前全部 finalized Goal（剩余 Goal 滚下个 Version）

**cadence 落盘机制**:
- `oxn version cut [--trigger done|change|schedule] [--dry-run]` 手动或自动调用
- `release-cut.md` workflow 接 `oxn version cut`（触发后跑 6 slot：bump-version → gen-changelog → tag → verify-build → publish → post-publish-bump）
- 自动 cadence 由 cron / GitHub Actions 跑（每周一）

### 2.5 Git 分支模型

```
main (已发布，tag 落这里)
  ↑
dev (长期集成分支；Goal 分支合并目的地)
  ↑
  ├── feat/goal-<slug-A>（from dev）→ Goal A 的 Work
  ├── feat/goal-<slug-B>（from dev）→ Goal B 的 Work
  └── feat/goal-<slug-C>（from dev）→ Goal C 的 Work
```

**分支规则**:
- `main`: 只接受从 dev 来的 merge commit + tag
- `dev`: 长期存在，所有完成的 Goal 分支合并到这里
- `feat/goal-<slug>`: 每个 Goal 一条，从 dev 拉，Work finalize 后合并回 dev
- **未 finalize 的 Goal 分支悬挂**（不参与本次 cut），下次开新 Version 前 rebase against dev
- **分支名与 Goal slug 强一致**（`oxn goal create` 强制），CLI 校验

**cut 时机**:
1. finalized Goal merge 回 dev
2. `oxn version cut` 从 dev 打 tag → main
3. 未 finalize 的 Goal 分支保持悬挂，下次 cycle 继续

**历史分支漂移修复**（一次性）:
- 当前 `feat/v0.6.1` 分支名僵化（实际已开发到 0.6.4）→ 接受历史遗留，新建 `dev` 分支作为长期集成
- `0.6.2`/`0.6.3` 等"版本分支"概念作废——改为 `feat/goal-<slug>` 命名

---

## 3. 关键决策汇总

### D1: 三层模型 + Intent Pool 退役

**采纳**: Draft（探索）→ Goal（承诺）→ Version（发布）。Intent Pool v3 退役并吸收进 Draft（origin=insight）。

**退役清单**:
- `.openxenon/pools/` 目录（**本就不存在**）— 不创建
- `oxn pool` CLI 5 命令（create/list/review/approve/reject）— 全部退役
- `oxn-insight-domain.md` inv-1~inv-5 pool invariants — 改写为"Insight 写 Draft"机制
- `.openxenon/.archived/pools/` 保留（历史归档）

**Intent Pool 5 类型映射**:
- research / audit / journal → Draft `report`
- design → Draft `design`
- issue → Draft `issue`

零信息损失；类型收敛回 domain 锁的 3 类。

### D2: Draft 新增 `--target goal` 路由

**采纳**: `oxn draft promote --target goal --goal-slug <s>` 把探索稿升华为 Goal。

**机制**:
- 4 阶段生命周期沿用：`gather → validate-skeleton → fork-missing → dispatch-target`
- skeleton 加 `goal.md` 模板（frontmatter 见 §2.2 Goal 定义）
- dispatch 后：在 `dev/pool/<slug>.md` 创建 entry，自动 `git checkout -b feat/goal-<slug>` 拉分支（基于 dev）
- 源 Draft 不变（保留 inv-4 "promote 是 copy 不是 state transition"）

### D3: 废弃 `--target work` 直达路由

**采纳**: `--target work` 改为报错引导走 Goal。

**理由**: 当前 draft→work 直达是"快捷途径"，但导致：
- Work 不绑 Goal → Work 跟版本号断链
- 探索阶段直接进执行 → 跳过 Goal 承诺层
- 直接对应过去 4 个月 npm 停在 0.4 的失控

**探索性 spike 怎么办**:
- 不开 Goal → 留 Draft（纯探索记录）
- 隔周期自动清理（§4.6）
- 未来扩展：`oxn draft explore-discard` 显式归档为"已废弃探索"，保留为参考（不强制）

**实施**:
- `oxn-draft-promote-domain.md` 的 PromoteRoute 表 `work` 行标注 deprecated
- CLI `--target work` 报 `OXN_DRAFT_TARGET_WORK_DEPRECATED` + 引导提示
- 文档/skill 更新

### D4: 现有 dev/pool/ 10 entries 最小迁移

**采纳**: 几乎免迁移，仅概念正名 + frontmatter 加字段。

**现有 10 entries 清单**（2026-08-07 确认）:
1. `anchor-slot.md`（medium，从 versions 回滚）
2. `engine-closure-self-verify.md`（critical，grilling 验证模板）
3. `work-unified-model.md`（high，859 行）
4. `probe-system-evolution.md`（high，从 versions 回滚）
5. `infra-ports.md`（medium，从 versions 回滚）
6. `npm-ship-path.md`（high）
7. `emergence.md`（medium，从 versions 回滚）
8. `asset-graph.md`（medium，从 versions 回滚）
9. `ai-three-modes.md`（medium，从 versions 回滚）
10. `term-upstream-dag.md`（medium，从 versions 回滚）

**迁移操作**（一次性）:
- 概念上从"PlanningPool entry" → "Goal"
- 每 entry frontmatter 加：
  - `branch: feat/goal-<slug>`（若未开工则暂未创建）
  - `source: direct | draft`（看是否有 promoted-from）
  - `scheduled-version: ~` 语义改："未绑版本"（不变，仅文档化）
- 清理 2 处 stale refs（probe-system-evolution.md:13 / infra-ports.md:13 引用已回滚的 `dev/versions/` 路径）

**Goal 形态校验**（自动化）:
- `oxn goal validate` 检查 frontmatter 必填字段
- `oxn goal list [--status planned|in-progress|done|archived]`

---

## 4. 落地清单

### 4.1 Domain 文件改写

| 文件 | 改写内容 |
|---|---|
| `oxn-project-domain.md` | §Terms: Version Fragment 重写为 Version（含 goals/works 字段）；Roadmap 概念退役（仅留一段历史 reference）；PlanningPool 重命名为 Goal（含 branch/source 字段）；§0.3.4 "Roadmap 与 AssetMap 不同情态"段删除（Roadmap 概念没了） |
| `oxn-draft-domain.md` | §Terms: DraftType 强化（强制 3 类执行）；新增 DraftOrigin 术语（human/insight）；§Invariants: inv-1 增 origin 语义 |
| `oxn-draft-promote-domain.md` | §Terms: PromoteRoute 表加 `goal` 行（`dispatch-task: promote-goal`）；§invariants: inv-1 加 `goal` 入口校验 |
| `oxn-insight-domain.md` | §Invariants: inv-1~inv-5 pool invariants 改写为"Insight → Draft"（insight pool 概念退役）；inv-6 insight-manual-gate 改写（manual gate 现在是 draft review/discard） |
| `oxn-cli-domain.md` | §Terms: 新增 Goal 命令术语；Version 命令术语；Pool 命令标注 deprecated |

### 4.2 ADR 列表（衍生）

本文档 promote 为 RFC 后，建议产出以下 ADRs（每条一个独立 ADR）：

| ADR | 主题 |
|---|---|
| ADR-NEW-1 | Version 从前瞻 lock 文档 → 回顾 cut 记录 |
| ADR-NEW-2 | Goal 成为主规划单元（取代 PlanningPool） |
| ADR-NEW-3 | Intent Pool v3 退役 |
| ADR-NEW-4 | Draft→work 路由废弃 |
| ADR-NEW-5 | Forcing Function a+b+c 三触发器 |
| ADR-NEW-6 | 分支模型 main/dev/feat-goal |

### 4.3 CLI 新增/废弃

**新增**:
```
oxn goal create <slug> --theme <t> --priority <p> [--source draft:<draft-path>]
oxn goal list [--status <s>]
oxn goal show <slug>
oxn goal work <slug> [--blueprint <bp>]   # 创建 Goal 对应 Work
oxn goal archive <slug>                  # Goal 归档
oxn version cut [--trigger done|change|schedule] [--dry-run]
oxn version list [--since <date>]
oxn version show <version>
oxn version status <version>              # 显示 Goal/Work 状态聚合
```

**废弃**（保留 1 版本兼容期，再移除）:
```
oxn pool create / list / review / approve / reject  →  →  →  报 OXN_POOL_DEPRECATED
oxn draft --target work                            →  →  →  报 OXN_DRAFT_TARGET_WORK_DEPRECATED
```

### 4.4 目录退役

- `dev/versions/`: 整体删除（仅 README + Blueprint-2.md 模板）
- `.openxenon/pools/`: **不创建**（本就不存在）
- `oxn pool` 命令: 1 版本后移除

### 4.5 release-cut 改造

`release-cut.md` workflow（`bump-version → gen-changelog → tag → verify-build → publish → post-publish-bump`）改造：

- `bump-version` slot: 改调 `oxn version cut --trigger done` 触发（不再手写 next_version）
- `gen-changelog` slot: 改读 `oxn version show <v>` 输出（不再手扫 `.changes/`）
- `tag` slot: 不变
- 强制 cadence: 每周一次自动跑（GitHub Actions cron 或本地 schedule）

### 4.6 DraftType 漂移治理 + Draft 清理周期

- **一次性归类**: 每个 active draft 由 owner 在 2 周内决定（升 RFC / 升 Goal / 留 Draft / 归档）
- **清理周期**: 每月 1 号 `oxn draft list --inactive --older-than 90d` 自动归档
- **强制类型**: `oxn draft create --prefix <report|issue|design>` 锁 3 类，其他 prefix 报 `OXN_DRAFT_TYPE_INVALID`

### 4.7 分支一次性修复

- 新建 `dev` 分支（基于 `main` 当前 tip）
- 未来所有 Goal 分支从 `dev` 拉
- 当前 `feat/v0.6.1` 等版本化分支保留为历史归档，不再接受新 commit
- 历史未发布 commit（0.6.2/0.6.3/0.6.4 content）按"哪个 Goal 它们实现了"回溯归类（一次性 effort）

---

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 旧 Version 文档（`dev/versions/`）批量删除后丢失历史 | 移至 `.openxenon/.archived/dev/versions/` 保留（不再被任何 system 引用） |
| 现有 10 个 pool entries 的 stale `rfc:` refs 引用不存在的 `dev/versions/` 路径 | 一次性清理（已在 §3 D4 列出） |
| DraftType 强制 3 类后，现有 ~14 前缀 draft 全部失败创建 | 一次性归类（§4.6），新 Draft 创建即生效 |
| `oxn pool` CLI 1 版本后移除，已使用项目的中断 | 1 版本兼容期：报 deprecated 但仍工作；同时文档/skill 引导迁移 |
| 自动 cadence（每 1 周 cut）触发未预期的 release | `oxn version cut --dry-run` 强制必走；首次自动 cut 前人工 ack |
| 旧 `feat/v0.6.1` 等分支历史 commit 不可重建 | 接受历史遗留，新建 `dev` 后不再使用 |

---

## 6. 未来扩展（不属本文）

- `oxn draft explore-discard`：D3 提到的探索废弃 Promote（未来再加，不阻塞本文落地）
- AI Agent 自动推断 promote-target（基于内容关键字）— 沿用 RFC-0019 已规划
- 多人协同 Draft（lock / concurrent edit / merge）— RFC-0019 已规划
- Version 主题自动归纳（cut 时 N 个 Goal 共性提取）— 自然演进

---

## 7. 参考

- `AGENTS.md` §版本号中性原则 / §意图解析流程 / §常用命令
- `docs/rfc/zh-cn/RFC-0013-versioning-policy.md` — 版本政策（被本文修改）
- `docs/rfc/zh-cn/RFC-0019-draft-promote-routing.md` — Draft promote 路由（被本文增 goal target）
- `docs/adrs/0083-version-hygiene-over-build-metadata.md` — Version Hygiene（保留，仅消费 release-cut post-publish-bump）
- `dev/meta/version-unification.md` — v0.6.x 合并叙事（二次失败的历史）
- `dev/pool/README.md`、`dev/versions/README.md` — 当前 lifecycle 文档（被本文取代）
- `.openxenon/assets/domains/oxn-project-domain.md` §Terms: Version / Roadmap / PlanningPool / Version Fragment（被本文改写）
- `.openxenon/assets/domains/oxn-draft-domain.md` §Terms: Draft / DraftType / DraftTarget（被本文改写）
- `.openxenon/assets/domains/oxn-draft-promote-domain.md` §Terms: PromoteRoute / PromoteLifecycle / TargetDispatchTable（被本文扩展）
- `.openxenon/assets/domains/oxn-insight-domain.md` §Invariants: inv-1~inv-5（被本文改写）
- `.openxenon/assets/workflows/release-cut.md` — 发版流程（被本文接入）

---

**Status**: draft（待 promote 为 RFC）

**Promote 路线**:
- Primary target: `rfc` → `docs/rfc/zh-cn/RFC-XXXX-version-iteration-redesign.md`
- 衍生: 6 条 ADR（见 §4.2）+ 4 个 domain 文件改写（见 §4.1）+ CLI 命令实现（见 §4.3）
- 配套: `dev/versions/` 退役 + DraftType 治理 + 分支模型一次性修复