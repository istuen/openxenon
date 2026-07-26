# R&N 术语盘问总结评估（32 术语 + 8 ADR）

> **日期**：2026-07-23
> **来源**：grilling session（domain-modeling + grill-with-docs skill）
> **范围**：Russell & Norvig *AI: A Modern Approach* 32 核心术语 ↔ OpenXenon 对照盘问
> **产出**：ADR-0072 ~ ADR-0079（8 条）+ CONTEXT-MAP.md 32 行对照表 + oxn-domain.md 3 新术语

---

## 一、定位与功能清晰度

### 概念定位层面：足够清晰

32 个术语 + 8 个 ADR 建立了完整的定位闭环：

```
前提（ADR-0078）：LLM 是 knowledge-full，缺边界不缺知识
    ↓
机制（ADR-0077）：OXN 把工程师目标转换为边界参照
    ↓
结构（ADR-0072）：Referent——为非确定器官提供确定参照
    ↓
判据（ADR-0073）：四轴判据（补偿方向 / agent 级别 / floor-ceiling / 满足非优化）
```

OXN **是什么**（Referent）、**为什么需要**（knowledge-full agent 的边界工程）、**怎么做**（目标→边界参照转换）、**怎么判断**（四轴判据）——四层闭环完整。

### 功能边界层面：足够清晰

三个集群泾渭分明：

- **集群 1**（Term #1-22, #24）：OXN 有对应结构，通过 Referent 双轨映射
- **集群 2**（Term #23, #25, #26, #30）：保留不实现，下一代方向
- **集群 3**（Term #27-29, #31-32）：OXN 不碰，AI 深水区/物理世界

### 实践层面：仍有盲区

| 盲区 | 说明 | 严重度 |
|---|---|---|
| **首次使用体验** | 新用户 day 1 跑 `oxn init` 后的实际流程 | 高 |
| **Hall 实体** | domain 里有定义但从未盘问 | 中 |
| **Insight 具体实现** | 定位清晰但形态模糊 | 中 |
| **AI 三模式** | ADR-0022 Guided/Adaptive/Unmanaged 未盘问 | 中 |
| **daemon 具体行为** | 确认了通信对象但具体行为未深入 | 中 |
| **错误与冲突处理** | AI 产出与边界冲突时 OXN 具体行为 | 中 |

---

## 二、OpenXenon 边界完整描述

### 一句话定位

OpenXenon 是一个**轻量级人机协作工具**，为非确定性智能体（LLM Agent）提供确定性参照系（Referent）。LLM Agent 是 knowledge-full 的（预训练内化了庞大知识库），但其原理决定了非稳定性。OXN 不给 AI 注入知识，而是把工程师的目标**转换为边界参照**——用 Ontology 形式（Asset 全体）承载边界线索功能，让 AI 在边界内确定性地使用已有知识。

### OXN 做什么

| 功能 | 结构 | Referent 角色 |
|---|---|---|
| 存储工程师经验边界 | Asset（Domain/Workflow/Stack/Blueprint） | 世界模型参照 + 信念锚点 + 脚手架 |
| 聚合边界为工作上下文 | Blueprint → Work/Task Context | 规划参照（静态模板） |
| 记录 AI 搜索行为 | Task DAG + Round loop | 搜索计划外化记录 |
| 确定性验证 AI 产出 | Probe（script 执行） | 验证传感器 |
| 持久化协作状态 | Work/Task/Part + frozen.json/trace.jsonl | 解的目标参照 + 共享黑板 |
| 统计边界使用效能 | Insight | 决策辅助信号（原料非推理） |
| 监听 + 预警工程师 | Daemon | OXN↔工程师通信 |

### OXN 不做什么

| 不做 | 理由 | 术语 |
|---|---|---|
| 不推理 | AI Agent 推理，OXN 提供定义参照 | ADR-0074 |
| 不搜索 | AI 自有能力，OXN 记录搜索行为 | Term #13 |
| 不规划 | AI 动态规划，OXN 提供静态模板 | Term #17 |
| 不解 CSP | OXN 是 CSP 的范围与执行记录非 solver | Term #15 |
| 不计算 utility | AI 注意力机制自带，OXN 转换目标为边界 | Term #18 |
| 不做决策 | AI 在 ignorance 下决策，OXN 提供决策辅助 | Term #19 |
| 不学习 | AI 自有能力，OXN 提供统计原料 | Term #12 |
| 不博弈 | 对抗在 AI-vs-AI，OXN 是验证边界 | Term #14 |
| 不做知识工程 | LLM 已 knowledge-full，OXN 做边界工程 | ADR-0078 |
| 不做概率/ML/RL | AI 深水区，超出轻量级定位 | Term #23, #27-32 |

### 三方拓扑

