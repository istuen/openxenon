---
design: skill-system-comparison-vs-mattpocock
version: 0.7.1
date: 2026-07-09
type: design
status: draft
related: AGENTS.md §v0.6 RFC；.opencode/skills/oxn-{asset,work}；~/.opencode/skills/oxn-{cli,proof}
---

# What

本文档使命：**从外部视角对比 OpenXenon skills 与 mattpocock/skills 的异同**，定位 OpenXenon skill 的独特价值与覆盖盲区。规模：1 篇设计笔记，纯文档（不动 `.opencode/skills/*` 本体）。依赖数：0。决策风格：观察性对比 + 8 项可借鉴改进提案，**不预锁** —— §决策记录 路径表由后续 PR 各自拍板。

本章总览：
- §1 三个 Skill 体系概览
- §2 哲学层对比
- §3 实现层对比
- §4 覆盖层双向对照
- §5 OpenXenon 可借鉴的 8 项改进

---

**§1 三个 Skill 体系概览**



**§1.1 调研对象**


| 体系 | 来源 | 数量 | 文件位置 | 主要场景 |
|---|---|---|---|---|
| **OpenXenon skills** | 本仓库 + 用户级 | 4（2 + 2）| `.opencode/skills/oxn-{asset,work}` + `~/.opencode/skills/oxn-{cli,proof}` | 驱动 `oxn` CLI 产出可执行工件 |
| **mattpocock/skills** | GitHub 公开仓库 | 14（8 engineering + 6 productivity）| `skills/engineering/*` + `skills/productivity/*` | 编码思维流程（TDD / 调试 / review / handoff）|
| **GSD / BMAD / Spec-Kit**（对照组）| Matt 文中提及 | — | — | 全流程编排框架（Matt 明确与之划清边界）|


**§1.2 调研目标**


| 读者 | 想从这里得到什么 |
|---|---|
| AI 协作者 | 理解 OpenXenon skill 写法的"为什么"，减少误判 |
| 人类工程师 | 评估 OpenXenon skill 体系的覆盖盲区，决定是否引入外部 skill 范式 |
| Skill 维护者 | 拿到一份"哪些约定可借"的清单，按 ROI 排好优先级 |


**§1.3 调研方法**


- 阅读 mattpocock/skills README 与 `writing-great-skills/SKILL.md`
- 阅读 OpenCode 官方 skills 文档（frontmatter / discovery / 长度规则）
- 逐文件对比 OpenXenon 的 4 个 SKILL.md（行数 / frontmatter / 反模式 / 跨引用）
- 跳过项：GSD / BMAD / Spec-Kit 内部实现（仅作为命名对照）


---

**§2 哲学层对比**


**§2.1 共享根目标：predictability**


Matt 在 `writing-great-skills/SKILL.md` 起首句："A skill exists to wrangle determinism out of a stochastic system. Predictability … is the root virtue."

OpenXenon 的对应物：planLock 4 组件 hash 冻结 + Probe frozen.json 不可变 + IAPError 字典硬阻断。

**两者目标一致，实现路径不同**——这是后文所有对比的根前提。


**§2.2 五大维度对比**


| 维度 | mattpocock/skills | OpenXenon skills |
|---|---|---|
| 优化目标 | agent thinking quality（思考质量）| artifact production determinism（产物确定性）|
| 反馈机制 | red-green-refactor / code review | planLock 4-hash / Probe frozen.json |
| 失败处理 | negation backfire / no-op test | IAPError 12 码 + YIELD_TO_HUMAN |
| "完成"含义 | "every rule applied"（语义穷尽）| hash 匹配 + frozen.json 写入（机器可断言）|
| 共享语言 | `CONTEXT.md` + `GLOSSARY.md`（自由文本）| Domain 资产（machine-checked term/ban/invariant）|


**§2.3 共享词汇的对比深化**


