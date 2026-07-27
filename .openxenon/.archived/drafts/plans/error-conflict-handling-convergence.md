# OXN 错误与冲突处理——定义与设计收敛

> **日期**：2026-07-23
> **来源**：实践盘问 #4（grilling session 实践阶段）
> **状态**：📝 术语统一 + 设计原则收敛
> **关联**：ADR-0067（彻底不判）+ ADR-0073（判据 4 确定性满足）+ ADR-0074（原料非推理）

## 术语统一

### Probe 相关

| 统一术语 | 定义 | 对应代码 |
|---|---|---|
| **传感器异常（Sensor Fault）** | Probe 基础设施故障——传感器本身坏了 | PROBE_CORRUPTED / PROBE_MISSING / PROBE_FIX_UNAVAILABLE |
| **验证结果（Verification Outcome）** | Probe 正常执行后的状态——不是错误，是数据 | |
| — 验证一致（COMPLETED） | 目标符合 Probe 声明的验证标准 | script exit 0 |
| — 验证有差异（DEVIATED） | 目标不符合验证标准 | script exit 1 |
| — 无法验证（INCONCLUSIVE） | 脚本执行异常（超时 / 非标准退出码） | timeout / exit ≠ 0,1 |
| **人工待判定（MANUAL_PENDING）** | 无 script 也无 manual 声明，需人工判定 | manual=true / scope=project / 无声明 |

### 阶段相关

| 统一术语 | 定义 |
|---|---|
| **Intent→Align 转换** | AI 理解 Work 目标并编排设计 → 进入执行。CLI 命令 = `oxn work lock` |
| **Align→Proof 转换** | AI 执行完成 → 确定性验证 + 不可篡改记录。CLI 命令 = `oxn work finalize` |
| **强制机制（Enforcement）** | 转换点的把关——分"不可绕过"和"可承担风险绕过" |
| **风险绕过（Risk Override）** | 工程师承担风险绕过强制机制（`--force`），frozen.json 标记 hardBlocked |

### 已废弃噪音术语

| 废弃术语 | 原因 | 替代 |
|---|---|---|
| "Probe failure" | 模糊——传感器异常 vs 验证有差异 | 传感器异常 / 验证有差异（DEVIATED） |
| "Probe error" | 模糊 | 同上 |
| "failing probes" | 模糊 | 同上 |
| "硬阻断" / "block" | 行为描述非设计意图 | 强制机制（Enforcement） |
| "--force 后门" | 带价值判断 | 风险绕过（Risk Override） |
| "submit 宽松" / "finalize 严格" | 行为特征非设计意图 | 见下文设计原则 |

---

## 设计原则

### 原则 1：三个阶段 = 两次转换 + 一个宽松走廊

```
Intent（AI 理解目标 + 编排设计）
    │
    │  Intent→Align 转换（Lock）
    │  强制机制：计划一致性
    │  不可绕过
    │
    ▼
Align（AI 在边界内执行）
    │
    │  宽松走廊
    │  验证结果（DEVIATED）只记录不阻断
    │  AI 自由尝试，差异是数据不是错误
    │
    ▼
Proof（确定性验证 + 不可篡改记录）
    │
    │  Align→Proof 转换（Finalize）
    │  强制机制：成果确定性
    │  可风险绕过（--force，标记 hardBlocked）
    │
    ▼
frozen.json（不可篡改的终态记录，chmod 0o444）
```

### 原则 2：Lock 和 Finalize 保护对象不同

| 维度 | Lock（Intent→Align） | Finalize（Align→Proof） |
|---|---|---|
| **保护对象** | 计划一致性——后续执行基于一致的起点 | 成果确定性——终态记录不可篡改 |
| **绕过后果** | 后续在不一致基础上执行 = 整个 Align 失去参照 | frozen.json 记录 hardBlocked，OXN 记录功能不受影响 |
| **风险绕过** | ❌ 不允许 | ✅ 允许（--force） |
| **设计意图** | 过程前提不可绕过 | 成果质量可由工程师承担风险绕过 |

### 原则 3：验证结果不是错误

Probe 的验证结果（COMPLETED / DEVIATED / INCONCLUSIVE）不是错误——是 Probe 正常工作的产出。OXN 记录这些结果但不据其阻断执行（宽松走廊）。

- **传感器异常** = 错误（传感器坏了，不能验证）→ 阻断
- **验证有差异（DEVIATED）** = 数据（传感器正常，检测到差异）→ 记录不阻断

这与 ADR-0067（彻底不判）+ ADR-0031（Proof = notary not judge）一致——OXN 记录事实不评判质量。DEVIATED 是事实（脚本 exit 1），不是评判。

### 原则 4：强制机制只在转换点

强制机制（Enforcement）只在两个转换点生效：

| 转换点 | 强制什么 | 机制 |
|---|---|---|
| Intent→Align（Lock） | 结构合规性 + 计划完整性 | Probe 在 observe[] / DAG 闭包 / planLock hash |
| Align→Proof（Finalize） | 成果确定性 | Domain invariant script 执行 |

