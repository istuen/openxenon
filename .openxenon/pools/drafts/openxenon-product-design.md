# OpenXenon 产品设计（探索稿）

> **状态**：Draft（探索稿 · Pool）
> **日期**：2026-07-13
> **触发**：从产品层面梳理 OpenXenon 最新版（v0.6.x 现状 + v0.7+ 演进方向）整体设计
> **定位**：产品层说明（面向产品 / 用户视角，非架构决策记录、非代码实现细节）
> **落点**：本稿为 Pool 探索稿；定稿后走 `oxn work create product-overview --blueprint doc-promote` 提升为 `docs/zh-cn/product-overview.md` + `docs/en/product-overview.md` 双语确定性 Doc。
> **素材来源**：`README.md` + `docs/zh-cn/{index,core-concepts,work,insight,proof,asset,asset-paper,architecture,roadmap}.md` + `.openxenon/pools/drafts/{trust-chain-product-model,v0.7-plus-roadmap-overview,v0.7-plus-roadmap-changelog,v0.7-emergence-changelog,v0.6.6-hall-narrative}.md` + `.openxenon/docs/adrs/INDEX.md`

---

## 〇、阅读指南

> **产品是指 OpenXenon 提供的特性，其能让工程师、AI 使用的才是功能。**
>
> 理念设计是产品设计的**来源**，架构设计是产品设计的**体现**，技术实现则是产品设计的**落地**。

本文是**产品视角**的 OpenXenon 全景描述，只回答一个问题：**OpenXenon 提供什么功能、这些功能怎么构建信任、工程师和 AI 怎么用。**

- 理念设计（E1-E4 哲学实体）→ 产品设计的来源，见附录指路
- 架构设计（L0-L3 工程分层）→ 产品设计的体现，见附录指路
- 技术实现（Round 多轮 / 证据链三件套 / Asset-as-Paper / Probe 探针）→ 产品设计的落地，见附录指路

章内按 `What → Why → How → 参考` 模板组织。

---

## 一、What —— OpenXenon 是什么

### 1.1 一句话定义

OpenXenon 是一款**面向 AI Agent 的轻量级信任协作工具**。

它帮助工程师定义边界，证明 AI Agent 的执行，信任其在边界内的成果——建立工程师与 AI Agent 可信任的边界。

### 1.2 产品形态

- **轻量级工具**：以 Skills 形式注入现有 AI Agent 工作台（OpenCode / Claude Code / Codex / Cursor），而非自建 IDE 或执行环境
- **接入方式**：`npm install -g @istuen/openxenon` → `oxn init --ai <agent>` 一步注入 `/oxn-work` Skill
- **使用方式**：在 AI Agent 中输入 `/oxn-work <目标>`，AI 自动读边界 → 匹配 Blueprint → 在协作空间内工作 → OXN 出客观证据
- **统一入口**：v0.6 起 Skills 收敛为**唯一** `/oxn-work`（IAP 范式统一入口）；原 `oxn-cli` / `oxn-proof` 已删除

### 1.3 六项顶层功能

OpenXenon 提供 6 项顶层功能支撑人机协作：

| # | 功能 | 用户能做什么 |
|---|---|---|
| F1 | **轻量级安装，注入 Skills 使用** | 装上就能用，不改变现有工作流 |
| F2 | **边界资产** | 工程师定义 Domain / Workflow / Stack / Blueprint——资产即协议，会演化，作为边界被引用 |
| F3 | **协作空间** | 工程师与 AI 在空间内协作完成工作 |
| F4 | **客观证据** | OXN Engine 出具证据证明 AI 成果，不做判决 |
| F5 | **洞察** | 跨多个 Work 综合推理产出资产级建议 |
| F6 | **研讨厅** | 可视化 + 交互界面（不止可观测） |

### 1.4 产品本质

OpenXenon 帮助工程师定义边界，证明 AI Agent 的执行，信任其在边界内的成果。建立工程师与 AI Agent 可信任的边界。

---

## 二、OXN Engine

> **工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**
>
> **工程师信任 AI Agent 在边界内的执行成果。**