| Matt 概念 | OpenXenon 等价物 | 强弱对比 |
|---|---|---|
| `CONTEXT.md`（项目级自由文本 glossary）| Domain 资产 | **OpenXenon 更强**：term / ban / invariant 在编译期校验 |
| `GLOSSARY.md`（粗体术语集中表）| 散落在各 `references/*.md` 的"范式速记" / "错误码"表 | **Matt 更强**：单源 SSOT，AI 每次都看 |
| leading word（pretrained 概念词）| 项目内部术语（"硬规则" / "IAP" / "planLock"）| **路径不同**：Matt 借 pretraining；OXN 借项目内高频密度 |
| completion criterion（可观察事实）| `✓ done` + `oxn work status` 退出码 | **Matt 更强**：内嵌可验证；OXN 依赖外部 CI / commit |


---

**§3 实现层对比**


**§3.1 frontmatter 对比**


| 字段 | Matt | OpenXenon | OpenCode 协议要求 |
|---|---|---|---|
| `name` | ✅ | ✅ | 必填，1-64 字符 kebab-case |
| `description` | ✅ | ✅ | 必填，1-1024 字符 |
| `license` | ✅ | ❌ | 可选 |
| `compatibility` | ✅ | ❌ | 可选 |
| `metadata` | ✅ | ❌ | 可选 string-to-string |
| `disable-model-invocation` | ✅（user-invoked 必填）| ❌（全 4 个都是 model-invoked）| OpenCode 协议未规定，但支持 |


OpenXenon 的 frontmatter **符合 OpenCode 协议最小集**，但：
1. 全部 4 个 skill 都是 model-invoked → description 常驻上下文，无 0-load 的 user-only skill
2. description 写法违反 Matt 的 "one trigger per branch" 原则（详见 §3.2）


**§3.2 description 写法对比**


**Matt 规则**：
- front-load 触发词（让 description 在最前做"是否触发"的工作）
- one trigger per branch（每个分支一句话，重复=噪声）
- cut identity that's already in body（重复信息一律砍）

**OpenXenon 实测**（以 `oxn-asset` 为例）：
```
description: Asset 生命周期管理（v0.6）— 创建/修改/演进/删除 domain / blueprint / stack / library / external。
            底层走 oxn work --type asset 模式。当用户需要建、改、删 Asset 时触发。
            不处理 Work 编排、任务执行、Proof 展示（那是 oxn-work）
```

- 把 **5 个动作**（建/改/演进/删/查）压缩到 description → 违反 "one trigger per branch"
- 末尾硬编码 **排除项**（"不处理…那是…"）→ 违反 "cut identity that's already in the body"
- 但：中文压缩率比英文高 ~40% 字符，部分抵消 verbosity


**§3.3 Progressive disclosure 对比**


| 层级 | Matt 抽象 | OpenXenon 落地 |
|---|---|---|
| in-skill step | SKILL.md 内编号步骤 | `oxn-work` 的 8 阶段流程图 |
| in-skill reference | SKILL.md 内未编号事实段 | 各 SKILL.md 内的"硬规则 / 范式速记 / 错误码"段 |
| external reference | 同目录的引用文件 | `references/*.md`（按需加载）+ `assets/*.md`（模板）+ `.assets.hash` / `.references.hash`（漂移检测）|

OpenXenon 的 progressive disclosure 在结构上与 Matt 一致，并额外加了 **hash 漂移检测**（`.assets.hash` / `.references.hash` 记录内容指纹，防止 SKILL.md 与 references/ 不同步）。


**§3.4 分支切分对比**


| Matt 概念 | OpenXenon 落地 |
|---|---|
| "each distinct way is a branch" | 4 模板（explore / develop / fix / onboarding）|
| Router skill（如 `ask-matt`）| `oxn-cli` 是隐式 router，但未在 frontmatter 声明 router 角色 |
| 按 sequence 拆（防止 premature completion）| 8 阶段顺序严格，validate → lock → run 无 `--force` 后门 |


