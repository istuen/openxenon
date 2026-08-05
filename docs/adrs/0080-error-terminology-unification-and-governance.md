---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: ADR-0081
related:
  - .openxenon/drafts/rfc/0067-no-judgment-principle.md
  - .openxenon/drafts/rfc/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md
  - .openxenon/.archived/drafts/plans/error-conflict-handling-convergence.md
  - .openxenon/.archived/drafts/plans/rn-grilling-summary-assessment.md
  - .openxenon/drafts/rfc/0081-oxn-unified-error-framework.md
---

# ADR-0080: 错误与冲突处理术语统一 + 新增错误规范机制

> **状态**：✅ Accepted（类型层被 [ADR-0081](./0081-oxn-unified-error-framework.md) 取代；错误类别层 + SSOT 注册表 + 决策树保留）
> **日期**：2026-07-23
> **来源**：实践盘问 #4（grilling session 实践阶段）
> **影响层**：全栈错误分类 + 错误码命名规范 + 新增错误流程

> **与 ADR-0081 的关系**：本 ADR 的错误类型层（IAPError / OXNCrash / CliInputError 三类型 + 6 个前缀）被 ADR-0081 重构为 EngineError + CLIError 双基类 + Domain 子类层次（Engine 和 CLI 各自独立基类）。本 ADR 的以下部分**保留有效**：
> - §D2 错误类别层（6 种类别）——作为 SSOT 注册表的文档字段
> - §D4e 验证结果与 finalize 阻断 code 分离——code 名变更但原则保留
> - §D5 新增错误规范机制（决策树 + SSOT 登记 + AXIS/action 指南）——AXIS 概念被 ADR-0081 的 Domain 取代
> - §D7 `--force` 绕过审计轨迹——frozen.json 结构不变
> - §D8 僵尸码清理——deprecated 标记保留
>
> 本 ADR 的以下部分**被 ADR-0081 取代**：
> - §D4a 前缀格式表（6 个前缀 → 1 个 OXN_ 根前缀）
> - §D4b 命名规则（`IAP_<AXIS>_<CODE>` → `OXN_<DOMAIN>_<CODE>_<SEVERITY>`）
> - §D4c 前缀一致性修正
> - §D4d INFRA_FAIL 子码映射（INFRA_FAIL_ 前缀 → Domain 子类 + code）
> - §D9 OXNCrash 使用规范（CrashError 删除，FATAL severity 替代）

## Context

**触发问题**：实践盘问 #4 暴露 OXN 错误处理体系存在严重的术语碎片化。代码分析发现：

1. **7 个定义点分散**：IAPError (22 codes) / OXNCrash (3 codes) / ExecErrorCode (9 codes) / E_MD_xxx (15+ codes) / ~70 个 ad-hoc `OXN_*` CLI 字符串 / Daemon HTTP errors (8) / Daemon socket codes (2)——无中央注册表。
2. **前缀不一致**：文档写 `IAP_ALIGN_LOCK_NOT_FOUND`，代码输出 `OXN_ALIGN_LOCK_NOT_FOUND`——同一个错误两个名字。
3. **僵尸码**：5 个 IAPError codes + 5 个 ExecErrorCode values 无 throw site——声明了但从未使用。
4. **OXNCrash 从未在生产代码抛出**——tier-4 fallback 兜底所有未知异常。
5. **拼写错误**：`OXN_DSL_PARVE_FAILED`（应为 PARSE）。
6. **重复联合类型成员**：E_MD_xxx 有 5 个重复声明。
7. **无 SSOT 文档**：错误码散落在 7+ 定义点和 ~70 个字符串字面量中。

**根因**：错误码随功能迭代逐个添加，缺乏统一的分类框架和命名规范。不同层（Engine/CLI/Daemon/MD pipeline）各自定义错误码，没有跨层一致性。

## Decision

### D1: 错误分类框架——三层模型

