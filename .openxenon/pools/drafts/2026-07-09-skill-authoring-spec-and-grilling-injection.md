---
design: skill-authoring-spec-and-grilling-injection
version: 0.7.1
date: 2026-07-09
type: design
status: draft
related: .openxenon/pools/design/2026-07-09-skill-system-comparison-vs-mattpocock.md §5；packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md；packages/cli/src/skills/loader.ts
---

# What

本文档使命：**把对比稿 §5 的 8 项改进提案中的两项落地为可执行方案**——(a) OXN 化 skill 写作规范的内容大纲（落 `dev/guides/skill-authoring.md`），(b) 有界对齐核验（bounded alignment grill）注入 `oxn-work` Intent 阶段。规模：1 篇设计文档 + 0 行引擎代码改动。依赖数：0 新 npm / 0 删。决策风格：分析基底引用对比稿 §5（不重复对比），§3 grill 三决策点已与工程师拍板锁定。

> **与对比稿的关系**：对比稿（`2026-07-09-skill-system-comparison-vs-mattpocock.md`）回答"OpenXenon skill 体系与 mattpocock/skills 的异同 + 8 项 ROI 改进提案"。本文档回答"其中 §5.1（元 skill / 写作规范）与 §4.1 grill 覆盖盲区怎么落地"。单向引用，不重复对比。

本章总览：

- §1 Skill 写作规范落地路径（对应对比稿 §5.1 + §5.8）
- §2 现有 2 Skill 审计（用规范回头审，本轮不改代码）
- §3 有界对齐核验（bounded alignment grill）注入 oxn-work（对应对比稿 §4.1 grill 盲区）

---

**§1 Skill 写作规范落地路径**

**§1.1 落点决策**

规范本体落 `dev/guides/skill-authoring.md`（dev/ 三层架构的 guides 层，给人 / AI 读的工程指南），**不建 `oxn-skill` 元 skill**。

| 选项 | 评估 | 选择 |
|---|---|---|
| A. `dev/guides/skill-authoring.md` | dev/ guides 层定位即"工程指南"；不动 skill loader / i18n / 架构守卫；AI 协作者读 dev/ 与读 docs/ 同路径习惯 | ✅ |
| B. `.opencode/skills/oxn-skill/SKILL.md` 元 skill（对比稿 §5.1）| 需扩 `loader.ts` 硬编码 import + 加 en/zh-CN 双 locale + 过架构守卫；属"新增 Skill"，超出本轮范围 | ❌ 留后续 |

> 决策理由：本轮目标是"吸收理念落地"，不是"新增 Skill 实体"。规范是给人 / AI 读的参考文档，不是 engine-coupled 的驱动指令；放 guides 层语义最准，改动面最小。

**§1.2 规范内容大纲（6 概念 OXN 本地化）**

`dev/guides/skill-authoring.md` 本体本轮**仅定大纲**，不写完整规范（留下一轮）。大纲如下：

**概念 1 — predictability（可预测性）**

Matt 原义：skill 的根美德是"同一**过程**每跑一致"，而非"同一**输出**"。

OXN 本地化双层：

| 层 | OXN 机制 | 对应 Matt 概念 |
|---|---|---|
| 文本层 | SKILL.md 编号步骤 + 硬规则 | in-skill step（同过程） |
| 机器层 | planLock 4-hash + Probe frozen.json + IAPError 12 码 | completion criterion 可机器断言 |

> OXN 比 Matt 多一层：Matt 的 predictability 全靠 AI 自律读 SKILL.md；OXN 有机器层兜底——即便 AI 漏读步骤，validate/lock 也会用 hash 漂移硬阻断。

**概念 2 — information hierarchy（信息分层）**

Matt 三级 ladder：in-skill step → in-skill reference → external reference。

OXN 本地化映射（叠加 OXN 已有的 hash 漂移检测）：

