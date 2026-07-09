# ADR-0008: ProbeObservation vs ProbeVerdict 二元公理

> **来源**：`docs_tmp/kernel-1.md` (2026-05-26)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L0-Contract

## 决策

Kernel 内两类数据严格区分：

| 类型 | 含义 | 所在层 | 谁生成 |
|---|---|---|---|
| `ProbeObservation` | 物理事实（exitCode、stdout、stderr） | L1 Infra | Probe 执行器 |
| `ProbeVerdict` | 业务判定（PASS / FAIL / ERROR） | L0 Kernel | Processor |

## 关键不变量

- L1 Infra **只产出** ProbeObservation，**不判定** 业务对错
- L0 Processor **只消费** ProbeObservation，**不调用** IO（fs / net / child_process）
- 跨层数据传递只能通过 Contract（`kernel/contracts/probe-port.ts`）

## 后果

- ✅ Kernel 真空（无 IO）— 当前 `L0-Processor 禁 fs/net/proc` 已落实
- ✅ Probe 行为可解释：物理事实在先，判定在后
- ✅ 同一 Probe 可被不同 Verdict 策略复用

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-26-kernel-1.md`