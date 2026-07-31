---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-31
supersedes: null
superseded-by: null
related:
  - docs/adrs/0002-kernel-l0.md
  - docs/adrs/0084-collaboration-boundary-layering.md
  - docs/rfcs/RFC-0015-proof-system-overhaul.md
  - .openxenon/CONTEXT-MAP.md
---

# ADR-0086: Taint Trust Baseline — 12 flag 硬编码 + Provider-Handler 接线契约

> **状态**：✅ Accepted（2026-07-31）
> **日期**：2026-07-31
> **来源**：2026-07-31 `/grilling` session 第二轮（domain-modeling skill）+ RFC-0015 D2.2
> **影响层**：E3 Engine · Proof 阶段 · InterferenceFlag 信任基线
> **SSOT 角色**：本 ADR 是 RFC-0015 D2 的设计落档，固化 12 flag 的硬编码语义与 Provider-Handler 接线契约

## Context

**触发问题**：Probe 在真实 IO 路径上会遭遇"信号污染"风险——网络层 WAF 拦截、文件系统层 symlink、shell 沙箱拦截、git detached HEAD 等——这些都会让 Probe 的"客观事实"输出**失真**到不可信。但当前实现（v0.6.2-alpha.0）：

1. 4 个 Provider（FileProvider / HttpProvider / ShellProvider / GitProvider）已实现 flag 检测（trust-baseline.ts 12 flag 映射 + InterferenceFlag schema 在 io-primitive.ts:24）
2. verdict.ts:706 `applyTrustBaseline(observation.interference?.flags ?? [], judge)` 已 wiring 入口
3. 但**所有 11 个 IO-direct probe handler 完全 bypass Provider，直接做 IO**——所以 `observation.interference.flags` 永远 `undefined ?? []` → 12-flag 机制**永不会触发**

这意味着 OXN Engine 当前对"信号污染"是**不可见**的，与"客观事实记录 ≠ 裁判"的核心承诺（ADR-0031 / ADR-0067）矛盾。

**父文档状态**：`.openxenon/forges/2026-06-14-probe-signal-taint-design.md v2` 已在 v0.6.1 monorepo 重组时随 `forges/` 目录归档（glob 返回空），但 5 个 Provider 源文件 import 仍标注 v2 父文档路径——形成"SSOT 缺失 + 5 个孤儿引用"的混乱状态。

**RFC-0015 D2.2 决策**：将设计落档到 `docs/adrs/0086-taint-trust-baseline-design.md`，固化 12 flag 的选取理由、Provider-Handler 接线契约、failure 降级语义。本 ADR 即 SSOT。

## Decision

### D1：12 flag 硬编码语义（vs 阈值调参哲学）

**核心断言**：信任是**系统决策，不是用户决策**（trust-baseline.ts:5-8 注释锁死）。

**反对**：阈值化配置（如 `flags.permissions=warn|error`）会引入"白名单绕过"风险——AI 可通过精细化 flag 权重调参绕过 trust baseline，进而污染 sample。OXN 是 AI 协作边界，承担"系统性保护工程师"的职责，不能把信任度开放给调用者调节。

**冻结映射**（trust-baseline.ts:23-36 直接搬入 ADR）：

| Flag | 颜色 | 短路行为 | 选取理由 |
|---|---|---|---|
| `waf_detected` | RED | INCONCLUSIVE | WAF 拦截的响应**不是业务事实**，是中间盒的副作用 |
| `cdn_cache` | YELLOW | 透传+记录 | CDN 缓存命中可作为"缓内事实"的间接证据 |
| `cache_path` | YELLOW | 透传+记录 | `.cache` / `node_modules` / `.git/objects` 是**工程内事实**，业务上合法 |
| `just_modified` | RED | INCONCLUSIVE | mtimeMs 距 now < 1000ms 必是**构建残留**，未受时间固化 |
| `symlink` | YELLOW | 透传+记录 | OXN 部署中符号链接合法（single-instance dev 容器） |
| `detached_head` | RED | INCONCLUSIVE | git HEAD detached = 工程状态**未受版本控制**，determinism 失效 |
| `shallow_clone` | RED | INCONCLUSIVE | git 历史不完整 → diff/hunk 计算不可重现 |
| `sandbox_violation` | RED | INCONCLUSIVE | shell 命令被沙箱拦截 = **实际没执行**（虚假 success） |
| `network_timeout` | RED | INCONCLUSIVE | 超时 = 没拿到响应（缺失样本不是 0 样本） |
| `response_truncated` | RED | INCONCLUSIVE | 截断 = 响应不完整（partial observation ≠ full observation） |
| `permission_denied` | RED | INCONCLUSIVE | 权限拦截 = 不可读（不可读 ≠ 不存在） |
| `unknown` | RED | INCONCLUSIVE | 未识别 flag 一律 RED（保守策略，避免新干扰源绕过） |