OXN Engine 是 OpenXenon 的核心——它驱动"工程师 ↔ AI Agent ↔ OXN Engine"三方协作流水线运转，是信任协作的工具载体。

### 2.1 协作流水线

| 阶段 | 角色 | 行为 | 关键产物 |
|---|---|---|---|
| **Intent（定意图）** | 工程师 | 定义边界、声明意图 | Domain / Blueprint / Stack |
| **Align（跑对齐）** | AI Agent | 在边界内执行 | Work / Task / 落盘产物 |
| **Proof（出证明）** | OXN Engine | 跑探针、记录客观事实 | 客观证据 |

### 2.2 OXN Engine 是公证人，不是裁判

OXN Engine 记录"发生了什么"（脚本退出码、测试覆盖率、文件路径等客观事实），不评判"工作合格不合格"。"合格"判定属于工程师——基于边界资产对照客观证据。

### 2.3 三方信任拓扑

工程师与 AI 原本是两个点协作，但这个协作充满不确定性导致不可信任。OXN Engine 加入后是分别跟两者建立信任协作，然后让工程师可以通过 OXN Engine 信任 AI。

- **工程师 ↔ OXN**：信任来自「OXN 出示证据，告知 AI 执行了什么、哪些在边界内、哪些在外」
- **AI ↔ OXN**：信任来自「OXN 提供确定性内容（边界资产 / 协作空间 / 客观证据），AI 能获取反馈、知道推理方向是否在边界内」
- **工程师 → AI（间接）**：通过 OXN 的确定性证据，工程师得知 AI 哪些可靠、哪些不可靠

---

## 三、Why —— 为什么需要 OpenXenon

### 3.1 核心命题

当 AI Agent 说"我做完了"，谁能让工程师**信任**这件事真的发生了？——**不是 AI 自证，而是 OXN Engine 独立公证的客观证据**。

### 3.2 三痛点

深夜两点的工程师正在"babysitting the AI"——盯着终端、反复追问"你真的做完了吗？真的修好了吗？真的跑过测试了吗？" 这不是个案，是用 AI 写代码的工程师的日常。

| 痛点 | 现象 | AI 的本质 |
|---|---|---|
| **Drift（漂移）** | AI 跑着跑着目标悄悄偏了——"加索引"变成"重构用户模块"；Drift 是最难发现的 bug，看到代码时它已经成型 | 越跑越远 |
| **Hallucination（幻觉）** | AI 自信地输出错误——"已修复，测试通过"但实际改的是错误文件、测试根本没跑；AI 从不迟疑，从不说"我不确定" | 概率性推理 |
| **幻觉自证** | AI 多轮迭代反复自我说服——Round 1 说修好了（没跑测试）→ Round 2 说加测试了（不覆盖 bug）→ Round 3 说测试通过了（断言写反）→ Round 4 说修复完成（相信 Round 3） | **AI 不是"做不到"，而是"做到了但不知道自己没做到"，然后自我说服做到了** |

### 3.3 差异定位

**vs OpenSpec**：

| 维度 | OpenSpec | OpenXenon |
|---|---|---|
| 资产角色 | 被 change 改写的目标（规范是产物） | 被引用的边界（资产即协议） |
| 版本 | 流动的（每次 archive 合并） | 演化的（保留历史，会演进） |
| 验证 | AI 自查 + 人工 review | Engine 独立出客观证据 |
| 工作流 | 单次线性 | 协作空间内多轮循环（最大护城河） |

一句话：OpenSpec 的 spec 是**"工作要改写的目标"**，OXN 的边界资产是**"工作要遵守的边界"**。

**vs 传统沙箱**：

| 维度 | 传统沙箱 | OpenXenon |
|---|---|---|
| 约束时机 | 预防（pre-emptive） | 事后（post-hoc） |
| 失败处理 | 拒绝执行 | 记录并继续 |
| 哲学 | "不该做的不能做" | "做了什么都被记住" |
| AI 自主性 | 低（被约束） | 高（被信任 + 可审计） |

---

## 四、How —— 信任怎么被功能构建

