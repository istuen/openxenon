---
entity: rfc
id: RFC-0018
theme: project-engineering-meta
status: Accepted
date: 2026-07-31
accepted: 2026-08-05
accepted-at: 2026-08-05
supersedes: []
superseded-by: ~
related:
  - RFC-0009
  - RFC-0010
  - RFC-0011
  - RFC-0012
  - RFC-0013
  - RFC-0028
  - .openxenon/assets/domains/oxn-project-domain.md
  - AGENTS.md
synced-at: 2026-08-05
---

# RFC-0018: 项目工程元层与 SSOT 全景

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：project-engineering-meta
<!-- allow-version -->
> **状态**：✅ Accepted（2026-08-05 — Meta Modality 落地：CONTEXT-MAP.md + oxn-project-domain.md v0.3.0 + check-doc-boundary 14 条规则 + AGENTS.md 5 级语义优先级）
> **来源**：2026-07-31 `/grilling` session（domain-modeling skill）
> **批次**：2026-07-31 v0.6.2-alpha.2 配套新增
<!-- /allow-version -->
> **关系**：本 RFC 是 RFC-0009 的**扩展**（增加第 4 层），不替代；与 RFC-0010/0011/0012/0013 四个 meta-RFC 并列。2026-08-10 由 RFC-0028 撤销 §D3（CONTEXT-MAP.md 重构决策反转），新增 §D5（CONTEXT-MAP.md 退役）；本 RFC 的 Meta 层由 5 类文档降为 4 类（CONTEXT-MAP.md 已删除）。

## 摘要

OXN 文档架构从 RFC-0009 的三情态（Asset / RFC / Doc）扩展为**四层 SSOT 全景**，新增**项目工程元层**承载 5 类仓库根文档（README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/）。本 RFC 定义：

1. 四层 SSOT 全景表
2. 项目工程元层 5 类文档的精确定位与演进策略
3. CONTEXT-MAP.md 重构（从 283 行降级至 ≤ 100 行；R&N 7 术语对照迁入本 RFC 附录）—— 2026-08-10 由 RFC-0028 §D1 撤销
4. 项目工程元层跨层引用规则（含 5 类例外豁免）
5. `check-doc-boundary.ts` 新增 5 条规则矩阵（2026-08-10 由 RFC-0028 §D3 简化 4 条）

## 决策

### D1：四层 SSOT 全景

| 层 | 情态 | 物理位置 | 受 RFC 约束 |
|---|---|---|---|
| **Asset（定义性）** | "X 是什么" | `.openxenon/assets/{kind}/*.md` | RFC-0009 / RFC-0011 / RFC-0014 |
| **RFC（规定性）** | "为什么决定 X" | `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` | RFC-0009 / RFC-0010 / RFC-0013 |
| **Doc（描述性）** | "怎么用 X" | `docs/{product,dev}/{zh-cn,en}/*.md` | RFC-0009 / RFC-0006 |
| **Meta（项目工程元）** | "OXN 自己怎么组织" | `README.md` / `AGENTS.md` / `.changes/` / `dev/` | **本 RFC 新增**（2026-08-10 RFC-0028 撤销 CONTEXT-MAP.md） |

**Meta 层与三情态并列，不从属**——它是 OXN 自身工程元层（meta-vocabulary），不描述用户业务，描述 OXN 项目的工程结构与文档架构。

### D2：项目工程元层 5 类文档定义