中间的 Align 阶段（run/submit）是宽松走廊——无强制机制，只有记录。

---

## 全貌（统一术语版）

### create 阶段

| 场景 | 强制机制 | 行为 |
|---|---|---|
| Blueprint 不存在 | 输入校验 | 阻断（OXN_FILE_NOT_FOUND） |
| Blueprint 无 boundaries | 输入校验 | 阻断（OXN_INVALID_BLUEPRINT） |
| Asset 已存在 | 输入校验 | 阻断（IAP_INFRA_PATH_CONFLICT） |

### Intent→Align 转换（Lock）

| 场景 | 强制机制 | 行为 |
|---|---|---|
| work.md 解析失败 | 计划完整性 | 阻断（OXN_WORK_VALIDATE_FAILED） |
| Probe 不在 slot.observe[] | 结构合规性 | 不可绕过（IAP_INTENT_PROBE_OUT_OF_BOUNDARY） |
| Task DAG 违反 slot DAG 闭包 | 结构合规性 | 不可绕过（IAP_INTENT_TASK_DAG_VIOLATES_SLOT） |
| refs 未解析 | 计划完整性 | 阻断（OXN_WORK_REFS_UNRESOLVED） |
| 通过 | — | 写 .work + blueprints.json + planLock hash 冻结 |

### Align 阶段（run / submit）——宽松走廊

| 场景 | 机制 | 行为 |
|---|---|---|
| planLock hash mismatch | 计划完整性（不可绕过） | 阻断（OXN_ALIGN_LOCK_HASH_MISMATCH），无风险绕过 |
| 传感器异常（Probe 损坏/缺失） | 基础设施保护 | 阻断（IAP_PROOF_PROBE_CORRUPTED / PROBE_MISSING） |
| Circuit breaker 熔断 | 基础设施保护 | 阻断（HTTP 503） |
| Part 超时 | 基础设施保护 | 返回 success=false |
| **验证有差异（DEVIATED）** | **无——宽松走廊** | **只记录到 frozen.json，Task 状态照样推进** |
| **无法验证（INCONCLUSIVE）** | **无——宽松走廊** | **只记录，不阻断** |

### next-round

| 场景 | 强制机制 | 行为 |
|---|---|---|
| maxIterations 达到 | 资源保护 | 阻断（IAP_ALIGN_ROUND_MAX_EXCEEDED） |
| Work 已 passed | 状态机保护 | 阻断（OXN_ROUND_ALREADY_PASSED） |

### Align→Proof 转换（Finalize）

| 场景 | 强制机制 | 行为 |
|---|---|---|
| 验证有差异（DEVIATED）> 0 | 成果确定性 | 阻断，可风险绕过（--force，标记 hardBlocked） |
| 人工待判定（MANUAL_PENDING）> 0 | 成果确定性 | 阻断，可风险绕过 |
| 无法验证（INCONCLUSIVE）> 0 | 成果确定性 | 阻断，可风险绕过 |
| 全部验证一致（COMPLETED） | — | Phase 2: rename draft→frozen + chmod 0o444 |
| 风险绕过（--force） | — | 写 frozen.json（hardBlocked=true）+ chmod 0o444 |

### 终态

| overallOutcome | work status | frozen.json |
|---|---|---|
| COMPLETED | passed | hardBlocked=false |
| DEVIATED | failed | hardBlocked=true（仅 --force 时写入） |
| INCONCLUSIVE | error | hardBlocked=true（仅 --force 时写入） |

---

## 错误类型与消费者

| 类型 | 消费者 | 输出渠道 | 退出码 | 语义 |
|---|---|---|---|---|
| IAPError | AI Agent | stdout JSON | 1 | 业务流错误（AI 可消费 + 自主重试或让步） |
| OXNCrash | 人类工程师 | stderr 堆栈 | 2 | 引擎 bug（AI 不应看到，避免错误修复掩盖 bug） |
| isCliInputError | AI/人类 | stdout JSON | 1 | 用户输入错误 |

IAPError 的 action 字段指导 AI 行为：
- AUTONOMOUS_RETRY = AI 可自主重试
- YIELD_TO_HUMAN = 需工程师介入

---

## 已知流程断裂点

### submit 宽松 + finalize 严格的潜在断裂

AI 可能 submit 完所有 Task（状态全 passed），但 finalize 时 Domain invariant 验证有差异（DEVIATED）。此时：

- Task 状态已 passed，不会被 next-round reset（只 reset failed/running）
- AI 面临：修改代码 → 但 Task 已 passed 无法重跑？或 --force finalize？

这是当前设计的一个**已知张力**——宽松走廊让 AI 自由尝试，但最终把关点可能卡住。后续 Fork/Round 设计（见 `work-fork-round-design.md`）可能提供出路：AI 可以 Fork 新 Work 尝试修复，原 Work 保留作为失败记录。