### 4.1 信任是协作的核心

> **信任链是 OpenXenon 的"能源"——没有信任链，OXN 只是任务跟踪器，不是信任协作工具。**

工程师与 AI 原本是两个点协作，但这个协作充满不确定性导致不可信任。OpenXenon 加入后是分别跟两者建立信任协作，然后让工程师可以通过 OpenXenon 信任 AI。

### 4.2 信任链四层 ← 功能映射

信任链由**四层确定性能力**构成（v0.6.1 = 最小信任闭环），每层由对应的功能构建：

| 信任层 | 支撑功能 | 功能怎么构建信任 |
|---|---|---|
| **D1 确定性边界** | F2 边界资产 | 资产即协议——工程师确定性地表达"AI 应在什么边界内执行"，确定性地定义"可靠"长什么样 |
| **D2 确定性验证** | F4 客观证据 | Engine 独立出证，非 AI 自报——证明是真的，不是谎言 |
| **D3 确定性证据** | F4 客观证据 | 证据不可篡改，含失败路径——工程师看得到 AI 不可靠的部分 |
| **D4 确定性记录** | F3 协作空间 + F6 研讨厅 | 边界违反记录而非阻止 + 可视化透明——AI 高自主 + 工程师高安全 |

**为什么是"链"**：确定性的一环扣一环传递——`D1 → D2 → D3 → D4`，任一环断裂，OXN 退回"任务跟踪器"。

**D4 的关键产品原则**：AI 是否跨越边界是 AI 自己的概率决策；OXN 只**确定性地告知**工程师 AI 跨越了边界，由工程师决定调整边界还是接受。这是"记录而非阻止"的审计链哲学，也是 OpenXenon 与沙箱式防御的根本区别。

### 4.3 六项顶层功能详述

#### F1 轻量级安装，注入 Skills 使用

**能做什么**：一条命令把 OpenXenon 注入现有 AI Agent 工作台，不改变现有工作流。

```bash
npm install -g @istuen/openxenon   # 安装
oxn init --ai opencode             # 注入 /oxn-work Skill
# 然后在 AI Agent 里直接用：
/oxn-work <你的目标>
```

**解决什么**：工程师不想换 IDE，不想搭新环境，只想让现有 AI Agent 多一层信任保障。

**用户价值**：装上就能用。支持 OpenCode / Claude Code / Codex / Cursor 四大工作台；v0.6 起统一入口 `/oxn-work`，无需记多个命令。

**AI Agent 集成支持**：

| AI Agent | 初始化命令 | Skill | 状态 |
|---|---|---|---|
| OpenCode | `oxn init --ai opencode` | `/oxn-work` | ✓ 支持 |
| Claude Code | `oxn init --ai claude` | `/oxn-work` | ✓ 支持 |
| Codex | `oxn init --ai codex` | `/oxn-work` | ✓ 支持 |
| Cursor | `oxn init --ai cursor` | `/oxn-work` | ✓ 支持 |

---

#### F2 边界资产

**能做什么**：工程师定义 4 类资产——Domain（业务词典）/ Workflow（执行蓝图）/ Stack（技术栈约束）/ Blueprint（组合模板）。资产即协议，会演化，作为边界被协作空间引用。

| 资产类型 | 约束什么 | 示例 |
|---|---|---|
| **Domain** | 业务上"说什么 / 不能说什么"——term 强制使用、ban 禁止使用、invariant 机器校验 | `MemberContext` |
| **Workflow** | 技术上"分几步做、步间依赖" | `dev-workflow`、`fix-issue` |
| **Stack** | 工程师对 AI 设定的技术环境约束 | `node-ts` |
| **Blueprint** | 组合模板——组合 Domain + Workflow + Stack，供协作空间一次性引用 | `integrate-payment` |

**资产即协议**：资产不是"被冻结为协约"——资产的存在本身就是协议。资产会演化（保留历史、可演进），但在被协作空间引用期间作为边界确定性地存在。

**解决什么**：AI 不知道工程师的"统一语言"是什么、按什么步骤做、用什么技术栈。边界资产让这些前置为 AI 可读的协议。