| 文档 | 角色 | 物理位置 | 演进策略 | 情态归属 | 受 RFC-0018 引用规则 |
|---|---|---|---|---|---|
| **README.md** | 仓库根入口（marketing + 5min quickstart + GitHub 渲染） | 仓库根 | 与 `docs/product/zh-cn/introduction.md` slogan 双向同步 | 描述性 + 元入口 | D4.1 |
| **AGENTS.md** | AI Agent 进入项目的第一份入口（开发 + AI 协作） | 仓库根 | 跟随主版本演进 | 描述性 + 元入口 | D4.2 |
| **.changes/0-X-Y-*.md** | Version Fragment（changelog 片段） | 仓库根 | 版本转正时落盘 | 描述性（用户可见） | RFC-0013 D3 |
| **dev/{versions,fix,pool}/** | Roadmap + Fix Record + PlanningPool | 仓库根 | RFC-0013 D3/D4 + PlanningPool 2026-07-27 补 | 描述性（开发者面向） | RFC-0013 D4 |

### D3：CONTEXT-MAP.md 重构 —— **2026-08-10 由 RFC-0028 §D1 撤销**

> 原 D3 内容（CONTEXT-MAP.md 从 283 行降级至 ≤ 100 行；R&N 7 术语对照迁入本 RFC 附录；新增 §跨层引用段）由 RFC-0028 §D1 撤销。CONTEXT-MAP.md 整体删除（不再降级），Meta 层入口由 `AGENTS.md` §入口指针 + §AI Agent 唯一入口段统一承担。

#### D3 撤销理由（RFC-0028 §D1）

1. **内容语义**：CONTEXT-MAP §核心术语锐化段（Referent / OpenXenon / Asset / Work / Proof / P / Report / ProbeOutcome / outcome / StructureV2 共 9 段）**全部是 OpenXenon Domain 概念**，本质是各 Domain 文件的"中央缓存副本"，不是独立 SSOT。
2. **索引功能**：CONTEXT-MAP §Contexts（9 Domain 表）已被 AssetMap `oxn-system.md` §Scenes 覆盖（按 scene 路由维度信息量更大）。
3. **入口角色**：CONTEXT-MAP 的"入口"角色被 `AGENTS.md` §意图解析流程 + §入口指针完整覆盖。

### D4：项目工程元层跨层引用规则

### D4：项目工程元层跨层引用规则

#### D4.1：README.md 引用规则

允许：
<!-- allow-version -->
- ✅ → `docs/product/zh-cn/introduction.md`（与 slogan 同步，AGENTS.md §v0.6.2 锁定双向同步）
<!-- /allow-version -->
- ✅ → `docs/glossary/zh-cn/*`（术语链）
- ✅ → `AGENTS.md`（同元层内部）
- ✅ → `LICENSE`（项目基础信息）

禁止：
- ❌ → `docs/rfc/zh-cn/*`（README 是营销 + 5min 上手，不引用 RFC；GitHub 渲染用户不需要看规范）
- ❌ → `.openxenon/assets/domains/*`（README 不直接挂 Domain）
- ❌ → `.openxenon/drafts/*`（README 不挂探索稿）

#### D4.2：AGENTS.md 引用规则

允许：
- ✅ → `.openxenon/assets/domains/*`（AI 需要读 Domain SSOT）
- ✅ → `.openxenon/assets/assetmaps/oxn-system.md`（AI 路由）
- ✅ → `docs/rfc/zh-cn/*`（AI 需要读 RFC 规定性内容）
- ✅ → `docs/{product,dev}/{zh-cn,en}/*`（AI 需要读产品手册与开发手册）
- ✅ → `dev/versions/*` `dev/pool/*`（AI 路由 Roadmap）
- ✅ → `README.md`（同元层内部）

禁止：
- ❌ → `.openxenon/drafts/rfc/*`（草稿不应被 AI 作为 SSOT 引用；通过 promote workflow 上 RFC 后再引）

#### D4.3：CONTEXT-MAP.md 引用规则 —— **2026-08-10 由 RFC-0028 §D1 撤销**

> CONTEXT-MAP.md 已整体删除，规则自然失效。Meta 层入口豁免改由 D4.2（AGENTS.md 例外）+ D6 表格（4 条规则）承担。

### D5：Meta 层与三情态组合检查 —— **2026-08-10 由 RFC-0028 §D5 修订**

| 组合 | 含义 | 状态 |
|---|---|---|
| Asset + Meta | 既是定义又是元入口 | ✅ 允许特例——`AGENTS.md` 引用 Asset（入口指针场景，RFC-0028 §D4） |
| RFC + Meta | 既是规定又是元入口 | ❌ 设计错误——RFC 不应依赖 README.md / AGENTS.md |
| Doc + Meta | 既是描述又是元入口 | ⚠️ **特例允许**——README.md 是 marketing + 入口混合，与 `docs/product/zh-cn/introduction.md` 双向同步 |
| Meta + Meta | 同元层内部互引 | ✅ 允许——README.md / AGENTS.md 互引（CONTEXT-MAP.md 已退役） |
| Asset + RFC + Doc + Meta | 全四情态组合 | ✅ **仅 README.md**——唯一合法的四情态载体 |

### D6：check-doc-boundary.ts 规则矩阵（2026-08-10 由 RFC-0028 §D3 简化 5 → 4）

| 规则名 | sourcePattern | targetPattern | 例外 |
|---|---|---|---|
| `rfc-no-meta` | `^docs/rfc/` | `^(README\.md\|AGENTS\.md\|\.changes/\|dev/)` | 无 |
| `docs-product-no-meta` | `^docs/product/` | `^(README\.md\|AGENTS\.md\|\.changes/\|dev/)` | `AGENTS.md` 作为入口指针例外（RFC-0028 §D4） |
| `docs-dev-no-meta` | `^docs/dev/` | `^(README\.md\|\.changes/\|dev/)` | `AGENTS.md` 作为入口指针例外（RFC-0028 §D4） |
| `assets-no-meta` | `^\.openxenon/assets/` | `^(README\.md\|AGENTS\.md\|\.changes/\|dev/)` | `AGENTS.md` 作为入口指针例外（RFC-0028 §D4） |
| ~~`context-map-asset-index-allowed`~~ | ~~`^CONTEXT-MAP\.md`~~ | ~~`^\.openxenon/assets/`~~ | **整规则删除**（RFC-0028 §D3：CONTEXT-MAP.md 已退役） |

### D7：实施步骤（7 步）

1. RFC-0018 落盘（本文件）
2. CONTEXT-MAP.md 重构（删除 line 115-283，加 D3.3 段）—— 2026-08-10 由 RFC-0028 撤销，CONTEXT-MAP.md 整体删除
<!-- allow-version -->
3. `oxn-project-domain.md` 升版 v0.2.0 → v0.3.0（增 3 term + 5 inv + 3 ban）
<!-- /allow-version -->
4. AGENTS.md §文档三层架构段升级（三层 → 四层）—— 2026-08-10 由 RFC-0028 §D4 升级为"AI Agent 唯一入口（v0.7+）"
5. `scripts/check-doc-boundary.ts` 扩 5 条规则 —— 2026-08-10 由 RFC-0028 §D3 简化为 4 条
6. 写 `.changes/0-6-2-alpha-2-meta-layer.md` + `.changes/0-7-0-context-map-deprecation.md`
7. 跑 6 条验证命令

## 影响范围

### 正面

- **5 类项目工程文档的 SSOT 归属明确**：README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/ 各自有 RFC 引用规则，不再是"情态组合的设计错误"
- **CONTEXT-MAP.md 降级为索引页**：从 283 行降到 ≤ 100 行；R&N 32 术语对照进入 RFC（规定性正确归位）
- **`check-doc-boundary.ts` 规则矩阵扩展**：5 条新规则明确 Meta 层边界；规则总数 9 → 14
<!-- allow-version -->
- **`oxn-project-domain.md` 升版**：v0.2.0 → v0.3.0（5 inv + 3 ban + 3 term；补全项目工程元层的 SSOT 定义）
<!-- /allow-version -->

### 负面 / 风险

- **AGENTS.md 升级可能影响 skill 编译产物**：skill instruction.md 通过 `oxn init -f` 从 SSOT 重新生成，AGENTS.md 是 skill 间接依赖
- **CONTEXT-MAP.md 历史信息损失**：line 211-283 的"术语新增记录"迁到 `.openxenon/drafts/rfc/context-map-history.md`（不追踪），如需回查需 git log
<!-- allow-version -->
- **README.md 双同步成本**：slogan / description 类改动需同时更新 README.md + `docs/product/zh-cn/introduction.md` + `docs/glossary/zh-cn/core-terms.md`（已在 v0.6.2-alpha.2 锁定的 13 文件清单内）
<!-- /allow-version -->

### 衍生

- RFC-0018 与 RFC-0009 互锁（RFC-0009 三情态 + RFC-0018 四层 = OXN 文档架构完整图）
- 后续如果 `OXN_DOC_LAYERS` 改成 5 层（如新增 "Insight 涌现层文档"），需要新 RFC supersede 本 RFC
- `oxn-init` Skill 的 SSOT 列表更新（含 README.md / AGENTS.md / .changes/ / dev/；CONTEXT-MAP.md 已退役，2026-08-10 RFC-0028 §D1）

## Alternatives Considered

- **维持三情态不动，把 README/AGENTS/CONTEXT-MAP 当特例豁免**：否决。特例豁免需要硬编码在 RFC-0009 与 check-doc-boundary.ts 里，分散维护成本高；新建 Meta 层把豁免规则集中到 RFC-0018，更易演进
- **Meta 层并入 Doc 层（README/AGENTS/CONTEXT-MAP 当作 docs/ 子集）**：否决。物理位置不同（仓库根 vs `docs/`），演进策略不同（与版本同步 vs 与产品迭代同步），硬塞 Doc 层会扭曲 RFC-0009
- **R&N 32 术语对照留在 CONTEXT-MAP.md**：否决。CONTEXT-MAP.md 是索引页不是规定性内容承载；R&N 对照是规定性（"OXN 在 R&N 理论中是什么"），应归 RFC
- **CONTEXT-MAP.md 保留作为 Meta 入口（否决 RFC-0028）**：2026-08-10 复审否决。CONTEXT-MAP 内容实质是 OpenXenon Domain 概念（PEAS / Referent / StructureV2 等），非独立 SSOT；AGENTS.md 已具备入口与路由完整流程；CONTEXT-MAP 删除可击穿跨层豁免 5 条规则简化为 4 条
- **meta-RFC 编号从 RFC-0014 起（跳过 RFC-0014~0017 已被占）**：否决。RFC-0018 是连续编号，与 RFC-0017 未来命名不冲突；编号不影响语义

## 附录 A：R&N 32 术语对照表

> 来源：CONTEXT-MAP.md line 115-150（2026-07-31 迁入）；原 ADR-0072 + ADR-0073 + ADR-0074 + ADR-0075 + ADR-0076 + ADR-0077 + ADR-0078 + ADR-0079 完整版

### A.1：R&N 32 术语映射（OXN 视角）

| # | R&N 术语 | OXN 对应物 | 关键偏离 | ADR |
|---|---|---|---|---|
| 1 | 智能体（agent） | AI Agent（非 OXN Engine） | OXN 是参照系非智能体；为 AI 三个非确定器官提供稳定锚点 | ADR-0072 |
| 2 | 理性（rationality） | 工程师决策（OXN 不介入） | OXN 不为最大化任何东西而选择动作 | ADR-0072 + ADR-0066 |
| 3 | 性能度量（performance measure） | 工程师主观定义（OXN 不聚合判定） | 缺失即设计——OXN 把 P 外包给工程师 | ADR-0066 / ADR-0067 |
| 4 | 环境（environment） | Asset（工程师定义的边界环境） | E 单轴映射，非 PEAS 单点 | ADR-0072 |
| 5 | PEAS | OXN 三方协作（E=Asset, A=分裂, S=分裂, P=缺失即设计） | PEAS 三处映射错，整体重写 | ADR-0072 D3 |
| 6 | 传感器（sensor） | AI 工具 I/O + Probe（双轨） | R&N 单一自有传感器 → OXN 分裂两套 | ADR-0072 |
| 7 | 执行器（actuator） | AI 工具调用 + OXN writer（双轨） | 对称分裂 | ADR-0072 |
| 8 | 环境类型（environment type） | partially observable / deterministic channel / semidynamic / episodic-with-memory / discrete / partially known | 6 轴刻画（ADR-0085） | ADR-0085 |
| 9 | 任务环境（task environment） | Work（IAP 三阶段编排空间） | OXN 把任务环境封装为可追踪结构 | ADR-0084 |
| 10 | 智能体函数（agent function） | 无对应——OXN 是被动响应的确定性程序 | OXN 无 `f: percept* → action` | ADR-0072 |
| 11 | 智能体程序（agent program） | OXN CLI（确定性处理器） | 主体中立、原子性锚在 CLI 边界 | ADR-0072 / ADR-0085 |
| 12 | 真空吸尘器世界（vacuum world） | 无对应 | 抽象层 | n/a |
| 13 | 搜索问题（search problem） | Work 内 Round 多轮（IAP 周期） | Round = 元搜索非对象搜索 | ADR-0075 |
| 14 | 问题形式化（problem formulation） | Work 三阶段 + 8 步流程 | 工程师形式化，OXN 编排 | ADR-0075 |
| 15 | 搜索算法（search algorithm） | Round 手动触发 + 有界监督 | OXN 不自主搜索状态空间 | ADR-0075 |
| 16 | 无信息搜索（uninformed search） | 无对应 | OXN 不主动遍历 | n/a |
| 17 | 有信息搜索（informed search） | Asset 提供的边界参照（slot DAG） | 静态模板源 vs 动态规划 | ADR-0084 |
| 18 | 启发式（heuristic） | 无对应——OXN 路径判据是"确定性满足"非"最优" | ADR-0073 判据 | ADR-0073 |
| 19 | 路径成本（path cost） | slot DAG（工程师定义的确定性路径边界） | 0 → 1 目标边界，非累加值 | ADR-0073 |
| 20 | 状态空间图（state-space graph） | Task DAG（状态探索图参照） | AI 编排 + 工程师沉淀 | ADR-0072 / ADR-0084 |
| 21 | 树搜索（tree search） | 无对应 | 抽象层 | n/a |
| 22 | 图搜索（graph search） | Round 内的迭代 | AI 黑箱搜索 + Task DAG 外化 | ADR-0075 |
| 23 | 约束满足问题（CSP） | Work 完成条件（结构性 goal-test） | 业务性 goal-test 归工程师 | ADR-0075 |
| 24 | 局部搜索（local search） | Round 内迭代改进 | 有界监督，不自主 | ADR-0075 |
| 25 | 联机搜索（online search） | 无对应 | OXN 不在线学习 | n/a |
| 26 | 对抗搜索（adversarial search） | OXN 通道内/通道外分裂 | OXN 是旁观者不是对手 | ADR-0072 |
| 27 | 命题逻辑（propositional logic） | Blueprint 声明（slot DAG） | 静态模板表达 | ADR-0084 |
| 28 | 一阶逻辑（first-order logic） | Asset `term / ban / invariant` 表达式 | 领域词汇约束 | ADR-0084 |
| 29 | 知识库（knowledge base） | Asset 5 类集合 + content_hash | 静态 + 强校验 | ADR-0071 |
| 30 | 推理（inference） | Kernel verdict（pure function） | 确定性纯函数判定 | ADR-0066 / ADR-0067 |
<!-- allow-version -->
| 31 | 学习（learning） | Insight（v0.7+ 涌现层） | 跨 Work 模式涌现，反哺工程师 | ADR-0074 |
<!-- /allow-version -->
| 32 | 神经网络（neural network） | AI Agent 自身（黑箱推理） | OXN 不介入 AI 内部 | ADR-0072 |

### A.2：映射偏离总览

- **OXN 拒绝"AI 自主选择动作"**：R&N 假定 agent 自带 `f: percept* → action` 选择函数；OXN 把动作选择权开放给调用方（AI 或工程师），OXN 被动响应
- **OXN 拒绝"环境完全可观察"**：R&N 假定 agent 自有自信任传感器；OXN 把可观察性分层（通道内全观察、通道外零观察），明确边界
- **OXN 拒绝"全局最优"**：R&N 的搜索算法追求最优路径；OXN 路径判据是"确定性满足"（是否在 Asset 边界内），非"最优"
- **OXN 引入"参照系"概念**：R&N 无此概念；OXN 把"为非确定性智能体器官提供确定性参照"命名为 Referent（ADR-0072）

### A.3：OXN 不涉及的 R&N 主题

- 机器学习算法（决策树、SVM、神经网络）—— OXN 是工具不实现 AI
- 概率推理（贝叶斯网络、HMM）—— OXN 是确定性的
- 自然语言处理—— OXN 不处理 AI 输出
- 计算机视觉—— OXN 不处理多媒体
- 强化学习—— OXN 不训练 AI

## 附录 B：项目工程元层 4 类文档快速对照（2026-08-10 RFC-0028 撤销 CONTEXT-MAP.md）

| 文档 | 一句话定义 | 给谁看 |
|---|---|---|
| README.md | OpenXenon 是什么 + 5 分钟上手 | GitHub 访客 + 新工程师 |
| AGENTS.md | AI Agent 进入项目怎么协作 + 硬性规则（v0.7+ 唯一 Meta 入口） | AI Agent（OpenCode/Codex/Claude Code） |
| .changes/0-X-Y-*.md | 版本 changelog（用户可见变更） | 升级用户 |
| dev/{versions,fix,pool}/ | 前瞻 Roadmap + 修复记录 + 规划池 | 核心开发者 |

> 历史：CONTEXT-MAP.md（2026-06 至 2026-08 服役）作为 8 Domain 索引 + 核心术语锐化入口已于 2026-08-10 由 RFC-0028 §D1 整体删除；其内容已分别回迁各 Domain 文件与本 RFC 附录 A。

## 参考

- [RFC-0009 文档三情态分离](./RFC-0009-doc-three-modalities.md) — 三情态基线（Asset/RFC/Doc）
- [RFC-0010 RFC frozen+errata 演进策略](./RFC-0010-frozen-errata.md) — RFC 演进
- [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.md) — `@oxn/` + `@prj/`
- [RFC-0012 自举种子豁免](./RFC-0012-bootstrap-exemption.md) — `src/builtin/`
- [RFC-0013 版本号政策](./RFC-0013-versioning-policy.md) — Version Fragment / Roadmap / Fix Record / PlanningPool
- [RFC-0014 Asset 注入机制](./RFC-0014-asset-injection-mechanism.md) — Asset 解析
<!-- allow-version -->
- [.openxenon/assets/domains/oxn-project-domain.md](../../.openxenon/assets/domains/oxn-project-domain.md) — 项目工程元层 Domain SSOT（v0.3.0）
<!-- /allow-version -->
- [RFC-0028 CONTEXT-MAP.md 退役](./RFC-0028-context-map-deprecation.md) — 2026-08-10 撤销本 RFC §D3（CONTEXT-MAP.md 重构决策反转）+ §D5 新增（Meta 层由 5 类文档降为 4 类）
- [AGENTS.md](../../AGENTS.md) — AI Agent 入口
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — R&N 智能体理论原义来源