| Matt 层级 | OXN 落地 | OXN 增量 |
|---|---|---|
| in-skill step | SKILL.md 内编号步骤（≤200 tokens 目标） | — |
| in-skill reference | SKILL.md 内"硬规则 / 范式速记 / 错误码"段 | — |
| external reference | `references/*.md`（按需加载）+ `assets/*.md`（模板） | `.references.hash` / `.assets.hash` 漂移检测（SKILL.md 与 references/ 不同步时强制重写） |

> OXN 的 hash 漂移检测是 Matt 没有的——它把"reference 是否 stale"变成机器可断言。

**概念 3 — progressive disclosure（渐进披露）**

Matt：把 reference 推到 SKILL.md 之外的同目录文件，靠 context pointer 按需加载。

OXN 已落地：`loader.ts` 的 `ReferenceFile[]` + skill-compiler 的按需写入。规范要点：

- SKILL.md 仅保留"每分支都需要"的内容
- "仅某些分支需要"的推 `references/<branch>.md`
- 模板推 `assets/<mode>.md`（如 oxn-work 的 4 模式模板）
- pointer 文案决定加载可靠性（Matt 原则：pointer 的 _wording_ 决定何时加载，不是 target）

**概念 4 — leading words（领先词）**

Matt：借 pretraining 里已有的紧凑概念词，让 AI 用最少 token 锚定一整片行为。

OXN 双源策略：

| 来源 | 词例 | 锚定行为 |
|---|---|---|
| Matt 借 pretraining | red / tight / tracer / no-op / negation | TDD 红绿 / 反馈环 / 先锋弹 / 无效句 / 禁令反噬 |
| OXN 项目内高频 | planLock / IAP / YIELD / frozen / BirthCert | 锁后漂移 / 三轴 / 转人工 / 不可变产物 / 静态门禁卡 |

> Matt 的 leading word 借 pretraining 激活；OXN 的项目术语借**项目内高频密度**激活（AI 协作者每跑一次 skill 就强化一次）。两者互补，规范建议混用。

**概念 5 — completion criterion（完成判据）**

Matt：每个 step 末尾必须有 _checkable_ + _exhaustive_ 的完成条件，防 premature completion。

OXN 本地化模板（给具体写法，不是抽象原则）：

```
✅ 不要写："完成"、"通过"、"搞定"
✅ 写机器可断言：
   - "oxn work status --work <w> --json 退出码 0 + data.planLock 字段存在"
   - "frozen.json 的 sha256 与 .work.planLock.workOxnHash 一致"
   - "oxn work validate <w> --json 返回 ok:true 且 .work 已写入"
```

> 这是 OXN 相对 Matt 的优势区：Matt 的 completion criterion 是语义可观察（"every rule applied"）；OXN 可以写成机器可断言（退出码 + 字段存在 + hash 一致）。

**概念 6 — 6 failure modes 自检表**

Matt 六类失败模式，OXN 本地化为 skill 审计 checklist：

| Matt failure mode | OXN 自检问句 |
|---|---|
| premature completion | 每个 step 有 checkable + exhaustive 的完成判据吗？ |
| duplication | 同一含义是否出现在 SKILL.md + references/ 两处？ |
| sediment | 有没有"加了觉得安全、删了怕出事"的 stale 段？ |
| sprawl | SKILL.md 是否超 200 tokens 目标？该推 references/ 吗？ |
| no-op | 每句话做 no-op test——"删了它会改变 AI 行为吗？" |
| negation | "不要 X" 句式——是 hard guardrail（保留）还是行为禁令（改 positive）？ |

**附加 — description 写法**

Matt 三原则：

1. front-load 触发词（description 最前做"是否触发"的工作）
2. one trigger per branch（每个分支一句话，重复 = 噪声）
3. cut identity that's already in body（body 已说的不在 description 重复）

**附加 — negation 决策树**（对比稿 §3.6 三类禁令分类）

| 禁令类型 | 例子 | 处置 |
|---|---|---|
| CLI 命令层 | "不要调用 `oxn part new`" | 保留（命令不存在，hard guardrail） |
| 语法层 | "不要用 YAML/JSON 写 Blueprint" | 保留（版本约束） |
| 行为层 | "不要在 AI 助手软件中跑 `oxn init`" | 改 positive："跑前先 `oxn init --check` 确认项目已 init" |