```
Layer 1: 错误类型（Error Type）—— 消费者面向
    │  决定输出渠道 + 退出码 + 消费者
    │
    ▼
Layer 2: 错误类别（Error Category）—— 语义面向
    │  决定处理策略（阻断/记录/预警）+ 设计意图
    │
    ▼
Layer 3: 错误码（Error Code）—— 实现面向
    │  具体代码字符串 + 定义位置 + throw site
```

### D2: Layer 1——错误类型（3 种，不可新增）

| 类型 | 消费者 | 输出渠道 | 退出码 | 语义 |
|---|---|---|---|---|
| **IAPError** | AI Agent | stdout JSON | 1 | 业务流错误——AI 可消费，自主重试或让步 |
| **OXNCrash** | 人类工程师 | stderr 堆栈 | 2 | 引擎 bug——AI 不应看到，避免错误修复掩盖 bug |
| **CliInputError** | AI/人类 | stdout JSON | 1 | 用户输入错误——可通过 `isCliInputError()` 前缀白名单识别 |

**规则**：不允许新增错误类型。所有错误必须归入这三种之一。

### D3: Layer 2——错误类别（6 种）

| 类别 | 语义 | 处理策略 | 涉及阶段 |
|---|---|---|---|
| **传感器异常（Sensor Fault）** | Probe 基础设施故障——传感器本身坏了 | 阻断 | run / submit |
| **验证结果（Verification Outcome）** | Probe 正常执行后的状态——不是错误，是数据 | 只记录不阻断 | submit（宽松走廊） |
| **强制机制（Enforcement）** | 转换点的把关——计划一致性 / 成果确定性 | 阻断（Lock 不可绕过 / Finalize 可风险绕过） | lock / finalize |
| **输入校验（Input Validation）** | 用户/AI 输入不符合格式或约束 | 阻断 | 所有阶段 |
| **基础设施保护（Infra Protection）** | 系统资源保护——熔断 / 超时 / 重启 | 阻断或降级 | daemon |
| **状态机（State Machine）** | Work/Task 生命周期状态违反 | 阻断 | run / submit / next-round |

**验证结果不是错误**——这是本 ADR 的核心原则。Probe 的验证结果（COMPLETED / DEVIATED / INCONCLUSIVE）是 Probe 正常工作的产出数据，不是错误。只有传感器异常（传感器坏了不能验证）才是错误。这与 ADR-0067（彻底不判）+ ADR-0031（Proof = notary not judge）一致。

### D4: Layer 3——错误码命名规范

#### 4a. 前缀规范

| 前缀 | 类型 | 定义层 | 示例 |
|---|---|---|---|
| `IAP_<AXIS>_<CODE>` | IAPError | Engine (L0-Contract / L2) | `IAP_INTENT_PROBE_OUT_OF_BOUNDARY` |
| `INFRA_FAIL_<SPECIFIC>` | IAPError（INFRA_FAIL 子码） | Engine (L0-Contract / L2) | `INFRA_FAIL_STATE_LOAD` |
| `OXN_CRASH_<CODE>` | OXNCrash | Engine (errors) | `OXN_CRASH_SIGNATURE_MISMATCH` |
| `OXN_<DOMAIN>_<CODE>` | CliInputError | CLI (L3) | `OXN_WORK_NOT_FOUND` |
| `E_MD_<CODE>` | MD Pipeline | Engine (oxl) | `E_MD_DEPRECATED_SYNTAX` |

**AXIS 枚举**（IAPError 专用，不可新增）：`INTENT` | `ALIGN` | `PROOF` | `INFRA`

**INFRA_FAIL 子码规则**：`INFRA_FAIL` 是错误范围（命名空间），拆分为具体子码 `INFRA_FAIL_<SPECIFIC>`。子码不带 `IAP_` 前缀和 AXIS（AXIS 已是 IAPError 的独立字段）。裸码 `INFRA_FAIL` 保留为 deprecated fallback。AI 检测时 `code.startsWith('INFRA_FAIL')` 同时匹配新旧码。

#### 4b. 命名规则