**§3.5 Pruning 文化对比**


| 维度 | Matt | OpenXenon |
|---|---|---|
| 元 skill（教如何写好 skill）| ✅ `writing-great-skills` | ❌ 无 |
| no-op test 句子级 | ✅ 显式提出 | ❌ 无 |
| skill 大小 | 普遍 < 150 行 | 不均：`oxn-work` 38 行，`oxn-asset` 59 行，`oxn-cli` **366 行**（膨胀警告）|
| Pruning 周期 | 持续 | 无显式周期 |


**§3.6 Negation（Matt 的核心警告）**


Matt 原话："Don't think of an elephant names the elephant"。禁止句式 backfire。

OpenXenon 现状：大量 `## 禁止` / `## 反模式` / "不要 X" 章节（如 `oxn-cli` line 80-91 全是"不要…"）。

**判断细分**：
| 禁令类型 | Matt 警告？ | OpenXenon 应保留？ |
|---|---|---|
| CLI 命令层（如"不要调用 `oxn part new`"）| 不命中 | ✅ 保留——命令确实不存在，是 hard guardrail |
| 语法层（如"不要用 YAML/JSON 写 Blueprint"）| 不命中 | ✅ 保留——是版本约束 |
| 行为层（如"不要在 AI 助手软件中跑 `oxn init`"）| **命中** | ⚠️ 应改写为 positive prompt |


---

**§4 覆盖层双向对照**


**§4.1 Matt 有，OpenXenon 没有（或弱化）**


| Matt skill / 概念 | OpenXenon 等价物 | 差距 |
|---|---|---|
| `/grill-me` / `/grill-with-docs` | 无 | 需求澄清完全靠用户 |
| `/tdd`（red-green-refactor）| Probe 是声明式契约（更严）| 缺 first-class 调试循环 |
| `/diagnosing-bugs` | `work-fix` 模板 | 最弱的一块 |
| `/triage` | 无 | 状态机在 `pools/sprints/`，未 surfaced |
| `/to-spec` / `/to-tickets` | `oxn domain create` + `oxn blueprint create` | ticket 分解仍是手写 |
| `/implement` + `/code-review` | `oxn-work` + IAPError | 缺 two-axis review |
| `/improve-codebase-architecture` | L0-L3 宪法 + `bun scripts/validate-dependencies.ts` + `bun run lint` | **OpenXenon 更优**：连续架构守卫，不依赖 AI 主动跑 |
| `/handoff` / `/teach` | 无 | 跨 session handoff 未规范化 |
| `/writing-great-skills` | 无 | skill 编写无元规则 |
| `/research` | `work-explore` 模板 | 模式存在，引用源规范缺位 |
| `/prototype` | 无（spike 在 `.openxenon/pools/`）| 没有 first-class "throwaway" 概念 |
| `CONTEXT.md` / `GLOSSARY.md` | Domain 资产 | 更严，缺跨域 project-level glossary |
| Router skill 范式 | `oxn-cli` 隐式 router | frontmatter 未声明 |


**§4.2 OpenXenon 有，Matt 没有**


| OpenXenon 独有 | 价值 |
|---|---|
| **OXN DSL + planLock 4-hash** | 把"spec 漂移"变成机器可断言的事实，不依赖 AI 自律 |
| **Probe frozen.json** | 验收从"AI 自检"升为"输出 schema 比对"，比 TDD 更刚性 |
| **IAPError 12 码 + YIELD_TO_HUMAN** | 把 AI 卡死转人工，而不是默默 retry |
| **AssetKind 5 元模型**（domain / blueprint / stack / library / external）| 显式区分业务 / 技术 / 环境 / 知识 / 外部边界 |
| **L0-L3 宪法 + validate-dependencies.ts** | 架构守卫做成 CI 持续执行硬约束 |
| **`oxn pool` 5 池 + journal 二阶段原子写** | 跨 PR 设计意图版本化（research / design / issue / audit / journal）|
| **Builtin probe + Sandbox** | probe 不是自由函数，必须走沙箱校验（FORBIDDEN_GLOBALS 7 个）|
| **CHANGELOG 强制切片**（`.changes/<ver>-<slug>.md`）| 每个 PR 必带 changelog 片段，文档 SSOT 不漂移 |
| **Work v1.1 8 阶段状态机** | validate → lock → run → submit 严格无 `--force` |