---

**§2 现有 2 Skill 审计（文本层，本轮不改代码）**

用 §1 规范回头审 `oxn-work` + `oxn-asset` 的 instruction.md，列具体改写建议，**留后续 PR**。

**§2.1 oxn-work instruction.md 审计**

文件：`packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md`（33 行）

| 审计项 | 现状 | 违反 | 改写建议（留后续 PR） |
|---|---|---|---|
| completion criterion | "走 8 阶段"无 done 判据 | 概念 5 | 每个 step 补机器可断言条件（见 §1.2 模板） |
| description 5 动作压缩 | "创建/修改/演进/删除 domain/blueprint/stack/library/external" 5 动作一行 | one-trigger-per-branch | 按分支拆 description，或承认"asset 生命周期"是单分支用 leading word 锚定 |
| description 末尾排除项 | "不处理 Work 编排、任务执行、Proof 展示（那是 oxn-work）" | cut-identity | body 已说"本 Skill 不管 Asset 生命周期"，description 删此句 |
| leading word 密度 | "硬规则" / "IAP" 出现但未系统化 | 概念 4 | 在 SKILL.md 顶部建"leading word 速记"小表 |
| negation 段 | `## 禁止` 段含"跳 validate+lock" / "锁后改 .oxn" / "废弃语法" | negation 决策树 | "跳 validate+lock"=行为禁令→改"validate→lock→run 严格，无 --force"（已部分是 positive）；"锁后改 .oxn"=hard guardrail 保留；"废弃语法"=语法层保留 |

**§2.2 oxn-asset instruction.md 审计**

文件：`packages/cli/src/skills/locales/zh-CN/oxn-asset/instruction.md`（未读，结构同 oxn-work）

同类问题：description 5 AssetKind 压缩 + 末尾排除项 + completion criterion 缺。改写建议同 §2.1，留后续 PR。

> §2 审计结论**本轮不落地**——列建议清单供后续 PR 逐项改。理由：先有规范（§1）再改 Skill，顺序对；本轮范围是"方案文档"。

---

**§3 有界对齐核验（bounded alignment grill）注入 oxn-work**

**§3.1 与 Matt grill-me 的根本差异**

| 维度 | Matt grill-me | OXN 化重写 |
|---|---|---|
| 目的 | 通用计划锐化（开放式） | Asset↔Work + 编排↔Intent 两条轴对齐核验 |
| 逼问对象 | 用户脑中模糊的计划 | work.oxn 草稿里已被结构化的引用与编排 |
| 终止 | 决策树每个分支解决（可能上百轮） | 两轴固定清单覆盖完（项数 = Work 形状枚举） |
| 上限策略 | 无 | **覆盖度为主**（D1 锁定） |
| 未决项归宿 | 无 | BirthCert.diagnostics 软警告（D2 锁定） |
| 持久化 | 无 | 不落盘（D3 锁定） |
| 与引擎衔接 | 无 | 前置 validate+lock；未决项 = 潜在 planLock 漂移点 |

> **核心限定**（工程师追加约束）：OpenXenon 引入 grill 的目的**不是**通用拷问，而是**围绕 Asset 是否符合 Work、Work 内的编排设计是否符合工程师 Intent**。这两条轴让 grill 天然有界——项数由 Work 自身形状决定。

**§3.2 两轴核验清单模板**

grill 不是"问你想要什么"，而是"逐项确认已写进 work.oxn 的引用 / 编排是否对"。

**轴 A — Asset ↔ Work 符合性**

清单项 = work.oxn 内每个 Asset 引用。对每个 `domain X ref @prj/...` / `blueprint Y ref @prj/...` / `stack Z ref @prj/...`：

- A1. 这个 Work 真的需要 X 吗？（多余引用 = token 浪费 + lock 后漂移风险）
- A2. 版本 / 范围对吗？（引用的 Asset 是否是当前该用的版本）
- A3. 有没有该引没引的 Asset？（slot 未覆盖 = validate 时报错，不如 grill 期发现）
- A4. blueprint 的 slot 是否都被 Task 的 part 覆盖？（slot 悬空 = Work 编排不完整）

