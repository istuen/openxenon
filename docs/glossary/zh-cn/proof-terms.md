---
title: 证明术语
synced-at: 2026-07-22
source: oxn-proof-domain.md
---

# 证明术语

> 适用：Proof / Probe / ProbeOutcome / outcome / Report / Boundary Deviation / 证据链。
> 注：历史版本中的"Verdict / ProbeVerdict / Taint / EvidenceChainTriple / 判决书 / PASSED-FAILED"等裁判视角术语已被 ADR-0066/0067 废弃；统一到 Proof 三层（ProbeOutcome + outcome + Report）。

## 核心轴

### Proof
- OXN 验证 AI Agent 执行结果（ProbeOutcome 三态）并记录的协作**过程**证明（不是结果证明）；执行主体 OXN Engine（记录事实不评判，ADR-0031）；物理观测 L1-Infra + 客观结果 L0-Kernel；包含三件套（frozen.json + trace.jsonl + state.json）；ADR-0066 + ADR-0067。

### Probe
- OXN 内置探针（物理观测 + 客观结果），由 L1-Infra Provider 执行 + L0-Kernel 产出 ProbeOutcome。

### ProbeOutcome
- L0 Kernel 产出的单个 Probe 客观结果（COMPLETED/DEVIATED/INCONCLUSIVE）；探测目标是否符合预期；"完成"指探测完成，不是目标完成；原 ProbeVerdict 改名（ADR-0066/0067）。

### outcome
- frozen.json 里的 Proof 级聚合结构 `{completed: N, deviated: N, inconclusive: N}`；OXN 不做整体合格/失败聚合判定，只提供各状态 Probe 数量；判定权归工程师（ADR-0067）。

### Report
- CLI 基于 Proof 输出的可读报告（oxn work submit 后的输出）；包含 outcome 聚合 + ProbeOutcome 列表 + InterferenceFlag；不新判定，只呈现已有事实（ADR-0066）。

### BoundaryDeviation
- 边界偏离信号（frozen.json 标记），替代原"Boundary Violation"；OXN 只记录偏离不阻断，判定权归工程师（ADR-0066）。

## 零件与作用域

### Part
- OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。

### Builtin
- OXN 自带资产（@oxn scope）；版本号单调递增；不依赖任何 @prj 资产。

### Scope
- OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。

### Registry
- 内存中的 @oxn 资产查询表（OxnBuiltinRegistry 维护），CLI 加载期 fail-fast 校验。

## 观察与判定分离

### ProbeObservation
- L1 Infra 产出的物理事实（exitCode / stdout / stderr / fileList 等）；纯事实，不含判定。

### Kernel
- L0 纯逻辑验证模块（记录事实不评判，ADR-0031）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome。详见 [engine-terms](./engine-terms#kernel)。

### Infra
- L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive 通过 ProviderRegistry 暴露。详见 [engine-terms](./engine-terms#infra)。

## 证据链

### Frozen
- Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）；包含 outcome 聚合结构（ADR-0067）。详见 [work-terms](./work-terms#frozen)。

### Trace
- Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

### ContentHash
- SHA-256 内容哈希（64-hex），写入时计算读取时校验；frozen.json 用 self-excluding 协议。签名被外部篡改 → 抛 OXN_CRASH_SIGNATURE_MISMATCH。

## 干扰标记

### InterferenceFlag
- 12 项干扰标记枚举（8 RED + 4 YELLOW）：waf_detected / just_modified / detached_head / shallow_clone / sandbox_violation / network_timeout / response_truncated / permission_denied（RED）；cdn_cache / cache_path / symlink / unknown（YELLOW）。

## 简明对照

| 阶段 | 谁产出 | 字段 |
|---|---|---|
| 物理观测 | L1 Infra | ProbeObservation（exitCode/stdout/stderr/fileList） |
| 客观结果 | L0 Kernel | ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE） |
| Proof 聚合 | Proof | outcome {completed, deviated, inconclusive} |
| CLI 输出 | CLI | Report（outcome + ProbeOutcome 列表） |
| 不可篡改 | Work finalize | frozen.json（chmod 0o444 + content_hash） |
| 历史事件 | 全程 | trace.jsonl（append-only） |