---

**§5 OpenXenon 可借鉴的 8 项改进（按 ROI 排序）**


**§5.1 元 skill `oxn-skill`（最高 ROI）**


模仿 Matt 的 `writing-great-skills`，写一个 `.opencode/skills/oxn-skill/SKILL.md` 作为元 skill：
- frontmatter 触发词清单
- completion criterion 模板
- prune checklist（每句做 no-op test）
- 双语模板（zh-cn / en）


**§5.2 拆 `oxn-cli` 366 行**


按 Matt 信息分层原则：
- `SKILL.md` 仅保留 router 行为（"如果你想 X，去 `references/cli-catalog.md`"）
- `references/cli-catalog.md` 沉淀 366 行细节
- `assets/` 放可 fork 的命令示例


**§5.3 router frontmatter 角色声明**


`oxn-cli` frontmatter 显式声明 router：
```
description: Router for OpenXenon CLI tasks. If the user wants to create/modify Assets, load oxn-asset. If the user wants to drive a Work/Task, load oxn-work. If the user wants to verify with Proof, load oxn-proof. If unsure, ask.
```


**§5.4 completion criterion 加固**


各 SKILL.md 内的步骤补全可观察的完成条件：
- ✅ 不要写 "完成"、"通过"
- ✅ 写 "`oxn work status --json` 退出码 0 + `planLock` 字段存在"
- ✅ 写 "frozen.json sha256 与 planLock.workOxnHash 一致"


**§5.5 行为禁令 vs 语法禁令分类**


| 禁令类型 | 当前示例 | 应改为 |
|---|---|---|
| CLI 命令层 | "不要调用 `oxn part new`" | 保留（hard guardrail）|
| 语法层 | "不要用 YAML/JSON 写 Blueprint" | 保留（版本约束）|
| 行为层 | "不要在 AI 助手软件中跑 `oxn init`" | 改 positive prompt："跑前先 `oxn init --check` 确认项目已 init" |


**§5.6 `diagnose-bugs` skill 补齐**


模仿 Matt 的 `/diagnosing-bugs`：reproduce → minimise → hypothesise → instrument → fix → regression-test。补齐 OpenXenon `work-fix` 模板的"最弱的一块"。


**§5.7 `CONTEXT.md` 双写**


在 `.openxenon/CONTEXT.md` 放项目级 glossary，引用 Domain asset，避免术语重复定义。范式速记 / 错误码表从各 SKILL.md 抽出，集中到 `CONTEXT.md`。


**§5.8 `docs/contributing/skill-format.md` SSOT 化**


把"如何写好 skill"沉淀为对外 SSOT（`docs/` 协议），内部 `.opencode/skills/_meta/` 作为操作手册。两者用单向引用：`_meta/` → `docs/contributing/skill-format.md`。


---

# Why

本节回答"为什么要做这次对比"。

**§W.1 防止 OpenXenon skill 体系成为"信息孤岛"**


OpenXenon skill 体系自 v0.6.1 起 4 个 skill（2 仓库内 + 2 用户级）逐步成型，但**写法约定散落**：
- frontmatter 写法无统一规范
- 反模式章节各 skill 各自维护
- 步骤完成条件软（"✓ done" / "通过"）
- 缺少元 skill 教新 skill 怎么写

如果不与外部成熟 skill 库（Matt 14 个 skill 沉淀的写法原则）做横向对比，OpenXenon skill 会重复发明轮子，并逐渐与行业最佳实践脱节。