**轴 B — Work 编排 ↔ 工程师 Intent 符合性**

清单项 = work.oxn 内每个 Task / Part / Probe。

对每个 `task`：

- B1. blueprint slot 对齐了吗？（task 引用的 blueprint 是否与 Work 级 blueprint 一致或合理特化）
- B2. deps 链是否符合工程师意图的执行顺序？（串行 / 并行 / 无依赖）

对每个 `part`：

- B3. intent 能力声明覆盖 goal 了吗？（context.goal 里的每个目标，是否有 part 的 intent 对应）
- B4. skill_context 是否足够 AI 执行？（不是"写得好不好"，是"有没有"）

对每个 `probe`：

- B5. observe 维度能断言 constraints 吗？（context.constraints 里的每条约束，是否有 probe 的 observe 对应）
- B6. probe 的 scheme 是否与 Asset 里声明的 probe 一致？（T10 grammar scheme 字段对齐）

**§3.3 终止协议（D1 锁定：覆盖度为主）**

grill 何时算"问完了"：

```
终止条件 = 轴 A 清单（项数 = work.oxn 内 Asset 引用数 × 4）
         + 轴 B 清单（项数 = Task 数 × 2 + Part 数 × 2 + Probe 数 × 2）
         每项都有"可写入 work.oxn 的具象值"
```

- "具象值" = 要么确认"对的，保留"，要么改成具体值，要么标记未决进 diagnostics
- 项数 = Work 形状枚举，天然有界（一个 3 task × 2 part × 1 probe 的 Work ≈ 轴 A 12 项 + 轴 B 14 项 = 26 项）
- **不设轮数硬帽**——但实践中受项数约束，很少超 20-30 轮
- 连续 K 轮无新分支浮出可提前终止（饱和度逃生，软策略，非硬规则）

**§3.4 未决项处置（D2 锁定：软警告不阻断）**

grill 未解决的分支项，落 `BirthCert.diagnostics`：

| 字段 | 值 |
|---|---|
| severity | `warn`（非 `error`） |
| code | `OXN_WORK_REFS_GRILL_UNRESOLVED`（走 `OXN_WORK_REFS_*` CLI 协议串，**不进 IAPError 码空间**——复用现有 diagnostics 物理隔离边界） |
| ref | 未决项的 work.oxn 引用路径（如 `domain X ref @prj/...`） |
| type | `grill-unresolved` |
| message | 人类可读的未决描述 |
| suggestion | 建议处置（如"复查 X 是否本 Work 所需，或标记为探索性 onboarding 模式"） |

validate / lock 行为：

- validate 照跑（采集事实，写 .work 静态门禁卡）
- lock 照锁（写 planLock + 4-hash）
- **不硬阻断**——保工程师主权（探索性 / onboarding Work 本就允许模糊）
- lock 前输出提示："有 N 条 grill 未决项在 diagnostics，建议复查"

> 决策理由：硬阻断会过度约束 explore / onboarding 模式（本就允许模糊）。软警告 + 工程师主权 = 与现有 diagnostics 物理隔离边界一致。

**§3.5 持久化（D3 锁定：不落盘）**

grill 过程**不落盘为持久产物**：

- grill 结果体现为"work.oxn 被改对了" + "未决项写入 BirthCert.diagnostics"
- **不新增** `.grill.json` / `.grill-checklist.md` 之类文件
- 理由：遵守"frozen.json 是运行期唯一合法产物"不变量（ADR-0003）；避免产物爆炸

**§3.6 注入点与产物**

注入点：`oxn-work` instruction.md「执行」段，step 1（Asset 就绪）与 step 2（fork 模板）之间。

```
## 执行
1. 前置：项目已 oxn init，所需 Asset 已就绪 — 若需创建/修改 Asset，请触发 oxn-asset Skill
2. ★ 有界对齐核验：fork 模板前，先走 references/intent-grilling.md 两轴核验
3. fork assets/work-{explore,develop,fix,onboarding}.md → 改名为 work.oxn
4. 模板是完整 .md 示例，可被 WorkCompiler.parse() 直接解析
5. 走 8 阶段：references/8-phase-detail.md
6. 报错：references/error-codes.md
```

