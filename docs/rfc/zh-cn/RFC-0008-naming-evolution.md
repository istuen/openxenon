---
entity: rfc
id: RFC-0008
theme: naming-evolution
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0066: docs/adrs/0066-terminology-simplification.md
  - ADR-0071: docs/adrs/0071-abolish-audit-trail.md
  - ADR-0080: docs/adrs/0080-error-terminology-unification-and-governance.md
  - ADR-0033: docs/adrs/0033-iap-public-naming-disagreement.md
  - ADR-0036: docs/adrs/0036-canonical-oxn-naming-superseded.md
synced-at: 2026-07-27
landing-reason: declarative
---

# RFC-0008: 命名精简与字段演进策略——Terminology Simplification & Field Evolution

> **类型**：RFC（OpenXenon 规范）
> **主题**：naming-evolution
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
<!-- allow-version -->
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）
<!-- /allow-version -->
> **合并**：OXP-0001（术语精简）→ 本 RFC

## 摘要

OXN 项目命名收敛与字段精简的总政策——废弃 7 个裁判视角术语（TrustChain / EvidenceChainTriple / Notary / AuditChain / Taint / Verdict / AuditTrail），统一到 Proof 或 OXN Engine desc；建立 Asset Paper 4→3 字段演进规则（废除 `auditTrail`，版本历史归 git）；错误与冲突处理术语统一 + 错误码三层模型（类型/类别/码）+ SSOT 注册表。本 RFC 合并原 OXP-0001 内容。

## 决策要点

### D1：废弃 7 个裁判视角术语（ADR-0066）

| 废弃词 | 原位置 | 决策内容归入 |
|---|---|---|
| **TrustChain** | oxn-engine-domain H3 + ADR-0057 | Proof desc |
| **EvidenceChainTriple** | oxn-work-domain H3 + ADR-0011 | Proof desc（三件套是 Proof 的技术规范） |
| **Notary** | oxn-engine-domain H3 + ADR-0031 | OXN Engine desc |
| **AuditChain** | oxn-engine-domain H3 + ADR-0012 | OXN Engine desc |
| **Taint** | oxn-proof-domain H3 | InterferenceFlag（合并） |
| **Verdict** | oxn-proof-domain H3 + 代码 | 拆分为 ProbeOutcome + outcome + Report |
| **AuditTrail**（字段） | ADR-0051 Asset Paper schema | 废除，版本历史归 git（ADR-0071） |

### D2：Verdict 三层拆分

| 层级 | 原 Verdict | 新术语 |
|---|---|---|
| Probe 级（ProbeVerdict） | 单个 Probe 的判定 | **ProbeOutcome** |
| Proof 级（frozen.json verdict 字段） | 聚合三态 | **outcome 聚合结构** `{completed, deviated, inconclusive}` |
| CLI 输出（Verdict 输出） | oxn work submit 后的报告 | **Report** |

### D3：三态字段重命名

```
PASSED / FAILED / INCONCLUSIVE  →  COMPLETED / DEVIATED / INCONCLUSIVE
```

"完成"指**探测完成**，不是**目标完成**。脚本 exitCode≠0 时探测完成了，但目标偏离了 → DEVIATED。

### D4：OXN 不做"整体合格/失败"聚合判定

`frozen.json` 的 `outcome` 字段只提供各状态的 Probe 数量，**不聚合判定"整体合格/失败"**。判定权归工程师。

### D5：Asset Paper 4→3 字段演进（ADR-0071）

```
Before (ADR-0051): abstract + references + citations + auditTrail
After (ADR-0071):  abstract + references + citations
```

`auditTrail` 废除理由（fail-open + 无消费者 + 26/29 文件缺失 + git 已覆盖语义）。版本历史职责归 git：

- `git log --oneline -- .openxenon/assets/{kind}/{name}.md` 查看变更历史
- `git blame` 查看逐行作者
- commit message 约定 `docs(asset): evolve {name} — {reason}`

### D6：错误处理三层模型（ADR-0080）

```
Layer 1: 错误类型（Error Type）—— 消费者面向
    │  决定输出渠道 + 退出码 + 消费者
    ▼
Layer 2: 错误类别（Error Category）—— 语义面向
    │  决定处理策略（阻断/记录/预警）+ 设计意图
    ▼
Layer 3: 错误码（Error Code）—— 实现面向
    │  具体代码字符串 + 定义位置 + throw site
```