1. **全大写 + 下划线分隔**——`SCREAMING_SNAKE_CASE`
2. **动词或名词短语**——描述"发生了什么"而非"该怎么做"（怎么做在 action 字段）
3. **避免否定式**——用 `NOT_FOUND` 而非 `MISSING`（保持与 HTTP 语义一致）
4. **同一概念跨层保持 CODE 部分一致**——如 Engine 抛 `IAP_INFRA_PATH_CONFLICT`，CLI 输出 `OXN_ASSET_PATH_CONFLICT`（前缀不同但 CODE 部分相同）
5. **code 不可跨类别复用**——一个 code 只能属于一种错误类别（传感器异常/强制机制/状态机等）。裸码 `INFRA_FAIL` 违反此规则（跨 4 种类别），因此拆分为 `INFRA_FAIL_*` 子码

#### 4c. 前缀一致性修正

| 当前（不一致） | 修正为 | 理由 |
|---|---|---|
| 文档 `IAP_ALIGN_LOCK_NOT_FOUND` | 统一为 `OXN_ALIGN_LOCK_NOT_FOUND` | 代码实际输出 `OXN_` 前缀，且这些不是 IAPError 实例（无 axis/action） |
| `OXN_DSL_PARVE_FAILED`（work.ts:2240） | `OXN_DSL_PARSE_FAILED` | 拼写错误 |
| `IAP_ALIGN_ROUND_MAX_EXCEEDED`（ExecErrorCode） | `OXN_ROUND_MAX_EXCEEDED` | 在 OXN_* 联合类型中应保持 OXN_ 前缀；实际抛出时 code=INFRA_FAIL，oxnCode 携带具体码 |
| 裸码 `INFRA_FAIL` 跨 4 种类别复用 | 拆分为 `INFRA_FAIL_*` 子码（见 §D4a INFRA_FAIL 子码映射） | 一个 code 不可跨类别复用（命名规则 5） |

#### 4d. INFRA_FAIL 子码映射

INFRA_FAIL 裸码拆分为 `INFRA_FAIL_*` 子码（仅保留真正的基础设施故障）：

| 当前裸码 throw site | 拆分后 code | axis | 类别 | action |
|---|---|---|---|---|
| `dual-state-io.ts:96,108,170,182` | `INFRA_FAIL_STATE_LOAD` | ALIGN | 状态机 | YIELD_TO_HUMAN |
| `work-domains.ts:146` | `INFRA_FAIL_FROZEN_WRITE` | PROOF | 传感器异常 | YIELD_TO_HUMAN |
| `catalog.ts:570,586,603,618,633` | `INFRA_FAIL_PROBE_CATALOG` | PROOF | 传感器异常 | YIELD_TO_HUMAN |
| `intent-overwriter.ts:60` | `INFRA_FAIL_INSIGHT_TARGET` | INFRA | 状态机 | YIELD_TO_HUMAN |

#### 4e. 验证结果与 finalize 阻断的 code 分离

**原则**：验证结果（DEVIATED / MANUAL_PENDING / INCONCLUSIVE）是数据（DomainProofOutcome），不是错误码。finalize 因验证结果未通过而阻断是**强制机制**，使用独立的 IAPError code，不重用验证结果名。

| 验证结果（数据） | finalize 阻断（错误） | axis | 类别 | action | throw site |
|---|---|---|---|---|---|
| DEVIATED | `IAP_PROOF_FINALIZE_BLOCKED` | PROOF | 强制机制 | YIELD_TO_HUMAN | `work-domains.ts:93` |
| MANUAL_PENDING | `IAP_PROOF_FINALIZE_BLOCKED` | PROOF | 强制机制 | YIELD_TO_HUMAN | `work-domains.ts:109` |
| INCONCLUSIVE | `IAP_PROOF_FINALIZE_BLOCKED` | PROOF | 强制机制 | YIELD_TO_HUMAN | `work-domains.ts:125` |

一个 code 覆盖三种验证结果的 finalize 阻断——因为三者同属强制机制类别，具体 outcome 通过 `context.outcome` 区分（数据层），而非不同错误类型。与 INFRA_FAIL 拆分不同：INFRA_FAIL 跨了 4 种错误类别需要拆分，此处只跨 1 种类别（强制机制）不需要拆分。