本轮产物清单（**本轮仅规划，不写本体**）：

| 产物 | 路径 | 改动 | 本轮 |
|---|---|---|---|
| grill reference | `packages/cli/src/skills/locales/zh-CN/oxn-work/references/intent-grilling.md` | 新增 1 文件 | ❌ 留后续 PR |
| grill reference (en) | `packages/cli/src/skills/locales/en/oxn-work/references/intent-grilling.md` | 新增 1 文件 | ❌ 留后续 PR |
| loader.ts | `packages/cli/src/skills/loader.ts` | 加 2 import（zh-CN + en 各 1）+ skillContents 数组加 2 项 | ❌ 留后续 PR |
| instruction.md (zh-CN) | `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` | 「执行」段加 step 2 指针 | ❌ 留后续 PR |
| instruction.md (en) | `packages/cli/src/skills/locales/en/oxn-work/instruction.md` | 同上 | ❌ 留后续 PR |

> 本轮范围是"方案文档"，不写 grill reference 本体、不改 loader / instruction。下一轮 PR 按 §3.2-§3.5 落地。

**§3.7 intent-grilling.md 内容大纲（下一轮写本体时用）**

1. 两轴核验清单模板（§3.2 原文搬入）
2. 终止协议（§3.3 覆盖度为主 + 饱和度逃生）
3. 未决项归档格式（§3.4 RefDiagnostic 格式）
4. 与 validate/lock 的握手（§3.4 validate 照跑 / lock 照锁 / 提示复查）
5. 不落盘声明（§3.5）
6. leading word 速记：grill / 具象值 / 未决项 / diagnostics / planLock 漂移点

**§3.8 与 validate/lock 的握手时序**

```
grill（AI↔工程师对齐）
  │
  ├─ 全绿（每项有具象值）→ 建议推进 validate+lock
  │
  └─ 有未决项 → 落 BirthCert.diagnostics（warn）
       │
       ├─ validate 照跑（采集事实，写 .work）
       ├─ lock 照锁（写 planLock + 4-hash）
       └─ lock 前提示："N 条未决项在 diagnostics，建议复查"
            │
            └─ 工程师主权：可推进 run（探索性 Work），或 unlock 回 grill
```

> grill 不取代 validate/lock——它是**人工前置对齐闸**。grill 不解决的分支，validate 时会被 planLock 4-hash 暴露成漂移；与其锁后才发现错配浪费一整个 Round，不如 grill 期就地逼问。

---

# Why

**§W.1 为什么先规范后改 Skill**

对比稿 §5 给了 8 项改进提案，但提案 → 落地之间缺一层"具体怎么改"的方案。直接改 SKILL.md 本体没有规范基准，改完无法验收。先落规范大纲（§1），再用规范审现有 Skill（§2），最后按规范写 grill reference（§3）——顺序对，每步可验收。

**§W.2 为什么 grill 限定在两轴**

工程师追加约束：grill 的目的是"围绕 Asset 是否符合 Work、Work 内的编排设计是否符合工程师 Intent"，**不是**通用拷问。

这个限定解决三个问题：

1. **有界性**：Matt grill-me 可能上百轮，因为它逼问的是用户脑中模糊的计划——计划可以无限细化。OXN grill 逼问的是 work.oxn 草稿里**已被结构化的引用与编排**——项数 = Work 形状枚举，天然有界。
2. **与引擎衔接**：两轴正好对应 planLock 4-hash 的四个组件（workOxn / workDomains / blueprints / tasks）。grill 未决项 = 潜在 hash 漂移点。grill 是 validate+lock 的人工前置对齐闸，不是孤立流程。
3. **保工程师主权**：未决项落 diagnostics 软警告不阻断——探索性 / onboarding Work 本就允许模糊，硬阻断会过度约束。

**§W.3 为什么不落盘**

