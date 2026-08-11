---
entity: rfc
id: RFC-0014
theme: asset-injection-mechanism
status: Accepted
date: 2026-07-27
supersedes: []
superseded-by: ~
related:
  - ADR-0072: docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - ADR-0073: docs/adrs/0073-oxn-implementation-boundary-criteria.md
  - ADR-0078: docs/adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md
  - ADR-0079: docs/adrs/0079-asset-is-ontology-formal-reasoning-deferred.md
synced-at: 2026-07-27
landing-reason: declarative
---

# RFC-0014: Asset 注入机制——结构化抽取锚定非确定性

> **类型**：RFC（OpenXenon 规范）
> **主题**：asset-injection-mechanism
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-27 grilling session（domain-modeling + grill-with-docs skill）
> **批次**：Asset vs RAG 边界盘问收敛

## 摘要

[Asset](/product/zh-cn/concepts/glossary.html#asset) 的上下文注入机制是**结构化抽取**——从项目抽取确定性的术语 / 工作流 / 技术栈 / 编排模板，通过显式链接（`@prj/` / `@oxn/`）绑定注入。确定性结构层叠在 LLM 非确定性层上，方向是**锚定**（提高 [Floor](/product/zh-cn/concepts/glossary.html#floor)，ADR-0073 判据 3），而非放大。本 RFC 桥接 [ADR-0078](../../adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md)（前提：LLM knowledge-full，缺边界而非缺知识）与 [ADR-0073 判据 1](../../adrs/0073-oxn-implementation-boundary-criteria.md)（补偿方向：补偿 agent 非确定性，不补偿环境性质），补上"为什么不走向量化检索路线"的显式论证。

RAG / MCP / Skill 与 Asset 同属"往 LLM 上下文注入信息"的机制家族。RAG 通过向量化检索注入外部知识，其检索层本身是非确定的（同一 query 不同时刻可能检索到不同 chunk），非确定层叠在非确定层（LLM）上方向是**放大**。**RAG 是参照非对标**——Asset 的定义不依赖于 RAG 存在与否；Asset 不跟 RAG 比谁检索得准，两者在注入机制家族中各司其职、可并存。

## 决策要点

### D1：Asset 注入机制 = 结构化抽取 + 显式引用绑定

[Asset](/product/zh-cn/concepts/glossary.html#asset) 是工程师维护的确定性参照锚点（[Referent](/product/zh-cn/concepts/glossary.html#referent)，ADR-0072）。其注入机制由两层构成：

| 层 | 机制 | 物理形态 |
|---|---|---|
| **结构化抽取** | 从项目抽取确定性结构 | [Domain](/product/zh-cn/concepts/glossary.html#domain)（术语/禁词/不变量）+ [Workflow](/product/zh-cn/concepts/glossary.html#workflow)（slot DAG）+ [Stack](/product/zh-cn/concepts/glossary.html#stack)（工具/版本/配置）+ [Blueprint](/product/zh-cn/concepts/glossary.html#blueprint)（编排模板组合） |
| **显式引用绑定** | 通过链接绑定注入 | `@prj/` override > `@gbl/` > `@oxn/` fallback（[ArsenalResolver](/product/zh-cn/concepts/glossary.html#arsenalresolver) 优先级链，确定性覆盖） |

**关键性质**：

1. **不对外部知识做向量化**——Asset 抽取的是项目自身的确定性结构（术语 / 工作流 / 技术栈），不是外部知识的向量表示。
2. **绑定是显式的**——工程师或 AI 在 Work 的 Intent 阶段把 `ref @prj/blueprints/...` 写进 work.md，[PlanLock](/product/zh-cn/concepts/glossary.html#planlock) 锁死后内容 hash 不可漂移。绑定发生在设计时，不在运行时按相似度重选。
3. **优先级链是覆盖不是排序**——`@prj/` 高于 `@oxn/` 是确定性的 override 语义，不是 RAG 的 relevance ranking。

**对比 RAG（参照）**：RAG 检索的是内容 chunk，直接注入上下文供 LLM 消费；Asset 注入的是结构化定义，由 LLM 读取后**自行推理**如何应用（推理归属 AI，ADR-0074 / ADR-0079 D3）。Asset 即使有 `oxn roadmap suggest` 这样的发现工具，检索的也是**指针**（Asset 名字）而非内容 chunk——发现后仍需显式 `ref` 绑定才算消费。

### D2：锚定 vs 放大——方向性差异

LLM 是非确定性的（同输入可能不同输出，ADR-0078 D1）。任何上下文注入机制都在 LLM 之上叠一层——差异在**这层的方向**：

| 注入机制 | 叠加层性质 | 方向 | 对应 ADR-0073 判据 |
|---|---|---|---|
| **Asset** | 确定性结构（hash 锁定、显式引用） | **锚定**——提高 [Floor](/product/zh-cn/concepts/glossary.html#floor) | 判据 1 ✅ 补偿 agent 非确定性 / 判据 3 ✅ 提 floor |
| **RAG（向量化检索）** | 非确定层（检索结果随 embedding 模型/索引版本/温度变化） | **放大**——非确定性相乘 | 判据 1 ❌ 引入环境性质层面的非确定性源 |

**桥接论证**：

```
ADR-0078（前提）：LLM 是 knowledge-full，缺的是边界不是知识
    │
    │  本 RFC 补的桥
    ▼
ADR-0073 判据 1（补偿方向）：补偿 agent 非确定性，不补偿环境性质
    │
    │  向量化检索引入的非确定性 = 环境性质层面的非确定性源
    │  → 按判据 1，OXN 不引入向量化检索作为 Asset 的注入机制
    ▼
结论：Asset 走结构化抽取路线，不走向量化检索路线
```

ADR-0078 说"为什么需要边界参照而非知识注入"；ADR-0073 判据 1 说"补偿什么不补偿什么"。两者之间此前**没有显式连接**——本 RFC 把"向量化检索属于环境性质层面的非确定性源"这一步补上，使"Asset 不走向量化检索"成为判据 1 的直接推论，而非孤立断言。

**说明性比喻**（建筑地基场景）：

> 场景：执行"打地基"任务。
>
> **RAG 路径**——把执行细节（"先挖土，把土运走，挖到 10 米深再搭建"）向量化后按 query 检索。检索层本身是非确定的：同一 query 在不同 embedding 版本/索引状态下可能返回残缺 chunk（如"把土运走，再搭建"）。这层非确定性叠在 LLM 非确定性上，方向是放大。
>
> **Asset 路径**——抽取确定性结构：
> - [Domain](/product/zh-cn/concepts/glossary.html#domain)：术语 {土, 运输, 深度, 搭建} + 不变量 {深度 &ge; 10m 才能搭建}
> - [Workflow](/product/zh-cn/concepts/glossary.html#workflow)：slot DAG [挖土 → 运输土 → 测量深度 → 搭建]
> - [Stack](/product/zh-cn/concepts/glossary.html#stack)：工具 {挖土机, 运输机, 水泥车}
> - [Blueprint](/product/zh-cn/concepts/glossary.html#blueprint)：组合上述三边界为"地基"编排模板
>
> 这份结构通过 `ref @prj/blueprints/foundation` 显式绑定注入。LLM 读到的是**完整确定的结构**，自行推理执行细节。LLM 在细节回答上可能有差异，但整体方向被结构锚定。

**关键澄清**：RAG 的精度丢失**不是必然的**——调得好的 RAG（chunk 切得对、top-k 足够、有 reranker）也能检索到完整信息。真正的对立不是"RAG 丢精度 vs Asset 不丢精度"，而是"**RAG 的检索层本身是非确定的（即使今天检全了，明天同一 query 不保证检全）vs Asset 的注入层是确定的（hash 锁定，设计时绑定，运行时不变）**"。方向性差异是定义性的，精度差异是程度性的。

### D3：上下文注入机制家族——Asset 的定位

RAG / MCP / Skill / Asset 同属"往 LLM 上下文注入信息"的机制家族——表现上都是往上下文塞东西。Asset 在家族中的定位由四个维度共同界定：

| 维度 | Asset | RAG | MCP | Skill |
|---|---|---|---|---|
| **注入内容** | 确定性结构（术语/工作流/技术栈/编排） | 检索的内容 chunk | 工具调用结果 | 工作流指令 |
| **绑定机制** | 显式引用 `@prj/` + [PlanLock](/product/zh-cn/concepts/glossary.html#planlock) hash | 运行时相似度检索 | 运行时工具调用 | 运行时指令加载 |
| **对非确定性的影响** | 锚定（确定层叠非确定层） | 放大（非确定层叠非确定层） | 中性（工具 I/O 是 AI 自有器官，ADR-0072） | 中性（指令是 AI 自有执行参考） |
| **信息隐藏** | [Probe 验证标准对 AI 不可见](/product/zh-cn/concepts/glossary.html#informationhiding)（对抗性设计） | 全部检索内容对 AI 可见 | 工具结果对 AI 可见 | 指令对 AI 可见 |

**Asset 的定义性维度是第三列（对非确定性的影响 = 锚定）**——前两列是机制差异，第四列是附加特性。锚定方向是 Asset 在家族中不可替代的定位：其他机制不提供这层确定性锚定（RAG 放大，MCP/Skill 中性）。

**RAG 是参照非对标**：

- Asset 的定义不依赖于"有没有 RAG"——即使 RAG 不存在，Asset 仍然是"结构化抽取 + 显式引用绑定 + 锚定非确定性"。
- Asset 不跟 RAG 比谁检索得准——两者解决的问题不同。Asset 管边界（让 AI 在边界内确定性地使用已有知识），RAG 管 fact（让 AI 获得它不知道的事实）。
- **各机制并非互斥**——Asset 可与 RAG/MCP/Skill 并存：Asset 管边界，RAG 管 fact，MCP 管工具，Skill 管工作流。一个 AI Agent 可以同时引用 Asset 边界 + 调用 MCP 工具 + 加载 Skill 指令 + 检索 RAG 知识库。

### D4：Roadmap suggest 的检索边界

[`oxn roadmap suggest`](/product/zh-cn/concepts/glossary.html#roadmap) 是设计时**发现工具**，非运行时检索机制。其边界由检索目标界定：

| 检索目标 | 性质 | 是否改变 Asset 本质 |
|---|---|---|
| 检索**指针**（Asset 名字 + description） | 导航辅助——发现后仍需显式 `ref` 绑定才消费 | ❌ 不改变 |
| 检索**内容 chunk**（Asset 正文片段直接注入上下文） | RAG 范式——运行时消费检索内容 | ✅ 改变（Asset 退化为 RAG 语料） |

<!-- allow-version -->
`packages/engine/src/Roadmap/suggest.ts` 当前用 Jaccard 词法重叠（line 36-69），line 11 注释 `Future (v0.8): upgrade to BM25 or LLM-embedding`。**本 RFC 划定边界**：v0.8 升级检索算法本身不受限——BM25 或 embedding 都可以用，**只要检索目标保持"指针"而非"内容 chunk"**。一旦检索目标滑向内容 chunk 直接注入上下文，Asset 就退化为 RAG 语料，违反 D2 的方向性判据。
<!-- /allow-version -->

**判据**：检索结果是"让工程师/AI 知道有这个 Asset 存在并去显式引用"，还是"直接把内容塞进上下文让 LLM 消费"——前者是导航，后者是 RAG。

## 影响范围

- ✅ 锐化 Asset 注入机制的正向定义（结构化抽取 + 显式引用绑定 + 锚定非确定性）
- ✅ 桥接 [ADR-0078](../../adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md)（前提）与 [ADR-0073 判据 1](../../adrs/0073-oxn-implementation-boundary-criteria.md)（补偿方向），补上"为什么不走向量化检索路线"的显式论证
<!-- allow-version -->
- ✅ 为 `Roadmap/suggest.ts` v0.8 升级（BM25/embedding）划定边界：可升级检索算法，检索目标必须保持"指针"而非"内容 chunk"
<!-- /allow-version -->
- ✅ 明确 Asset 在上下文注入机制家族（RAG/MCP/Skill/Asset）中的定位
- 📝 不改变现有 Asset 实现——纯概念性 RFC，无代码变更
- 📝 不否决 RAG——RAG 作为 fact 注入机制可与 Asset 并存；本 RFC 只界定 Asset 不走 RAG 路线

## 相关术语

- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界
- [Domain](/product/zh-cn/concepts/glossary.html#domain) / [Workflow](/product/zh-cn/concepts/glossary.html#workflow) / [Stack](/product/zh-cn/concepts/glossary.html#stack) / [Blueprint](/product/zh-cn/concepts/glossary.html#blueprint) / [Roadmap](/product/zh-cn/concepts/glossary.html#roadmap) — 5 类 AssetKind
- [ArsenalResolver](/product/zh-cn/concepts/glossary.html#arsenalresolver) — 优先级链（@prj/ > @gbl/ > @oxn/）
- [PlanLock](/product/zh-cn/concepts/glossary.html#planlock) — 内容 hash 锁
- [Referent](/product/zh-cn/concepts/glossary.html#referent) — 确定性参照系
- [Boundary](/product/zh-cn/concepts/glossary.html#boundary) / [Floor](/product/zh-cn/concepts/glossary.html#floor) / [Ceiling](/product/zh-cn/concepts/glossary.html#ceiling) — 锚定语义
- [InformationHiding](/product/zh-cn/concepts/glossary.html#informationhiding) — Probe 验证标准对 AI 不可见

## 相关决策

- [ADR-0072 OXN 参照系定位](../../adrs/0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名
- [ADR-0073 OXN 实现边界判据](../../adrs/0073-oxn-implementation-boundary-criteria.md) — 判据 1（补偿方向）+ 判据 3（floor/ceiling）
- [ADR-0078 LLM agent knowledge-full](../../adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md) — 前提（本 RFC 桥接至 ADR-0073 判据 1）
- [ADR-0079 Asset 是 Ontology](../../adrs/0079-asset-is-ontology-formal-reasoning-deferred.md) — 结构是 Ontology，功能是边界

## Errata

<!-- allow-version -->
### v1.0.1 (2026-08-08) — Asset 结构 v2 收编
<!-- /allow-version -->

- **Blueprint Use 段格式 v2**：Blueprint 的 `## Use` 段从单段列表形式（v1）扩展为按 Asset Type 分组的多段形式：
  - v1 形式：`## Use` + `### name` + `- kind / - ref`（单 H2 段）
  - v2 形式：`## Use workflow` + `## Use domain` + `## Use stack` + `## Use blueprint` + `## Use roadmap`（每段独立 H2）
  - 兼容：两种形式 Engine 均能解析（`packages/engine/src/Work/per-work-blueprints-merger.ts`）
- **影响范围**：Blueprint 文本格式变化不影响 Asset 注入机制本身；Engine 通过 Use 段声明的 ref 注入语义保持不变。
- **参考**：详细结构规范见 `.openxenon/drafts/design-asset-structure-unification.md` §5 Phase 1+2；Schema 文档为 `docs/dev/zh-cn/asset-structure-v2.md`（RFC 不直接引用 dev 手册，参见设计稿）。

> 本段用于后续追加修正说明。核心决策自 RFC-0014 Accepted 起冻结。