**新增 flag 的成本**：必须**双位置同步**：
1. `packages/engine/src/kernel/contracts/io-primitive.ts:24 InterferenceFlag` 加 union member
2. `packages/engine/src/kernel/verdicts/trust-baseline.ts:23 TRUST_BASELINE` 加映射

不可只改一处——Provider 检测到未注册 flag → 编译期无 type guard 即可绕过 baseline。

### D2：Provider ↔ Handler 接线契约

**接线关系**：
- Provider 是 L1-Infra 的 IO Primitive（statSync / readFileSync / fetch / spawn / git CLI 的封装）
- Handler 是 L1-Infra 的 Probe 物理观测（`infra/probes/index.ts` 的 probeHandlers 映射）
- Runner（Proof/runner.ts）调 handler → Kernel.judge（verdict.ts:705）→ applyTrustBaseline

**关键约束**：

1. **每个 IO-direct handler 必须调 Provider**，不得直连 `node:fs` / `fetch` / `node:child_process`
2. Provider 返回 `{ result, interference }`——**handler 必须透传 interference.flags 到 observation**：

   ```typescript
   // 范式 (infra/probes/index.ts probeHandlers 内的具体实现)
   provider: FileProvider = new FileProvider()
   handler(params, ctx) {
     const { result, interference } = await this.provider.ioStat({ path })
     return {
       probeType: 'fs_exists',
       output: result.exists ? path : '',
       interference,  // ← 必填
       executedAt: Date.now(),
     } as ProbeObservation
   }
   ```

3. **Provider 抛错（throwing 异常）/ interference.flags=undefined** → wrapper 必须填 `flags: ['unknown']` 保守策略（trust-baseline.ts:35 unknown=RED）

   ```typescript
   try {
     const { result, interference } = await this.provider.ioRead({ path })
     return { ..., interference }
   } catch (err) {
     return { ..., error: err.message, interference: { flags: ['unknown'] } }
   }
   ```

4. **ProbeObservation type 严格**（probe-port.ts:1-9）：`interference?: { flags: InterferenceFlag[] }`——handler 返回值 type assertion 需包含此字段，否则 verdict.ts:706 `?? []` 降级 silent。

### D3：Provider → InterferenceFlag 映射表

| Provider | ioStat/ioRead/ioExec 调用 | 检测的 InterferenceFlag |
|---|---|---|
| **FileProvider** | `ioStat({ path })` / `ioRead({ path })` | `symlink` (lstat.isSymbolicLink), `just_modified` (mtimeMs - now < 1000ms), `cache_path` (`/.cache\|/node_modules\|/.git/objects`), `permission_denied` (mode & 0o400 === 0) |
| **HttpProvider** | `fetch(url)` 变体 | `waf_detected` (response header X-WAF-* signatures), `cdn_cache` (response header cf-cache-status/x-cache/via), `response_truncated` (content-length > received bytes), `network_timeout` (AbortSignal.timeout), `unknown` (catch all) |
| **ShellProvider** | `spawn(command)` 变体 | `sandbox_violation` (executeShellExec validateCommand 触发 metachar), `network_timeout` (spawn timeout), `unknown` (catch all) |
| **GitProvider** | `git <command>` 变体 | `detached_head` (git symbolic-ref HEAD 非 refs/heads/), `shallow_clone` (.git/shallow 文件存在), `unknown` (catch all) |

**L0 Kernel 严格**：Provider 仍位于 L1-Infra，handler 改造**不改变** L0 的"兰姆达真空"约束（L0 仍禁 fs/net/child_process；ADR-0002 Kernel/L0）。

### D4：Handler 改造范围（RFC-0015 D2.1 边界）

**In Scope（IO-direct handler，需 Provider 接线）—— 11 handler**：

| Group | Handler kind | 数量 |
|---|---|---|
| FileProvider | `fs_exists` / `fs_not_exists` / `fs_match` / `fs_parseable` | 4 |
| HttpProvider | `http_responds` | 1 |
| ShellProvider | `shell_exec` / `sandbox` | 2 |
| GitProvider | `git_clean` / `git_branch_exists` / `git_status_clean` / `git_merge_feasible` | 4 |

**Out of Scope（non-IO-direct handler，保持现状）—— 10 handler**：

| Handler kind | 排除理由 |
|---|---|
| `deps_resolved` | 纯 JS 解析 lockfile，无 IO Provider |
| `test_pass` / `lint_check` / `ts_compiles` / `docs_build` | 走 shell 子调用；外层 shell-exec handler 的 flag 会覆盖 |
| `heading_skeleton_check` / `docs_heading_check` / `doc_boundary` | 纯 .md 文件解析（fs_match / fs_parseable 已有，但内容解析层不引入 IO flag） |
| `token_writer` | 写入 token 记录，无外部 IO |
| `file_exports` | 进程隔离 runtime import（spawn 子进程，但样本不通过 shell 表达） |

