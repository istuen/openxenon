---
title: 核心术语
---
synced-at: 2026-07-23
source: oxn-domain.md
---

# 核心术语

> 适用：OpenXenon 是什么、IAP 三阶段、E1-E4 实体。

## 主体概念

### OpenXenon
- 工程师与 AI Agent 协作工具，为协作提供边界与证据；以 Skills 形式注入 AI Agent 工作台。

### OXN
- OpenXenon 的缩写。

### OXN CLI
- OpenXenon 的命令行入口。薄组合调用层：解析参数 → 调 Engine → 格式化输出。

### OXN Engine
- OpenXenon 的核心引擎。记录协作事实（不评判合格）；L0-L3 分层实现。

### OXL
- OpenXenon Language。OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。

### Daemon
- OXN Engine 后台守护进程。运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work，不修改 Kernel 规则（ADR-0068）。

## 范式与阶段

### IAP
- Intent / Align / Proof 三阶段核心范式。工程师定义意图，AI Agent 对齐执行，OXN 验证记录。

### Intent
- 人机协作的软件目标。工程师在 Intent 阶段定义业务词典与技术蓝图，产出 Domain / Blueprint / Stack。

### Align
- 人机协作的工作过程。AI Agent 在边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react）。

### Proof
- OXN 验证 AI Agent 执行结果（ProbeOutcome 三态）并记录的协作过程证明。包含三件套（frozen.json + trace.jsonl + state.json）；OXN 只记录事实不评判合格（ADR-0067）。

## 实体与边界

### Asset
- 工程师为 AI Agent 协作定义的环境约束。5 类 AssetKind（Domain / Workflow / Stack / Blueprint / Roadmap）。

### Boundary
- Asset 的别名。

### Work
- 人机协作的工作空间，衔接 Asset 与 Proof。3 IAP 阶段顺序不可跳（create → lock → run → submit × N → finalize）；AI Agent 在 Asset 边界内自主工作。

### Insight
- 洞察 IAP 并提供涌现的可能性。E4 涌现层，整体论，跨 Work 综合推理。

### Hall
- 研讨厅，人机协作范围内的中央枢纽。

### Referent
- 参照系。OXN 的统一设计模式：为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。参照版本与 agent 自有版本性质相反——参照必须稳定，不被被参照者改。六个锚点：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。ADR-0072。

### Floor
- 下限参照。OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### Ceiling
- 上限机制。AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

## 简明对照

| 范式 | 角色 | 关键产物 |
|---|---|---|
| Intent | 工程师 | Domain / Blueprint / Stack |
| Align | AI Agent | Work / Task / Part / 落盘产物 |
| Proof | OXN Engine | frozen.json + outcome 聚合结构（各状态 Probe 数量）|