**§W.2 让 AI 协作者拿到"心智模型锚点"**


AI 协作者每次跑 OpenXenon skill 时，看到的 frontmatter / 硬规则 / 反模式是**项目内部术语**（"硬规则" / "IAP" / "planLock"）。这些术语在 pretraining 里不强，仅在项目内高频密度起作用。

Matt 的 skill 范式提供一组**可在 pretraining 里被激活的概念词**（leading word：tight / red / tracer bullets / no-op test / negation）。OpenXenon 借 Matt 的 leading word 词汇表，可让 AI 协作者更快对齐到 OpenXenon 的指令意图——例如把 OpenXenon 的"硬规则"映射到 Matt 的 "hard guardrail"，把"反模式"映射到 Matt 的 "no-op failure mode"。


**§W.3 评估 OpenXenon skill 的覆盖盲区**


Matt 的 14 个 skill 是 **思维流程** 的覆盖（grill / TDD / diagnose / triage / review / handoff / teach）。OpenXenon skill 是 **CLI 驱动流程** 的覆盖（create / validate / lock / run / submit / finalize）。

| 维度 | Matt | OpenXenon |
|---|---|---|
| 思考 | ✅ 强（`/grill-me` / `/grilling`）| ❌ 弱（无对应 skill）|
| 测试 | ✅ 强（`/tdd`）| ⚠️ 中（Probe 是合约，不是 TDD 循环）|
| 调试 | ✅ 强（`/diagnosing-bugs`）| ❌ 弱（`work-fix` 是模板不是循环）|
| 架构 | ✅ 中（`/improve-codebase-architecture`）| ✅ 强（L0-L3 宪法持续守卫）|
| 执行 | ❌ 弱（无 process engine）| ✅ 极强（`oxn work` 8 阶段）|
| 工件 | ❌ 弱（无产物断言）| ✅ 极强（planLock 4-hash + frozen.json）|

**结论**：OpenXenon 在"执行 + 工件"维度领先 Matt；Matt 在"思考 + 测试 + 调试"维度领先 OpenXenon。两者互补，非互斥。


**§W.4 把对比沉淀为可追溯的设计资产**


本次对比本身是一次**外部参考调研**，符合 Intent Pool 设计池的"长期架构决策"角色（见 `.openxenon/pools/pool-roadmap.md` §5 池角色分工）。落盘到 `.openxenon/pools/design/` 后：
- 可被未来 v0.8 / v0.9 路线图引用
- 可被 AI 协作者在改动 `.opencode/skills/*` 时主动检索
- 可被审计池（`.openxenon/pools/audit/`）反向追溯 skill 演进决策


---

# How

本节回答"对比怎么做、文档怎么用"。

**§H.1 调研方法（已完成）**


| 步骤 | 工具 | 产出 |
|---|---|---|
| 读 Matt README + writing-great-skills | webfetch | 14 skill 总览 + 元 skill 原则 |
| 读 OpenCode skills 文档 | webfetch | frontmatter / discovery / 长度规则 |
| 读 OpenXenon 4 个 SKILL.md + references | Read / Glob | 行数 / frontmatter / 反模式 / 跨引用 |
| 双向对比 | 推理 | §2-§5 四层对比 |
| 落盘 | Write | 本文档 |


**§H.2 文档用法**


| 读者 | 用法 |
|---|---|
| **AI 协作者**（写 / 改 skill 时）| 读 §3 实现层 + §5 改进清单；遇到"反模式怎么写"时翻 §3.6 negation 决策树 |
| **人类工程师**（评估 skill 体系时）| 读 §2 哲学层 + §4 覆盖对照；判断 OpenXenon 是否需要引入新 skill 类型 |
| **Skill 维护者**（按 ROI 排改进时）| 按 §5 顺序逐项拍板，每项独立 PR |


**§H.3 验证流程**


