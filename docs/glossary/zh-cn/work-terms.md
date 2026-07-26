---
title: 工作术语
synced-at: 2026-07-23
source: oxn-work-domain.md
---

# 工作术语

> 适用：Work / Task / Slot / Part / Probe / Round / IAP 三阶段机制。
> 注：历史版本中的"EvidenceChainTriple"已被 ADR-0066 废弃（统一到 Proof 的三件套技术规范）。

## 工作空间

### Work
- Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize；AI Agent 在 Asset 边界内自主工作。

### WorkV1
- Work v1.1 沙盒布局（`works/<id>/{work.md, tasks/, .work/, .run/}`），自 v0.6.1-alpha.3 起强制；V0 须先 `oxn work migrate`。

### IAPPhase
- Work 三阶段实体（Intent 工程师主权 / Align AI 主权 / Proof Engine 主权），v0.6.1 Phase D 收敛。主导权不可越权（inv-1）。

### Phase
- 单个 IAP 阶段（Intent/Align/Proof 之一），按顺序不可跳。子步骤按阶段分别定义。

## 执行单元

### Task
- Align 执行单元。对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### Slot
- Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### Part
- Task 内 skill 执行单元（skill_context + acceptance），内联在 task 中不可独立成文件。

### Probe
- 物理观测单元（prop 输入 + output 判定），内联在 Part 内；标准必须来自 Blueprint observe 数组。

### RefPool
- Work 级声明的 ref 池（domain/blueprint/part/probe），Task 只能从 RefPool inject，不允许直接 import 资产。

### SkillContext
- AI 可见的三层上下文（work.context / task.context / part.skill_context）。

### Round
- Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round --outcome DEVIATED`），maxIterations 硬限制（默认 3）。

### Artifact
- Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

## 门禁与快照

### BirthCert
- Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。

### PlanLock
- BirthCert 内不可变快照（3 组件 hash + allHash），锁后任何 .md 资产漂移 → LOCK_HASH_MISMATCH。

### AssetHash
- 域/蓝图文件的 SHA-256（64-hex），OXN 启动期计算并存入 BirthCert.assets。

### CriticalHandoff
- IAP 阶段间关键衔接点。2 个守卫：Intent→Align（planLock 存在）+ Align→Proof（task 状态确定）；Engine 守卫不可移除。

## 证据与轨迹

### Frozen
- Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）；包含 outcome 聚合结构（ADR-0067）；三件套之一（详见 Proof）。

### Loop
- Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006。

### Trace-before-State
- 写 state.json 前必须先 append trace.jsonl 的写入顺序约束；原子性是 Trace-before-State 的物理基础；ADR-0009。

### context.md
- Work 内短期记忆文件（`works/<id>/context.md`）；取代 v0.7.x Memory L1；Intent + Roadmap + LoopHistory + KeyObservations 结构；ADR-0049。