### D7：错误类型——3 种不可新增

| 类型 | 消费者 | 输出渠道 | 退出码 |
|---|---|---|---|
| **IAPError** | AI Agent | stdout JSON | 1 |
| **OXNCrash** | 人类工程师 | stderr 堆栈 | 2 |
| **CliInputError** | AI/人类 | stdout JSON | 1 |

### D8：错误类别——6 种

| 类别 | 处理策略 |
|---|---|
| **传感器异常（Sensor Fault）** | 阻断 |
| **验证结果（Verification Outcome）** | 只记录不阻断（**不是错误**，是数据） |
| **强制机制（Enforcement）** | 阻断（Lock 不可绕过 / Finalize 可风险绕过） |
| **输入校验（Input Validation）** | 阻断 |
| **基础设施保护（Infra Protection）** | 阻断或降级 |
| **状态机（State Machine）** | 阻断 |

### D9：错误码命名规范

格式：`SCREAMING_SNAKE_CASE`，动词或名词短语，避免否定式（如 `NOT_FOUND` 而非 `MISSING`），同一概念跨层 CODE 部分一致，code 不可跨类别复用。

### D10：验证结果不是错误——核心原则

Probe 的验证结果（COMPLETED / DEVIATED / INCONCLUSIVE / MANUAL_PENDING）是 Probe 正常工作的产出数据，**不是错误码**。只有传感器异常（传感器坏了不能验证）才是错误。这与 ADR-0067（彻底不判）+ ADR-0031（Proof = notary not judge）一致。

### D11：废弃码 deprecated 标记

5 个 IAPError 僵尸码（CRASH / CHECKLIST_MISSING / UNDEFINED_TERM / PROBE_INVALID / PROBE_FIX_UNAVAILABLE）+ 5 个 ExecErrorCode（OXN_WORKSPACE_NOT_FOUND / OXN_TASK_OXN_MISSING / OXN_NO_NEXT_PART / OXN_PART_ALREADY_DONE / OXN_WORKSPACE_ALREADY_RUNNING）后续版本清理。

### D12：IAP 对外命名决策——保持"出证明"通俗化（ADR-0033，Superseded-by）

**决策**：OXN **对外保持** "**工程师定意图，AI 跑对齐，OXN Engine 出证明**" 三段式命名——"出证明"作为通俗化对外命名，**不对外** 用 "Intent/Align/Verify"。

**内部 vs 对外命名映射**：

| 维度 | 内部（精确） | 对外（通俗） |
|---|---|---|
| 三阶段 | Intent / Align / Proof | 意图 / 对齐 / 出证明 |
| 受众 | 工程师 + AI | 工程师 + 路人 |
| 目的 | 精确语义 | 通俗易懂 |
| 入口 | CLI / code | README / 营销 |

**反提案已否决**：refactor-1 提出对外改为 "Intent/Align/Verify"（Proof 通俗化为 Verify）。否决理由：

<!-- allow-version -->
1. "出证明" 已经在 instruction.md / v0.6 RFC / 多处 docs 落地
<!-- /allow-version -->
2. 改名带来 docs 全量更新成本
3. "Proof" 在工程语境（法律 / 数学证明）有精确含义，不算术语壁垒
4. 保持现有术语可避免新人 onboarding 时的双层命名混淆

**未来若有团队成员重提"对内对外都改 Intent/Align/Verify"**：应引用本决策 + ADR-0033 + RFC-0008 D12，避免重复讨论。

### D13：canonical.oxn 命名演化历史节点（ADR-0036，Superseded）

<!-- allow-version -->
v0.1 阶段 OXL 设计用 `canonical.oxn` 作为资产"正本"文件名（区别于"草稿"）——由 `forge` 命令生成。该命名约定已被替代：
<!-- /allow-version -->

**演化路径**：

```
<!-- allow-version -->
v0.1 阶段                       v0.6.1 阶段（当前）
<!-- /allow-version -->
─────────────────              ──────────────────────
canonical.oxn    ────►          blueprint.oxn    (Blueprint 正本)
                                domain.oxn       (Domain 正本)
                                workflow.oxn     (Workflow 正本)
                                stack.oxn        (Stack 正本)
                                frozen.json      (编译产物，不可变)
```