```bash
# 1. heading skeleton 自检（必跑）
bun scripts/check-heading-skeleton.ts .openxenon/pools/design

# 2. biome 格式自检
bun run check

# 3. 视觉确认（仅设计池，不进 vitepress）
# 通过 oxn pool list 看到新文档 + .opencode/command/opsx-explore 可读到
oxn pool list --json
```


**§H.4 不在本文档范围**


- 不动 `.opencode/skills/oxn-*/SKILL.md` 本体
- 不写 `docs/` SSOT（双 SSOT 风险，由后续 PR 各自决定）
- 不实现 §5 的 8 项改进（仅提案）


---

# 决策记录

| # | 决策点 | 当前选择 | 备选 | 决策时间 |
|---|---|---|---|---|
| D1 | 文档落点 | `.openxenon/pools/design/`（设计池）| `docs/zh-cn/`（对外 SSOT）| 2026-07-09 |
| D2 | 双语策略 | 仅中文（zh-cn 是权威源；en 翻译按需）| 中英同步 | 2026-07-09 |
| D3 | 触发 Skill 是否同步改造 | 否（本次仅沉淀对比）| 同步改造 `oxn-cli` frontmatter | 2026-07-09 |
| D4 | changelog 写入 | 否（轻量 PR，不入 `.changes/`）| 写入 `.changes/0-7-1-...md` | 2026-07-09 |
| D5 | §5 改进是否预锁路径 | 否（仅提案，按 ROI 排序，PR 各自拍板）| 预锁 v0.7.2 / v0.8.0 路线图 | 2026-07-09 |

---

# 范围之外

| 项 | 不在本文档原因 |
|---|---|
| 实际改造 `.opencode/skills/*` | 本文档是设计笔记，不是 PR 实施单；每项改进建议独立 PR |
| GSD / BMAD / Spec-Kit 内部实现 | 仅作为命名对照，深入对比超出调研范围 |
| OpenCode 协议升级提案（如新增 `disable-model-invocation` 字段）| OpenCode 协议由上游决定，OpenXenon 应跟随 |
| Matt skill 的具体代码示例搬运 | OpenXenon skill 落地应基于 OXN DSL + planLock 范式，不照搬 |
| `CONTEXT.md` 双写内容 | §5.7 仅为提案，实际内容由后续 PR 沉淀 |
| v0.8+ 路线图项绑定 | 本文档不锁版本路线图，由 RFC 流程单独拍板 |

---

**§R.1 内部引用**


| 引用 | 路径 |
|---|---|
| OpenXenon skill 本体 | `.opencode/skills/oxn-asset/SKILL.md`、`.opencode/skills/oxn-work/SKILL.md` |
| 用户级 skill | `~/.opencode/skills/oxn-cli/SKILL.md`、`~/.opencode/skills/oxn-proof/SKILL.md` |
| skill 元数据 | `.opencode/skills/oxn-asset/.{assets,references}.hash` |
| 仓库 AGENTS | `AGENTS.md` §v0.6 RFC、L0-L3 宪法 |
| 架构文档 | `.openxenon/pools/design/2026-06-25-iap-lifecycle-sequence.md` |
| 工作闭环 | `.openxenon/pools/design/2026-07-09-v0.7-work-closed-loop-and-cleanup.md` |
| Pool 入口 | `.openxenon/pools/pool-roadmap.md` |
| Heading 自检 | `scripts/check-heading-skeleton.ts` |


**§R.2 外部引用**


| 引用 | URL |
|---|---|
| mattpocock/skills 仓库 | https://github.com/mattpocock/skills |
| writing-great-skills 元 skill | https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md |
| OpenCode skills 文档 | https://opencode.ai/docs/skills/ |
| Pragmatic Programmer 引文源 | https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V |
| Domain-Driven Design 引文源 | https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215 |


**§R.3 对照组（Matt 文中提及但未深入）**


- GSD（Get Shit Done）
- BMAD-METHOD
- GitHub Spec-Kit