### D5: 新增错误规范机制

#### 5a. 新增决策树

```
要新增一个错误码？
    │
    ├── 是引擎 bug（代码死角 / 不可达路径）？
    │     → OXNCrash + OXN_CRASH_<CODE>
    │     → 消费者：人类工程师
    │
    ├── 是 AI 可消费的业务流错误？
    │     → IAPError + IAP_<AXIS>_<CODE> + action(AUTONOMOUS_RETRY | YIELD_TO_HUMAN)
    │     → 消费者：AI Agent
    │     → 需判断属于哪个错误类别（传感器异常/强制机制/状态机）
    │
    ├── 是用户输入格式/约束错误？
    │     → CliInputError + OXN_<DOMAIN>_<CODE>
    │     → 消费者：AI/人类
    │     → 需确保前缀在 isCliInputError 白名单中
    │
    └── 是 MD 语法/结构错误？
          → E_MD_<CODE>
          → 消费者：AI/人类
    │
    ▼
新增前必须：
    1. 在错误码 SSOT（docs/dev/zh-cn/error-code-registry.md）登记
    2. 填写：类型 / 类别 / 前缀 / CODE / AXIS（如适用）/ action / 消费者 / 触发场景 / throw site
    3. 确认无现有码可复用（搜索 SSOT）
    4. 如果是 IAPError，确认 AXIS 选择正确
```

#### 5b. AXIS 选择指南（IAPError 专用）

| AXIS | 适用场景 | 示例 |
|---|---|---|
| **INTENT** | 计划层结构合规性——Asset/Blueprint/Domain 声明违反 | PROBE_OUT_OF_BOUNDARY / TASK_DAG_VIOLATES_SLOT |
| **ALIGN** | 执行层状态机——Work/Task 生命周期违反 | INFRA_FAIL (state load) / ROUND_MAX_EXCEEDED |
| **PROOF** | 验证层——Probe 执行 / Domain invariant / frozen 写入 | PROBE_CORRUPTED / INFRA_FAIL (domain proof) |
| **INFRA** | 基础设施——Asset 路径 / Provider / Sandbox | PATH_CONFLICT / PROVIDER_DUPLICATE / SANDBOX_REJECTED |

#### 5c. Action 选择指南（IAPError 专用）

| Action | 适用场景 | AI 行为 |
|---|---|---|
| **AUTONOMOUS_RETRY** | AI 可自修正并重试——格式错误 / 路径错误 / 参数错误 | AI 调整后重试 |
| **YIELD_TO_HUMAN** | AI 无法自修正——环境问题 / 依赖缺失 / 需人工判定 | AI 停止，交给工程师 |

**判断准则**：AI 能否通过修改自己的行为（而非修改环境）解决？能 → AUTONOMOUS_RETRY；不能 → YIELD_TO_HUMAN。

### D6: 验证结果（Verification Outcome）——不是错误

明确声明：以下状态**不是错误码**，是 Probe 正常工作的产出数据：

| 状态 | 定义 | 处理 |
|---|---|---|
| **COMPLETED（验证一致）** | 目标符合 Probe 声明的验证标准 | 记录到 frozen.json |
| **DEVIATED（验证有差异）** | 目标不符合验证标准 | 记录到 frozen.json，不阻断 |
| **INCONCLUSIVE（无法验证）** | 脚本执行异常（超时 / 非标准退出码） | 记录到 frozen.json，finalize 时阻断（可风险绕过） |
| **MANUAL_PENDING（人工待判定）** | 无 script 也无 manual 声明 | 记录到 frozen.json，finalize 时阻断（可风险绕过） |

**INCONCLUSIVE 和 MANUAL_PENDING 在 finalize 时阻断**——但这不是"验证有差异的阻断"，是"无法完成确定性验证的阻断"。区别：
- DEVIATED = 确定性地说"不满足" → 可风险绕过（工程师承担风险）
- INCONCLUSIVE = 无法确定性判断 → 必须修复 script 或补充 manual 才能完成 finalize（或 --force 绕过）
- MANUAL_PENDING = 需人工判定 → 必须人工处理（或 --force 绕过）