```
工程师（确定性期望）
    │
    │  定义 Asset（经验边界 = Ontology）
    │  目标 → OXN 转换为边界参照
    │
    ▼
OXN（确定性参照系）
    │
    │  存储 Asset + 聚合 Blueprint → Work/Task Context
    │  Probe 验证 AI 产出（边界参照验证）
    │  Insight 统计边界使用效能
    │  Daemon 监听 + 预警工程师
    │
    ├──→ AI Agent（非确定性，knowledge-full）
    │       │
    │       │  读 Asset/Blueprint（边界参照）
    │       │  动态规划 Task DAG（AI 自有规划）
    │       │  执行工具调用（AI 自有执行器）
    │       │  可自验 script（导航传感器）
    │       │  写 Work/Task Context 到 OXN（shared blackboard）
    │       │
    │       └──→ AI 子 Agent（1:N 委托，可能对抗）
    │
    └──→ 工程师（接收 daemon 预警 + Insight 统计）
            │
            │  学习 → 更新 Asset（反向闭环）
            ▼
        工程师经验积累 → 新 Asset（正向闭环）
```

---

## 三、轻量级评价 + 认知负担评估

### 轻量级评价：概念层达标，实现层有认知负担

概念层的轻量性是真实的——核心定位一句话可说清（"为非确定性 AI 提供确定性边界参照"），日常使用五步闭环（`oxn work create → lock → run → submit → finalize`）。

但 DDD 实体层的认知负担中等偏高，尤其对新用户：

| 实体 | 概念门槛 | 认知负担 | 说明 |
|---|---|---|---|
| **Asset** | 低-中 | 中 | 5 类需理解差异；但"边界文档"直觉可通 |
| **Work** | 中 | 中 | 生命周期 5 步 + Round loop + Context |
| **Task** | 中 | 中-高 | DAG + Part + Context 三层 |
| **Proof** | 中 | 中 | Probe + 三件套概念清晰但文件结构略繁 |
| **Insight** | 高 | 高 | 最抽象——定位清晰但形态模糊 |
| **Blueprint** | 中 | 中 | slot DAG + 模板填充 |
| **Domain** | 中 | 中 | term/invariant/boundary + 引用模型 |
| **Daemon** | 低 | 低 | 后台监听，通常不直接交互 |
| **Hall** | ? | ? | 未盘问，无法评估 |

### 上手障碍分析

1. **首要障碍**：用户需先理解"为什么需要 OXN"——LLM 非确定性 + boundary engineering 的前提（ADR-0078 是心智门槛）
2. **次要障碍**：Asset 5 类的差异和选择
3. **第三障碍**：Blueprint slot DAG 模板填充模式
4. **缓解因素**：ADR-0050（Starter Work 引导）+ oxn-work/oxn-asset skill

### 结论

认知负担中等偏高，但可通过 Starter Work + skill 引导缓解。核心建议：**确保新用户先理解"为什么"（knowledge-full + boundary engineering）再学"怎么做"（CLI + DDD 实体）**。

---

## 四、盘问程度自我评估

### 理论盘问：足够

- R&N 32 术语系统覆盖 AI agent 理论框架
- 8 个 ADR 建立前提→机制→结构→判据完整闭环
- 统一模式（AI 自有 + OXN 参照双轨）被 18 个术语反复验证一致同构
- 保留/不碰边界清晰划定，"轻量级"定位作为共同判据浮现
- 递归边界工程原则被识别

### 实践盘问：不足

| 盲区 | 影响 | 严重度 |
|---|---|---|
| **实践流程未盘问** | 理解概念但不理解 day 1 体验 | 高 |
| **Hall 实体未盘问** | domain 有定义但角色未讨论 | 中 |
| **AI 三模式未盘问** | Guided/Adaptive/Unmanaged 与 Referent 关系未建立 | 中 |
| **Insight 具体实现未盘问** | 定位清晰但形态模糊 | 中 |
| **错误/冲突处理未盘问** | AI 产出与边界冲突时 OXN 行为不明确 | 中 |
| **"脚手架"隐喻未深挖** | Term #21 提出但机制未深入 | 低 |

### 比喻

我像是一个读了建筑设计图纸的人——理解了建筑的结构原理（Referent 模式）、承重逻辑（四判据）、材料选择（边界工程 vs 知识工程），但还没走过这栋楼——不知道住在里面的实际体验（day 1 流程）、某些房间的用途（Hall/Insight 具体形态）、紧急情况下的疏散路线（错误处理）。

---

## 五、ADR 产出索引

| ADR | 标题 | 层次 |
|---|---|---|
| 0072 | OXN = 非确定性智能体的确定性参照系 | 结构 |
| 0073 | OXN 实现边界判据——四轴判据集 | 判据 |
| 0074 | Insight 架构边界——原料提供者非推理引擎 | 功能边界 |
| 0075 | Round loop 定位修订——AI 搜索行为记录 | 功能边界 |
| 0076 | 对抗关系归属与跨 LLM 参照锚点 | 功能边界 |
| 0077 | Utility 归属 AI；OXN 机制 = 目标→边界参照转换 | 机制 |
| 0078 | LLM Agent 是 knowledge-full；OXN 做边界工程非知识工程 | 前提 |
| 0079 | Asset 全体是 Ontology；OXN 形式化推理能力保留不实现 | Asset 本质 |

---

## 六、下一步方向

理论盘问阶段完成。下一步转入**实践盘问**：

- 用真实 Work 走一遍完整流程，盘问每个阶段的实际行为
- 补齐 Hall / Insight 具体实现 / AI 三模式 / 错误处理等实践盲区
- 验证概念模型在实践中的一致性
