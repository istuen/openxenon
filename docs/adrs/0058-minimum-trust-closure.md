<!-- allow-version -->
# ADR-0058: 最小信任闭环（v0.6.1 Scope）
<!-- /allow-version -->

> **状态**：✅ Adopted
> **日期**：2026-07-12
> **触发**：[版本统一 RFC §1.3](../../docs/rfcs/version-unification-rfc.md)
> **影响层**：L2-Engine（Work/Proof）+ L1-OXL（编译器）+ L3-CLI

## Context

<!-- allow-version -->
信任链模型（ADR-0057）确立后，需要定义"信任链就位"的最小实现范围。v0.6.1 不是功能完备版，而是信任链的四层确定性就位——OpenXenon Engine 从"任务跟踪器"升级为"信任协作工具"的临界点。
<!-- /allow-version -->

信任链有四个断裂点需要修复：

| 断裂点 | 信任后果 |
|---|---|
| 边界表达不清（6 类型混乱） | 工程师无法确定性地定义"可靠" |
| AI 执行无真实验证（A3） | OXN 出示的证据是假的 |
| 失败路径无证据（A1） | 工程师看不到 AI 不可靠的部分 |
| 边界违反无记录（A2） | OXN 不告知工程师 AI 跨越了边界 |

## Decision

<!-- allow-version -->
**v0.6.1 = 最小信任闭环**——四层确定性就位：
<!-- /allow-version -->

### D1: 确定性边界（三边界框架）

AssetKind 从 6 收敛为 5（domain/workflow/stack/blueprint/roadmap）。详见 ADR-0054/0055/0056。

### D2: 确定性验证（A3 修复）

`submitTask` 当前返回合成 `{ probe: 'state-machine', passed: true }`。修复：submit 真正执行 Probe，连接 Work → Kernel verdict。移除合成占位符。

**信任后果**：Engine 的公证权就位。"OXN Engine 出证明"不再是谎言。

### D3: 确定性证据（A1 修复）

`finalizeWork` 不写 `frozen.json`。修复：finalizeWork 在全路径写 `.run/frozen.json`（含失败路径），包含 round summary + verdict + boundary violations。

**信任后果**：系统对自己的失败不再盲眼。Insight 的 `--pipeline` 模式可读取失败工作。

### D4: 确定性记录（A2 修复）

`finalizeWorkDomains`（163 行）零调用者。修复：接通调用方，Domain proof FAIL 时在 frozen.json 中标记"边界违反"。

**注意**：A2 是"确定性记录"而非"硬阻断"。AI 是否跨越边界是 AI 自己的概率决策。A2 是"OXN 确定性地告知工程师 AI 跨越了边界"——工程师看到证据后决定调整边界还是接受。

## Consequences

- **正面**：OpenXenon 从"任务跟踪器"升级为"信任协作工具"
- **正面**：四层确定性形成完整证据链（边界→验证→证据→记录）
- **风险**：A3 修复需要 Work 引擎调用 Kernel verdict，涉及跨层调用
<!-- allow-version -->
- **衍生**：v0.7 在此基础上构建效率层（自动收集、可视化、模式识别）
<!-- /allow-version -->

## Alternatives Considered

- **仅修复 A3（验证层）**：证据链不完整——有验证但无记录——否决
- **修复 A1+A3 但不修复 A2**：边界违反不可见——工程师无法知道 AI 是否跨越边界——否决
- **修复全部但推迟三边界**：边界类型混乱持续——信任链的基础不稳——否决

## References

- [版本统一 RFC §1.3 + §3](../../docs/rfcs/version-unification-rfc.md)
- [core-concepts.md §13](../../docs/zh-cn/core-concepts.md)
<!-- allow-version -->
- [2026-07-09 Work 闭环清理草案](../../pools/drafts/2026-07-09-v0.7-work-closed-loop-and-cleanup.md) — A1/A2/A3 代码级分析
<!-- /allow-version -->
- [ADR-0054 三边界框架](./0054-three-boundary-framework.md) — D1 实现
- [ADR-0011 证据链三件套](./0011-evidence-chain-triple.md) — frozen.json 规范