**用户价值**：
- 工程师确定性地表达"可靠"长什么样（D1 确定性边界）
- 资产会演化，但演化有审计轨迹——不是"冻结不可变"，而是"演进可追溯"
- 影响半径可量化——资产被引用次数决定其变更影响面（基础层 vs 应用层）

---

#### F3 协作空间

**能做什么**：工程师与 AI 在一个空间内协作完成工作——工程师声明意图与边界，AI 在边界内执行，空间记录全过程。

**产品视角**：协作空间是工程师与 AI 的动态协作场所。空间内是 IAP Engine 实现 Loop（这是技术实现的词语，不在本稿展开）。从产品视角，工程师和 AI 在空间内做三件事：

| 阶段 | 谁主导 | 做什么 |
|---|---|---|
| 定意图 | 工程师 | 声明目标 + 选边界资产 |
| 跑对齐 | AI | 在边界内执行，多轮对齐直到完成 |
| 收口 | OXN Engine | 出客观证据收口 |

**解决什么**：AI 跑着跑着目标偏了（Drift），或者声称做完了但实际没做（Hallucination）。协作空间把"工程师 ↔ AI"的协作放进一个有边界、有记录、可多轮的空间里。

**用户价值**：
- AI 在边界内自由发挥，不被预防式限制
- 边界违反**记录而非阻止**（D4 确定性记录）——AI 高自主 + 工程师高安全
- 多轮对齐——失败时手动开下一轮重新对齐，避免 AI 自我说服的死循环
- 全程审计轨迹——空间内发生的每件事都被记录，事后可追溯

---

#### F4 客观证据

**能做什么**：OXN Engine 独立出具证据，证明 AI 的工作成果，但不做判决。"合格"的判定属于工程师。

**产品视角**：客观证据是 OXN 作为第三方公证人产出的不可篡改记录。独立验证、不可篡改、3-state verdict 这些是客观证据的运行职责和技术实现，不是产品功能本身。从产品视角，工程师拿到的是：

- 一份**证据**：AI 做了什么、结果是什么、哪些在边界内、哪些在边界外
- 一份**判决记录**：PASSED / FAILED / **INCONCLUSIVE**（三态，INCONCLUSIVE 强制人审——拒绝虚假确定）
- 证据**AI 改不了**：写权独占，工程师看到的是真相

**关键产品原则**：**OXN 是公证人，不是裁判**——它记录"发生了什么"（脚本退出码、测试覆盖率、文件路径等客观事实），不评判"工作合格不合格"。工程师基于边界资产对照客观证据，自己决定合格与否。

**解决什么**：AI 自证"做完了"不可信。客观证据让工程师看到第三方出具的事实，而不是 AI 的自报。

**用户价值**：
- 证明是真的（D2 确定性验证）——Engine 独立执行，非 AI 自查
- 证据是完整的（D3 确定性证据）——含失败路径，工程师看得到 AI 不可靠的部分
- 证据是确定的（D3）——不可篡改，AI / 工程师都改不了
- 拒绝虚假确定——INCONCLUSIVE 强制人审，不放过"不确定"的情况

---

#### F5 洞察

**能做什么**：跨多个 Work 综合推理，产出资产级建议——"该废弃哪个 Domain / 哪个 Blueprint 模式反复失败 / 哪个 Stack 成瓶颈"。

**产品视角**：洞察是 OpenXenon 的第四项功能。涌现是洞察这个功能背后的机制（行为），不是功能本身——本稿只讲功能。

| 维度 | 说明 |
|---|---|
| 输出 | 协作态势信号——AI 用了哪些边界 / 触碰什么边界 / 哪条规则被反复试探 / Loop 收敛速度 / 退出模式 |
| 不输出 | 代码质量评分、代码"美丑"、设计模式合规性 |
| 不自动回写 | 所有洞察建议必须经工程师 review / approve 闸门 |

**解决什么**：单个 Work 的结果只能告诉工程师"这次怎么样"。跨多个 Work 的互动模式才能涌现"某个边界资产该改进 / 该废弃"——这些结论无法从任何单次协作里读出来。

