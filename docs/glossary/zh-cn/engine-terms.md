---
title: 引擎术语
---
synced-at: 2026-07-22
source: oxn-engine-domain.md
---

# 引擎术语

> 适用：L0-L3 分层、Kernel/Infra/OXL/Daemon、错误契约、四层确定性。
> 注：历史版本中的"TrustChain / AuditChain / Notary"等裁判视角术语已被 ADR-0066 废弃（统一到 Proof 或 OXN Engine desc）；"MinimumTrustClosure" 改为 "MinimumClosure"。

## 核心模块

### OXN Engine
- OpenXenon 核心引擎。记录事实不评判合格（ADR-0031）；L0-L3 分层 + E1-E4 四结构实体实现。

### Kernel
- L0 纯逻辑验证模块：验证 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE），不调 fs / net / child_process。**纯逻辑内核**。

### Infra
- L1 副作用 / IO 执行模块。只回答事实不做判定，负责 OpenXenon 跟外部宿主环境的出入口，包括文件、网络等具有副作用的交互；不能 PASS/FAIL 盖章。

### Daemon
- OXN Engine 后台守护进程。运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work（ADR-0068）。

### OXL
- Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。详细定义见 [core-terms](./core-terms#oxl)。

### BuiltinAsset
- Engine 编译时内置资产（@oxn scope）。与项目资产（@prj scope）严格隔离。

## 错误契约

### IAPError
- 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### OXNCrash
- OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### CliInputError
- 用户 CLI 输入错的契约类。轨道 3。

## OXN Engine 哲学

### LambdaVacuum
- L0 Kernel 零 IO 约束的正式术语；禁 fs/net/child_process/process.env/process.std*/EventEmitter。

### MinimumClosure
- v0.6.1 scope = 四层确定性就位（D1 边界 + D2 验证 + D3 证据 + D4 记录）；术语精简（原 MinimumTrustClosure 改名，ADR-0066）；ADR-0058 决策内容保留。

### FourLayerDeterminism
- D1 确定性边界 + D2 确定性验证 + D3 确定性证据 + D4 确定性记录；ADR-0058。

### InformationHiding
- 对抗性设计："AI 只看该做什么，不看该满足什么"。Part 内 Probe 验证标准不可见，frozen.json/state.json 不可写。

## 端口与运行环境

### Port
- L1 Infra 注入端口抽象家族。让 L0 Kernel 跨 runtime 可移植；子类 PathPort/ResourcePort/CachePort。

### PathPort
- L1 注入式路径操作接口；L0 不硬编码路径；NodePathPort 为 Node 实现；ADR-0010。

### ContextMap
- Domain 业务实体与 L0-L3 代码分层的显式连接，不可互相包含。

## 简明对照

| 层级 | 模块 | 职责 |
|---|---|---|
| L3 | CLI + Skills + Daemon | 工具与应用层 |
| L2 | Asset / Intent / Align / Proof / Insight / Pool | 引擎核心业务 |
| L1 | OXL + Infra | 操作基座与语言 |
| L0 | Kernel | 纯逻辑内核，零 IO |