### D7: `--force` 绕过审计轨迹

**问题**：`--force` 绕过 finalize 阻断时，frozen.json 中不记录绕过事实。审计者无法从 frozen.json 区分"验证通过"与"验证未通过但被强制绕过"。

**决策**：frozen.json 新增 `forceUsed` 字段，记录 `--force` 绕过事实。

#### frozen.json 结构变更

```typescript
interface WorkDomainsFrozen {
  workId: string
  finalizedAt: number
  domainProofs: Array<{ ... }>
  overallOutcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
  hardBlocked: boolean
  forceUsed: boolean        // 🆕 是否通过 --force 绕过阻断
  forceDetails?: {          // 🆕 仅 forceUsed=true 时填充
    blockedOutcomes: Array<'DEVIATED' | 'MANUAL_PENDING' | 'INCONCLUSIVE'>  // 被绕过的验证结果类型
    forcedAt: number        // 绕过时间戳
  }
}
```

#### 审计语义

| forceUsed | overallOutcome | 含义 |
|---|---|---|
| `false` | `COMPLETED` | 正常通过——所有验证一致 |
| `false` | — | 不会出现（非 COMPLETED 会被阻断，无法 freeze） |
| `true` | `COMPLETED` | 不可能（forceUsed=true 意味着有未通过的验证） |
| `true` | `DEVIATED` / `INCONCLUSIVE` | 强制绕过——验证有差异但被人为放行 |

**关键约束**：`forceUsed=true` 时 `overallOutcome` 必然非 `COMPLETED`。这个不变量由 `finalizeWorkDomains` 在写入前保证。

#### Referent 完整性

`--force` 绕过不破坏 OXN 作为 Referent 的"确定性满足"承诺（ADR-0073 判据 4）——因为：
1. **绕过事实被记录**：frozen.json 明确标记 `forceUsed=true` + 具体被绕过的 outcome
2. **验证结果不被篡改**：DEVIATED/INCONCLUSIVE 仍然如实记录在 `domainProofs[]` 中
3. **审计可追溯**：下游消费者（Insight / 人类审计）可以检测到 `forceUsed=true` 并据此调整信任度

Referent 提供的是"确定性参考"而非"确定性保证"——它如实记录发生了什么（包括人为绕过），而非阻止绕过发生。

### D8: 僵尸码清理

以下错误码已声明但无 throw site，标记为 **deprecated**，后续版本清理：

#### IAPError 僵尸码（5 个）

| Code | 状态 | 处理 |
|---|---|---|
| `CRASH` | 无 throw site | 标记 deprecated，后续删除（用 OXNCrash 替代） |
<!-- allow-version -->
| `CHECKLIST_MISSING` | 无 throw site（v0.2 TODO） | 标记 deprecated，后续删除或实现 |
<!-- /allow-version -->
| `UNDEFINED_TERM` | 无 throw site | 标记 deprecated，后续删除或实现 |
| `PROBE_INVALID` | 无 throw site | 标记 deprecated，后续删除（已被 catalog.ts 的 INFRA_FAIL 替代） |
| `PROBE_FIX_UNAVAILABLE` | 无 throw site | 标记 deprecated，后续删除或实现 |

#### ExecErrorCode 僵尸码（5 个）

| Code | 状态 | 处理 |
|---|---|---|
| `OXN_WORKSPACE_NOT_FOUND` | 无 throw site | 标记 deprecated，后续删除 |
| `OXN_TASK_OXN_MISSING` | 无 throw site | 标记 deprecated（CLI 层有 `OXN_TASK_OXN_MISSING` 但 engine 层未用） |
| `OXN_NO_NEXT_PART` | 无 throw site | 标记 deprecated，后续删除 |
| `OXN_PART_ALREADY_DONE` | 无 throw site | 标记 deprecated，后续删除 |
| `OXN_WORKSPACE_ALREADY_RUNNING` | 无 throw site | 标记 deprecated（被 `OXN_WORK_ALREADY_RUNNING` 替代） |