**用户价值**：
- 信任从单次协作延伸到长期演进——工程师看到的是 AI 协作的长期态势，不是单次结果
- 建议不自动落地——必须工程师 approve，工程师主权不动
- 资产持续优化——洞察反哺边界资产，形成"协作 → 洞察 → 改进边界 → 更好协作"的闭环

---

#### F6 研讨厅

**能做什么**：把 OpenXenon 的数据可视化，并提供给工程师、AI 的交互界面——不止可观测，还可交互。

**产品视角**：研讨厅是工程师和 AI 与 OpenXenon 数据交互的界面。不只是"看面板"，而是工程师在这里理解协作态势、审核洞察建议、做出决策。

| 面板 | 数据源 | 能做什么 |
|---|---|---|
| Health | 协作空间运行状态 | 看 works / rounds / failures 趋势、Top 失败模式、Token 消耗 |
| Insight | 洞察池 | 看洞察列表、详情、来源引用、目标资产、建议操作 |
| Hook | 事件流 | 看事件流水、按时机/空间/任务过滤、失败率统计 |

**v0.6.x 状态**：三大面板完整化（read-only 为主，交互通过 CLI 完成）。**v0.7+ 演进**：Vue 组件化，交互能力升级（filter / search / 详情），Insight 关系图（Mermaid 渲染）。**v0.8+**：WebSocket 实时推送 + 按钮触发 CLI。

**解决什么**：证据和行为都在文件里，但工程师需要看得见、能交互的界面，才能理解态势、做出决策。

**用户价值**：
- 证据/行为/态势可视化（D4 确定性记录）——看得见才信得过
- 交互不止观测——工程师在研讨厅审核洞察、理解协作健康度、做出决策
- 数据透明——协作空间的全过程在这里可见，没有黑箱

---

## 五、产品演进路线

### 5.1 整体时间线

| 阶段 | 主题 | 时间 | 产品交付 |
|---|---|---|---|
| **v0.6.x** | 最小信任闭环 | 2026-07 → 2026-10 | 信任链四层就位；研讨厅 v0 三大面板；Hook 时机钩子；Token 经济学 |
| **v0.7** | 洞察工程化 | 2026-11 → 2027-01 | 洞察审核闭环 + 模式库 + 关系图 + 研讨厅 v0.5（Vue 组件化、可交互） |
| **v0.8** | 外部信息流 | 2027-02 → 2027-04 | Skill 远程 Registry + 边界资产知识库 + Probe 生态市场 + 跨项目洞察共享 + 研讨厅实时 |
| **v0.9** | 自组织协同 | 2027-05 → 2027-07 | 自适应 Blueprint + AI Agent 多样性 + 非线性反馈回路 + 协同健康度 |
| **v1.0** | 临界点 + CAS | 2027-08 → 2027-10 | 临界条件识别 + 突变引导/抑制 + **Engine 独立发布** + 研讨厅 v2 |
| **v1.x+** | 综合集成 | 2027-11+ | 定性→定量转换 + 专家知识显式化 + 人机共创空间 + 跨组织洞察 |

### 5.2 v0.6.x 现状基线

| 版本 | 产品交付 |
|---|---|
| v0.6.0 | 六项顶层功能架构重塑版 |
| v0.6.1 | **信任链四层就位**（最小信任闭环） |
| v0.6.2 | 洞察收集层（F5 最弱形态） |
| v0.6.3 | 边界资产分级 + Token 经济学 + Asset-as-Paper |
| v0.6.4 | Hook 时机钩子（Pre / Post / Stop） |
| v0.6.6 | 文档叙事统一 + 研讨厅 v0 三大面板完整化 |

### 5.3 v0.7 洞察工程化（下一步）

| 交付 | 功能 |
|---|---|
| 洞察审核闭环 | `oxn insight apply <id>` 一键应用 + 自动 validate + 错误回滚 |
| 模式库 | 跨 Work 模式持久化 |
| 洞察关系图 | Mermaid 渲染 Work → Insight → Asset 链路 |
| 研讨厅 v0.5 | Vue 组件化，6 大面板，可交互 |
| 边界资产影响图 | 研讨厅展示 Insight → Asset 链路 |