注：sandbox 和 lint-check 在某些项目中也走 shell 子调用，本 ADR 暂把 sandbox 归为**双层**——sandbox.ts 自身被 shell-exec.ts 包裹，子调用 flag 由 shell-exec handler 捕获。sandbox.ts 内部仍保持单独 handler（向后兼容）。

**重构粒度**：Wrapper 层（`infra/probes/index.ts` 的 probeHandlers 映射）调 Provider；不动底层原子 probe 函数（`fs-exists.ts` / `shell-exec.ts` / `git-clean.ts` 等），保持纯函数语义可独立测试。

## Consequences

### 正面

- **"客观事实记录"的承诺可兑现**：当前所有 12 flag 触发的污染都会让 INCONCLUSIVE 短路 → 工程师强制介入 review
- **统一的 flag 流转路径**：all 11 IO-direct handler 都经 Provider，单一接入口
- **failure 降级保守**：unknown → RED → 永不静默忽略
- **可审计性**：12 flag 硬编码在 trust-baseline.ts:23 双位置 + ADR-0086 文档一一对应，git blame 一行即知

### 负面 / 风险

- **handler 调用栈变深**：wrapper → Provider → IO Primitive 三层（vs 之前 wrapper → IO Primitive 两层）——但延迟可忽略（Provider 无 await chain）
- **Provider 实例管理**：wrapper 内 new 还是单例模式？当前选择 wrapper 内 `new FileProvider()`（file-provider.ts:56 范式），简单但非单例；D2 落地时可考虑 provider-registry.ts 单例
- **failure 降级过度保守**：当前 'unknown' RED，AI 可能因偶发 Provider 抛错全部 INCONCLUSIVE——D3.3 (RFC-0015 Phase 2) 会加 drift 监控
- **新增 flag 需双位置同步**：trust-baseline.ts + io-primitive.ts + Provider 检测点——共 3 位置（更严格约束）

### 衍生

- **RFC-0015 D2.4 e2e 测试**（tests/integration/probe-taint-flow.test.ts）作为本 ADR 的回归测试——所有 12 flag 在真实 IO 路径上都有覆盖
- **trust-baseline.ts 的 TRUST_BASELINE 数据 + 本 ADR 的 D1 表**互为冗余（trust-baseline.ts:23 是 canonical code，ADR 是 spec）——两者保持一致是 CI 守卫目标（[提案] 加 smoke test 验证所有 InterferenceFlag 都被 trust-baseline 覆盖）

## Alternatives Considered

- **可配置 flag → 颜色映射**（如 `flags.warnings=warn,errors=error`）：否决。阈值调参会让 AI 通过精细化配置绕过 baseline
- **在 handler 内独立检测 flag（不经 Provider）**：否决。检测逻辑分散会导致新增 flag 需修 11+ handler；Provider 集中检测是单一接入口
- **保持 Provider 但 handler 不透传 interference**：否决。当前就是这个状态——12 flag 永不会触发的死代码
- **引入 Provider 服务发现 + 远程配置**：否决。L1-Infra 是 terminal IO，不引入网络 + 配置层（保 L0 兰姆达真空）

## References

- [RFC-0015 Proof 体系重整](../rfcs/RFC-0015-proof-system-overhaul.md) — D2 决策源头（D2.1 handler + D2.2 ADR + D2.3 单测 + D2.4 e2e）
- [ADR-0002 Kernel/L0](./0002-kernel-l0.md) — L0 兰姆达真空约束（本 ADR 的 L0 边界依据）
- [ADR-0031 Proof 公证非裁判](./0031-proof-notary-not-judge.md) — "客观事实记录" 承诺的本源
- [ADR-0066 术语精简立法](./0066-terminology-simplification.md) — 14 维度的 7 项裁判视角裁决
- [ADR-0067 无裁判原则](./0067-no-judgment-principle.md) — `INCONCLUSIVE` 是机器 SSOT 的合法态
- [ADR-0084 协作边界分层](./0084-collaboration-boundary-layering.md) — 本 ADR 的协作边界上下文
- [trust-baseline.ts](../../packages/engine/src/kernel/verdicts/trust-baseline.ts) — 12 flag 硬编码基线（code canonical）
- [verdict.ts:706](../../packages/engine/src/kernel/verdicts/verdict.ts) — applyTrustBaseline 调用入口
- [io-primitive.ts:24](../../packages/engine/src/kernel/contracts/io-primitive.ts) — InterferenceFlag schema 定义
- [probe-port.ts:8](../../packages/engine/src/kernel/contracts/probe-port.ts) — ProbeObservation.interference 字段定义

## Errata

> 本段用于后续追加修正说明。

（暂无 errata）