grill 是 AI ↔ 工程师的对齐**过程**，不是运行期**产物**。结果体现在"work.oxn 被改对了" + "未决项写入 BirthCert.diagnostics"。新增 .grill 文件会违反"frozen.json 是运行期唯一合法产物"不变量（ADR-0003），且制造产物爆炸。

**§W.4 为什么本轮不写规范本体与 grill reference**

本轮目标是"方案文档"——定内容大纲 + 决策锁定 + 审计建议，给工程师 review。直接写规范本体 + grill reference + 改 loader / instruction = 跨太多决策点，review 成本高。分两轮：本轮方案，下一轮落地。

---

# How

**§H.1 本轮执行步骤**

| 步骤 | 产物 | 状态 |
|---|---|---|
| 1. 写本文档 | `.openxenon/pools/design/2026-07-09-skill-authoring-spec-and-grilling-injection.md` | ✅ 本文档 |
| 2. heading skeleton 自检 | `bun scripts/check-heading-skeleton.ts .openxenon/pools/design` | 待跑 |
| 3. biome 格式自检 | `bun run check`（仅查触改文件） | 待跑 |

**§H.2 下一轮落地步骤（留后续 PR）**

| 步骤 | 产物 | 依赖 |
|---|---|---|
| 1. 写 skill-authoring.md 规范本体 | `dev/guides/skill-authoring.md` | 本文 §1.2 大纲 |
| 2. 写 intent-grilling.md (zh-CN + en) | `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/references/intent-grilling.md` | 本文 §3.7 大纲 |
| 3. 改 loader.ts | 加 2 import + skillContents 2 项 | 步骤 2 |
| 4. 改 instruction.md (zh-CN + en) | 「执行」段加 step 2 指针 | 步骤 2 |
| 5. 审计改写 oxn-work / oxn-asset SKILL.md | 按 §2 建议逐项改 | 步骤 1 |
| 6. 验证 | `bun test`（含 skill-compiler / skill-i18n 测试）+ `bun run check` | 全部 |
| 7. changelog | `.changes/0-7-1-skill-authoring-and-grill.md` | 全部 |

**§H.3 验证流程**

```bash
# 1. heading skeleton 自检（必跑）
bun scripts/check-heading-skeleton.ts .openxenon/pools/design

# 2. biome 格式自检
bun run check

# 3. 视觉确认（仅设计池，不进 vitepress）
oxn pool list --json
```

**§H.4 不在本文档范围**

- 不写 `dev/guides/skill-authoring.md` 规范本体（仅 §1.2 大纲）
- 不写 `intent-grilling.md` grill reference 本体（仅 §3.7 大纲）
- 不改 `oxn-work` / `oxn-asset` 的 SKILL.md 本体（§2 审计留后续 PR）
- 不改 `loader.ts` / `instruction.md`（§3.6 产物留后续 PR）
- 不新增 `oxn-skill` 元 skill / `diagnose-bugs` skill（属第三档，未选）
- 不动用户级 `oxn-cli` / `oxn-proof`（不在本仓库，`~/.opencode/skills/`）
- 不实现对比稿 §5.2-§5.8 其余 6 项改进（本文仅落地 §5.1 + grill 盲区）

---

# 决策记录

| # | 决策点 | 当前选择 | 备选 | 决策时间 |
|---|---|---|---|---|
| D1 | grill 终止协议 | **覆盖度为主**（两轴清单每项有具象值即终止；不设轮数硬帽；饱和度逃生为软策略） | 覆盖度+轮数硬帽 / 覆盖度+饱和度逃生 | 2026-07-09 |
| D2 | grill 未决项处置 | **软警告不阻断**（落 BirthCert.diagnostics，severity=warn，OXN_WORK_REFS_GRILL_UNRESOLVED 码，validate/lock 照跑） | lock 前硬阻断 / 按 Work 模式区分 | 2026-07-09 |
| D3 | grill 持久化 | **不落盘**（结果体现为 work.oxn 改对 + diagnostics 写入；不新增 .grill 文件） | 落盘核验清单 | 2026-07-09 |
| D4 | 规范落点 | `dev/guides/skill-authoring.md`（guides 层） | `.opencode/skills/oxn-skill/SKILL.md` 元 skill | 2026-07-09 |
| D5 | 本轮范围 | 仅方案文档（大纲 + 审计 + 决策锁定） | 直接写规范本体 + grill reference + 改 loader | 2026-07-09 |
| D6 | grill 目的限定 | **围绕 Asset↔Work + 编排↔Intent 两轴**（非通用拷问） | 通用计划锐化（Matt 式） | 2026-07-09 |
| D7 | grill 与引擎关系 | 人工前置对齐闸（不取代 validate/lock；未决项 = 潜在 planLock 漂移点） | 独立流程 / 取代 validate | 2026-07-09 |