**明确推迟**：研讨厅实时刷新 → v0.8；研讨厅按钮触发 CLI → v0.8；**模式自动 promote → 永不**。

### 5.4 长期愿景

v1.x+ 起，OpenXenon 从"工具"演进为"基础设施"——支持跨组织、跨项目的人机协作，工程师通过 OXN 形成"工程智慧沉淀平台"。

---

## 六、产品约束与边界

### 6.1 不可妥协的约束

| 约束 | 含义 |
|---|---|
| 三方主导权不交叉 | 工程师 / AI / OXN 各司其职 |
| 客观证据不可绕过 | Daemon 硬阻断 + 无 `--force` |
| AI 不直接反写边界资产 | 洞察反哺必须人工 approve |
| 强制人工审核 | 永不自动 apply / promote |
| 轻量级工程边界 | 不破坏 v0.6 收敛的六项功能架构 |

### 6.2 三方分工与禁区

| 主体 | 主导 | 核心动作 | 绝对禁区 |
|---|---|---|---|
| **工程师** | F2 边界资产 + 定意图 | 定义边界资产、创建协作空间、决定合格判定 | 不能把"工作是否合格"的判定权让渡给 AI |
| **AI Agent** | F3 协作空间内跑对齐 | 在边界内执行、多轮对齐、落盘产物 | 不能越过边界，不能修改边界资产 |
| **OXN Engine** | F4 客观证据 + F5 洞察 | 跑探针、记录客观事实、产出证据 | 不评判代码质量、不修改边界资产、不替 AI 执行 |

### 6.3 明确不做

| 功能 | 理由 |
|---|---|
| OpenXenon 自我意识 | 工具定位——是放大镜 / 安全带 / 进化催化剂，不是生命体 |
| AI 自主反写边界资产 | 工程师主权 |
| 取代工程师做决策 | 工具定位 |
| 默认收集大模型训练数据 | 隐私 |
| 默认跨组织洞察共享 | 隐私 + opt-in |
| 实时多人协作 | 复杂度过高，v2.0+ 考虑 |

---

## 七、5 分钟上手

### 安装

```bash
npm install -g @istuen/openxenon   # or: pnpm add -g @istuen/openxenon
```

> v0.5+ 暂停 npm 发布；开发版本请走 git clone + bun install。

### 注入 Skills

```bash
cd your/project
oxn init --ai opencode
```

### 在 AI Agent 中使用

```
/oxn-work 验证 src/index.ts 是否存在
```

---

## → 参考

### 对外文档（确定性 SSOT）
- [Introduction](../../docs/zh-cn/index.md) — OpenXenon 的愿景与定位
- [Core Concepts](../../docs/zh-cn/core-concepts.md) — E1-E4 完整概念 + 信任链
- [Work](../../docs/zh-cn/work.md) — 协作空间 IAP 核心
- [Asset](../../docs/zh-cn/asset.md) — 边界资产
- [Asset Paper Schema](../../docs/zh-cn/asset-paper.md) — Asset-as-Paper + 引用计数 + DAG
- [Proof](../../docs/zh-cn/proof.md) — 客观证据
- [Insight](../../docs/zh-cn/insight.md) — 洞察
- [Architecture](../../docs/zh-cn/architecture.md) — Engine L0-L3 分层
- [Roadmap](../../docs/zh-cn/roadmap.md) — P0-P3 路线图
- [CLI 参考](../../docs/zh-cn/cli.md) — 完整 oxn 命令清单

### 对内-沉淀文档
- [ADR 索引](../docs/adrs/INDEX.md) — 50+ 条架构决策记录（append-only）
- [ADR-0057 信任链核心模型](../docs/adrs/0057-trust-chain-core-model.md)
- [ADR-0058 最小信任闭环](../docs/adrs/0058-minimum-trust-closure.md)
- [ADR-0054 三边界框架](../docs/adrs/0054-three-boundary-framework.md)
- [ADR-0055 Blueprint 组合模板](../docs/adrs/0055-blueprint-as-composition-template.md)
- [ADR-0031 Proof = 公证人 ≠ 裁判](../docs/adrs/0031-proof-notary-not-judge.md)
- [ADR-0012 Main/Sub Agent 审计链哲学](../docs/adrs/0012-main-sub-agent-audit-chain.md)