**替代理由**：

1. **`canonical.oxn` 二义性**："正本 vs 草稿"语义在 multi-Asset 场景下退化（哪种 Asset 有草稿？）
2. **文件名暗示 Owner**：暗示单一权威源（违反多 Asset 平行架构）
<!-- allow-version -->
3. **`forge` 命令退役**：v0.6+ Asset 创建走 Work 流程而非 forge 命令
<!-- /allow-version -->
4. **`frozen.json` 命名统一**：编译产物统一叫 `frozen.json`（不带源格式后缀——RFC-0002 D5 运行期隔离）

**保留意义**：本决策记录命名演化关键节点，避免后人重提 `canonical.oxn` + `forge` 命令。

## 影响范围

- ✅ ADR-0066 / ADR-0071 / ADR-0080 Accept（合并原 OXP-0001）
- ✅ 7 个 Domain .md 文件 desc 重写（精简术语）
- ✅ glossary 8 个文件同步
- ✅ ProbeOutcome 字段 + frozen.json schema 变更
- ✅ Asset Paper schema 3 字段固化
<!-- allow-version -->
- ✅ 错误码 SSOT 文档级注册表（`error-code-registry.md`，位于 docs/dev/zh-cn/）— v0.7+ 配套（已于 v0.6.2-alpha.0 从 drafts/ promote 到 docs/dev/zh-cn/）
- 📝 v0.8.0 可物理删除 `auditTrail` 解析代码路径 + 僵尸码
- ✅ "出证明" 对外命名 + 内部 Intent/Align/Proof 三段式——自 v0.6 RFC 起未变
- ✅ canonical.oxn → blueprint.oxn/domain.oxn/workflow.oxn/stack.oxn/frozen.json 命名演化——v0.6.1 完成
<!-- /allow-version -->

## 相关术语

- [Proof](/product/zh-cn/concepts/glossary.html#proof) — Verdict 拆分的目标归属
- [ProbeOutcome](/product/zh-cn/concepts/glossary.html#probeoutcome) — Verdict 三层拆分第一层
- [outcome](/product/zh-cn/concepts/glossary.html#outcome) — Verdict 三层拆分第二层
- [Report](/product/zh-cn/concepts/glossary.html#report) — Verdict 三层拆分第三层
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — Paper 字段演进承载者
- [IAPError](/product/zh-cn/concepts/glossary.html#iaperror) — 错误类型之一

## 相关决策

- [ADR-0066](../../adrs/0066-terminology-simplification.md) — 术语精简立法（2026-07-21）
- [ADR-0071](../../adrs/0071-abolish-audit-trail.md) — 废除 auditTrail（2026-07-23）
- [ADR-0080](../../adrs/0080-error-terminology-unification-and-governance.md) — 错误与冲突处理术语统一（2026-07-23）
- [ADR-0081](../../adrs/0081-oxn-unified-error-framework.md) — 类型层被取代（ADR-0080 superseded-by）
- [ADR-0033](../../adrs/0033-iap-public-naming-disagreement.md) — IAP 对外命名"出证明"决策（2026-06-28，Superseded → RFC 采纳决策内容）
- [ADR-0036](../../adrs/0036-canonical-oxn-naming-superseded.md) — canonical.oxn 命名演化历史节点（2026-05-21，Superseded → RFC 采纳决策内容）
- [OXP-0001（已删除）](./README.md) — 内容已合并入本 RFC；OXP 文件于 2026-07-26 Phase 3 删除

## Errata

<!-- allow-version -->
### v1.0.1 (2026-07-26)
<!-- /allow-version -->

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

- **新增 D12 IAP 对外命名 + D13 canonical.oxn 演化历史**：ADR-0033 / ADR-0036 内容已并入 RFC 正文（两者状态均为 Superseded，但决策内容——"保持出证明"对外命名 + canonical.oxn → blueprint.oxn/domain.oxn/workflow.oxn/stack.oxn/frozen.json 演化路径——需在 RFC 中明示，避免追溯断链）。
- **frontmatter related 增补**：ADR-0033 / ADR-0036。
- **影响范围段**：增补"出证明" 命名稳定性 + canonical.oxn 演化两项落地声明。

> 本段用于后续追加修正说明。核心决策自 RFC-0008 Accepted 起冻结。