#### E_MD_xxx 重复成员

`mdast-validator.ts:50-55` 重复了 `:40-44` 的 5 个成员——删除重复声明。

### D9: OXNCrash 使用规范

当前 OXNCrash 从未在生产代码抛出——tier-4 fallback 兜底所有未知异常。这**不是设计缺陷**，而是"未到需要区分的时机"。

**规则**：
- tier-4 fallback 是 OXNCrash 的默认行为——未知异常 = 引擎 bug = OXNCrash
- 显式抛出 OXNCrash 仅用于"已知不可恢复的引擎状态损坏"——如 frozen.json 签名被篡改、状态机进入非法状态
- **不要用 OXNCrash 替代 IAPError**——如果 AI 可以消费并处理，用 IAPError 不用 OXNCrash

## Consequences

### 正面

1. **三层分类框架**提供统一的错误描述语言——类型（谁消费）+ 类别（怎么处理）+ 码（具体什么错）
2. **新增错误规范机制**防止随意添加错误码——决策树 + SSOT 登记 + AXIS/action 选择指南
3. **验证结果不是错误**的原则被显式声明——消除"Probe fail 是错误"的误导
4. **僵尸码清理**——5+5 个废弃码标记 deprecated，减少认知负担
5. **前缀一致性修正**——`IAP_ALIGN_*` vs `OXN_ALIGN_*` 统一，拼写错误修正

### 负面 / 限制

1. **修正需要代码改动**——前缀一致性修正 + 拼写修正 + 僵尸码清理需要后续 PR 执行，本 ADR 只确立规范
2. **~70 个 ad-hoc OXN_* 字符串未中央注册**——SSOT 登记是理想，但现有码的回溯登记工作量大
3. **E_MD_xxx 的归属模糊**——MD pipeline 错误是 IAPError 还是独立类型？当前是独立 `Error` 子类，不在三层分类内。后续需决定是否纳入

### 中性

1. **Daemon 错误保持 HTTP 风格**——Daemon 的 HTTP error strings（BadRequest/NotFound 等）不纳入本规范，因为它们是 IPC 协议层错误，语义和 OXN 业务错误不同
2. **OXNCrash 保持"储备"定位**——不强制要求生产代码显式抛出，tier-4 fallback 是合理默认

## Alternatives Considered

### Alt-1: 全部统一为 IAPError

**否决**。OXNCrash 的消费者（人类工程师）和输出渠道（stderr）与 IAPError（AI Agent / stdout）根本不同。强制统一会丢失"AI 不应看到引擎 bug 堆栈"的设计意图。

### Alt-2: 错误码中央注册表（代码级）

**否决（当前）**。将所有错误码集中到一个 `error-codes.ts` 注册表——理想但改动量大（~70 个字符串字面量散落在 CLI 命令中）。当前先用文档级 SSOT（`error-code-registry.md`），后续可考虑代码级注册表。

### Alt-3: 不做僵尸码清理

**否决**。僵尸码增加认知负担且可能被误用。标记 deprecated 是最低成本的处理。

## References

- [ADR-0067 彻底不判原则](./0067-no-judgment-principle.md) — 验证结果不是错误的法理基础
- [ADR-0073 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 判据 4（确定性满足非优化）
- [ADR-0074 Insight 原料非推理](./0074-insight-ingredient-not-reasoner.md) — 验证结果是 Insight 的原料
- `error-conflict-handling-convergence.md` — 实践盘问 #4 的术语统一草稿
- `error-code-registry.md` — 错误码 SSOT 全量索引（本 ADR 的配套文档）
- `packages/engine/src/kernel/contracts/iap-error.ts` — IAPError 定义
- `packages/engine/src/errors/oxn-crash.ts` — OXNCrash 定义
- `packages/engine/src/errors/cli-input-error.ts` — CliInputError 检测
- `packages/engine/src/Work/dual-state-exec.ts` — ExecErrorCode 定义
- `packages/engine/src/oxl/md-bridge/mdast-validator.ts` — E_MD_xxx 定义