---

# 范围之外

| 项 | 不在本文档原因 |
|---|---|
| `dev/guides/skill-authoring.md` 规范本体 | 本轮仅定大纲（§1.2），下一轮按大纲写本体 |
| `intent-grilling.md` grill reference 本体 | 本轮仅定大纲（§3.7），下一轮按大纲写本体 |
| 改 `oxn-work` / `oxn-asset` SKILL.md 本体 | §2 审计结论留后续 PR，先有规范再改 |
| 改 `loader.ts` / `instruction.md` | §3.6 产物留后续 PR |
| 对比稿 §5.2-§5.8 其余 6 项改进 | 本轮仅落地 §5.1（规范）+ grill 盲区；§5.2 拆 oxn-cli / §5.3 router 声明 / §5.4 completion criterion / §5.5 negation / §5.6 diagnose-bugs / §5.7 CONTEXT.md / §5.8 SSOT 化 各自独立 PR |
| 新增 `oxn-skill` 元 skill / `diagnose-bugs` skill | 属第三档（全档含新增 Skill），未选 |
| 用户级 `oxn-cli` / `oxn-proof` 改造 | 不在本仓库（`~/.opencode/skills/`） |
| GSD / BMAD / Spec-Kit 内部实现 | 对比稿 §1.3 已声明跳过 |
| Matt skill 代码示例搬运 | OXN skill 落地应基于 OXN DSL + planLock 范式，不照搬（对比稿 §范围之外 已声明） |
| v0.8+ 路线图绑定 | 本文不锁版本路线图，由 RFC 流程单独拍板 |

---

**§R.1 内部引用**

| 引用 | 路径 |
|---|---|
| 对比稿（分析基底） | `.openxenon/pools/design/2026-07-09-skill-system-comparison-vs-mattpocock.md` §5 |
| oxn-work instruction | `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` |
| oxn-work 8 阶段详解 | `packages/cli/src/skills/locales/zh-CN/oxn-work/references/8-phase-detail.md` |
| oxn-asset instruction | `packages/cli/src/skills/locales/zh-CN/oxn-asset/instruction.md` |
| skill loader | `packages/cli/src/skills/loader.ts` |
| skill types | `packages/cli/src/skills/types.ts` |
| skill compiler | `packages/cli/src/commands/skill-compiler.ts` |
| skill adapters | `packages/cli/src/skills/adapters.ts` |
| BirthCert / PlanLock 术语 | `.openxenon/domains-md/align-domain.md` |
| Work 闭环设计 | `.openxenon/pools/design/2026-07-09-v0.7-work-closed-loop-and-cleanup.md` |
| Pool 入口 | `.openxenon/pools/pool-roadmap.md` |
| Heading 自检 | `scripts/check-heading-skeleton.ts` |
| frozen 命名不变量 | ADR-0003（`docs/zh-cn/architecture.md` §9.1） |

**§R.2 外部引用**

| 引用 | URL |
|---|---|
| mattpocock/skills 仓库 | https://github.com/mattpocock/skills |
| writing-great-skills 元 skill | https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md |
| grill-me skill | https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md |
| grilling（复用 loop） | https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md |
| grill-with-docs | https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md |
| tdd skill | https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md |
| OpenCode skills 文档 | https://opencode.ai/docs/skills/ |
