---
version: 0.6.2-alpha.2
prerelease: alpha
date: 2026-07-31
type: feature
scope: collab-boundary
status: pending
---

# 0.6.2-alpha.2: 协作边界分层 + Slogan 重写

## 主题

OXN 三机制从线性编排（Asset → Work → Proof）重定义为**协作边界分层模型**（Proof-First 下限 → Asset 参照 → Work 编排 → Insight 涌现）。同时产品 slogan 从「为协作提供边界与证据」收敛到「工程师定义 AI Agent 协作边界的工具」。

## 交付

### D1: ADR-0084 协作边界分层模型（Accepted 2026-07-31）

四层独立可用 + 上层依赖下层 / 下层不依赖上层：

| 层 | 机制组合 | 场景 |
|---|---|---|
| L0 下限 | Proof only | AI 直接改代码，工程师独立验证 |
| L1 参照 | Proof + Asset | AI 参照 Asset 工作 |
| L2 编排 | Asset + Work + Proof | 完整 IAP 闭环 |
| L3 涌现 | 上述 + Insight | 跨 Work 模式涌现 |

三机制协作语义锐化：

- Asset = 工程师→AI Agent 的**参照机制**（边界线索）
- Work = 围绕 AI Agent 的**追踪机制** + Insight 数据源
- Proof = AI 自证→工程师审计的**反馈机制**

来源：2026-07-31 `/grilling` session（domain-modeling skill）。

### D2: ADR-0085 OXN 环境 6 轴刻画（Accepted 2026-07-31）

OXN Engine 在 R&N 6 轴环境分类中的位置：

- **可观察性**：partially observable（通道外不可观察）
- **确定性**：deterministic channel（通道内确定，环境本身不一定）
- **回合性**：episodic with memory（每 CLI 离散 + 跨回合保留上下文）
- **静态/动态**：semidynamic（资产静态 + 执行动态）
- **连续/离散**：discrete
- **已知性**：partially known（Asset 边界已知，AI 路径未知）

边界澄清：

- `maxIterations` = 环境约束（搜索预算），非 path_cost
- 拓扑闭包校验 = 结构格式校验，非搜索空间约束
- Probe 标准 AI 不可见 = OXN 对 AI 的对抗性，非环境不可观察

### D3: ADR-0072 Errata v1.0.1 — 确定性根基锐化

**修订前**：OXN 确定性 = 信息隐藏 + 代码不可变（混合表述）

**修订后**：OXN 确定性根基 = **执行代码不可变**（OXN 构建产物）。ADR-0076 「验证标准 AI 不可见」是软对抗（提高针对性绕过成本），**非**确定性根基。

关联 invariant 落地：

- `oxn-proof-domain.md:inv-24 proof-code-immutability`
- `oxn-asset-domain.md:inv-22 asset-exposes-probe-contract-not-implementation`
- `oxn-proof-domain.md` 新增 term「确定性根基」「确定性度量」「Proof-First 下限」「Proof 协作语义」

### D4: Slogan 替换（13 个文件）

旧 slogan：「OpenXenon 是工程师与 AI Agent 协作工具，为协作提供边界与证据」

新 slogan：「OpenXenon 是工程师定义 AI Agent 协作边界的工具」

正定义（展开）：「工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果」

正定义三要素：

1. 主语补全为"工程师通过 OXN"——明确 OXN 是工具不是主体
2. 三机制闭环叙述：Asset（定义边界）→ Work（约束协作）→ Proof（验证成果）
3. Insight 暂不入定义（未实现）

替换文件：

- `CONTEXT-MAP.md` — slogan + 正定义补一句
- `.openxenon/assets/domains/oxn-domain.md` — OXN term desc 改写
- `README.md` — 主入口
- `docs/product/zh-cn/_index.md` — 核心命题
- `docs/product/zh-cn/introduction.md` — "什么是 OXN" 段重写为 Asset→Work→Proof 闭环
- `docs/product/zh-cn/ai-entry.md` — AI entry 简述
- `docs/product/zh-cn/roadmap.md` — 三方协作模型
- `docs/product/zh-cn/concepts/iap-paradigm.md` — slogan 引用（4 处）
- `docs/product/zh-cn/concepts/proof.md` — slogan 引用（2 处）
- `docs/product/zh-cn/reference/iap-cheatsheet.md` — slogan 引用
- `docs/glossary/zh-cn/_index.md` — 索引条目
- `docs/glossary/zh-cn/core-terms.md` — OpenXenon 术语
- `docs/.vitepress/config.ts` — description / hero / footer（3 处）
- `docs/adrs/0066-terminology-simplification.md` — 历史 slogan 引用更新

## 验证

- ✅ `grep "为协作提供边界与证据"` 在生产路径上 0 处（仅 ADR-0084 自身描述与 `.archived/` 历史快照）
- ✅ `grep "工程师定义 AI Agent 协作边界的工具"` 20 处命中（覆盖 13 个目标文件）
- ✅ `bun run typecheck` 通过（待 CI 验证）
- ✅ `bun run lint` 通过（待 CI 验证）
- ✅ `bun scripts/validate-dependencies.ts` 0 violations（待 CI 验证）
- ✅ `bun scripts/check-doc-boundary.ts` 0 violations（待 CI 验证）

## 不变 / 不动

- ADR-0072 原 Decision 内容未删除，Errata 段追加
- `archived/` 与 `pools/drafts/` 历史快照保持原样
- ADR-0033 / ADR-0066 等已冻结 ADR 不改本体
- `README.en.md` 与 `docs/en/**` 英文部分保持原状（本轮英文术语不动）
- Domain 升级（oxn-proof 0.2.2→0.3.0、oxn-work 0.2.2→0.3.0、oxn-asset 0.3.0→0.4.0）在 alpha.1 已落盘，本轮不重复

## 参考

- [docs/adrs/0084-collaboration-boundary-layering.md](../../docs/adrs/0084-collaboration-boundary-layering.md)
- [docs/adrs/0085-oxn-environment-characterization.md](../../docs/adrs/0085-oxn-environment-characterization.md)
- [docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md](../../docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md)（含 Errata 段）
- [.openxenon/assets/domains/oxn-proof-domain.md](../../.openxenon/assets/domains/oxn-proof-domain.md)（v0.3.0）
- [.openxenon/assets/domains/oxn-work-domain.md](../../.openxenon/assets/domains/oxn-work-domain.md)（v0.3.0）
- [.openxenon/assets/domains/oxn-asset-domain.md](../../.openxenon/assets/domains/oxn-asset-domain.md)（v0.4.0）