### 对内-探索文档（本稿同层）
- [信任链产品模型](./trust-chain-product-model.md) — 信任链产品层定义
- [v0.7+ Roadmap Overview](./v0.7-plus-roadmap-overview.md) — v0.7 → v1.x 整体路线
- [v0.7+ Roadmap Changelog](./v0.7-plus-roadmap-changelog.md) — v0.7+ 变更日志
- [v0.7 Emergence Changelog](./v0.7-emergence-changelog.md) — v0.7 洞察工程化
- [v0.6.6 Hall Narrative](./v0.6.6-hall-narrative.md) — 文档叙事统一 + 研讨厅 v0
- [v0.7+ System Science Alignment](./v0.7-plus-roadmap-system-science-alignment.md) — 7 大系统科学理论对齐

### 版本 changelog
- `.changes/` — 按版本号组织的变更日志片段

---

## 附录：理念 → 架构 → 实现 指路

> 本稿是产品视角。理念、架构、技术实现是产品设计的来源、体现、落地——以下是它们的指路索引，不在本稿展开。

### 理念设计（产品设计的来源）

**E1-E4 四结构实体**解释"为什么"这些功能这样设计：

| 实体 | 性质 | 对应功能 |
|---|---|---|
| E1 Asset | 静态边界 | F2 边界资产 |
| E2 Work | 动态协作 | F3 协作空间 |
| E3 Engine | 独立公证 | F4 客观证据 |
| E4 Insight | 涌现层 | F5 洞察 |

详见 [Core Concepts](../../docs/zh-cn/core-concepts.md)。

### 架构设计（产品设计的体现）

**L0-L3 工程分层**描述代码的依赖方向（上层依赖下层，不可反向）：

| 层级 | 职责 |
|---|---|
| L0 Kernel | 纯逻辑、零 IO |
| L1 OXL + Infra | DSL 解析 + 文件系统 + 探针执行 |
| L2 Engine | 6 大业务模块（Asset / Intent / Align / Proof / Insight / Pool） |
| L3 Tools | CLI + Skills + Daemon |

详见 [Architecture](../../docs/zh-cn/architecture.md)。

### 技术实现（产品设计的落地）

| 技术实现 | 一句话 | 详见 |
|---|---|---|
| IAP Engine + Loop | 协作空间内实现意图→对齐→证据循环的引擎 | [Work](../../docs/zh-cn/work.md) |
| Round 多轮循环 | 失败时手动开下一轮重新对齐的技术机制 | [Work §3](../../docs/zh-cn/work.md) |
| 证据链三件套 | frozen.json + trace.jsonl + state.json 的不可变证据存储 | [Work §11.5](../../docs/zh-cn/work.md) |
| Probe 探针 | Engine 独立执行的验证器，采集客观事实 | [Proof](../../docs/zh-cn/proof.md) |
| 3-state verdict | PASSED / FAILED / INCONCLUSIVE 三态判决 | [Proof](../../docs/zh-cn/proof.md) |
| 三层冻结锁 | OS chmod 0o444 + content_hash + planLock | [Asset §3](../../docs/zh-cn/asset.md) |
| Asset-as-Paper | 资产即论文——abstract / references / citations / auditTrail | [Asset Paper Schema](../../docs/zh-cn/asset-paper.md) |
| Blueprint 组合模板 | Domain + Workflow + Stack 的组合层，供协作空间一次性引用 | [Asset §1](../../docs/zh-cn/asset.md) |
| Hook 时机钩子 | Pre / Post / Stop 三时机的协作空间事件钩子 | v0.6.4 落地 |
| Daemon 守护进程 | 协作空间监督 + 逃逸机制 + 研讨厅数据源 | v0.6.1 落地 |
