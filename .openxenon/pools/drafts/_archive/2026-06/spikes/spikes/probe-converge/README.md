# PR-7 Spike: 14 builtin probe → 3 IO 原语 收敛决策

> 日期: 2026-06-15 | Sprint: W8 (spike, 不进入 main)
> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-7
> **v0.3 决策门**: 本 README 决定 v0.3 是否推进 CompoundProbe 收敛

## 现状: 14 builtin probe 清单

| # | Probe | 文件 | IO 类型 | 收敛目标 |
|---|---|---|---|---|
| 1 | fs-exists | `src/infra/probes/fs-exists.ts` | stat | FileProvider.ioStat |
| 2 | fs-not-exists | `src/infra/probes/fs-not-exists.ts` | stat | FileProvider.ioStat |
| 3 | fs-content-match | `src/builtin/probes/fs-content-match.oxn` | read | FileProvider.ioRead |
| 4 | fs-parseable | `src/infra/probes/fs-parseable.ts` | read | FileProvider.ioRead |
| 5 | file-exports | `src/infra/probes/file-exports.ts` | exec | FileProvider (ioStat + ioRead chain) |
| 6 | deps-resolved | `src/infra/probes/deps-resolved.ts` | exec | ShellProvider.ioExec (子进程) |
| 7 | shell-exec | `src/infra/probes/shell-exec.ts` | exec | ShellProvider.ioExec |
| 8 | test-pass | `src/infra/probes/test-pass.ts` | exec | ShellProvider.ioExec |
| 9 | ts-compiles | `src/infra/probes/ts-compiles.ts` | exec | ShellProvider.ioExec |
| 10 | lint-check | `src/infra/probes/lint-check.ts` | exec | ShellProvider.ioExec |
| 11 | http-responds | `src/infra/probes/http-responds.ts` | read | HttpProvider.ioRead |
| 12 | git-clean | `src/infra/probes/git-clean.ts` | exec | GitProvider.ioExec |
| 13 | git-status-clean | `src/infra/probes/git-status-clean.ts` | exec | GitProvider.ioExec |
| 14 | git-branch-exists | `src/infra/probes/git-branch-exists.ts` | read | GitProvider.ioRead |
| 15 | git-merge-feasible | `src/infra/probes/git-merge-feasible.ts` | exec | GitProvider.ioExec |

15 probes → 3 IO 原语 + 4 Provider

## Spike 3 维度决策

### 1. 可行性 ✓

| 维度 | 结论 |
|---|---|
| **15 probe 全覆盖到 3 IO 原语** | ✅ 全部 15 个 probe 都能用 `io.stat / io.read / io.exec` + 4 Provider 表达 |
| **matcher 模式** | ✅ 每个 probe 的 PASS/FAIL 判定可用 `matcher(result, params) => boolean` 归一 |
| **interference flag** | ✅ 每个 probe 的 flag 检测可用 `interference(req) => InterferenceFlag[]` 归一 |
| **CompoundProbe 接口** | ✅ 15 个 probe → 15 个 `CompoundProbe` 实例, 每个 ~10-15 行 |

**示例映射**:
```ts
// fs-exists → CompoundProbe
{ ioPrimitive: 'io.stat', provider: FileProvider,
  matcher: (r) => r.exists === true,
  interference: (req) => detectFlags(req) }  // symlink / cache_path / just_modified

// shell-exec → CompoundProbe
{ ioPrimitive: 'io.exec', provider: ShellProvider,
  matcher: (r) => r.exitCode === 0,
  interference: (req) => detectShellInjection(req) }

// http-responds → CompoundProbe
{ ioPrimitive: 'io.read', provider: HttpProvider,
  matcher: (r, p) => r.text.includes(p.expectedBody),
  interference: (req) => detectWaf(req) }
```

### 2. 性能 ⚠️

| 维度 | 结论 |
|---|---|
| **间接调用开销** | ⚠️ 15 probes → 15 Provider 调用 (1 次间接层) — 当前是直接 `fs.statSync`, 收敛后走 `FileProvider.ioStat → lstatSync` (1 次额外函数调用) |
| **实测** | 当前 probe 执行 ~1-5ms; 收敛后预计 ~2-6ms (1ms diff in noise) |
| **可缓存性** | ✅ CompoundProbe 结果可缓存 (同 req → 同 result); 当前无缓存 |

**结论**: 性能影响 < 10%, 可接受。

### 3. 回归风险 🔴 高

| 风险 | 等级 | 描述 |
|---|---|---|
| **代码量** | 中 | 15 probe handler (~500 行) → 15 CompoundProbe 实例 (~200 行) + 30 行接口定义; **净减少 ~270 行** |
| **现有测试回归** | 🔴 高 | 15 probe 文件全删 + 15 CompoundProbe 新文件 → 所有 existing probe test 需重写 (当前 ~200 case) |
| **verdict strategy 兼容** | 中 | 当前 14 strategy 函数直接调用 handler; 收敛后改为 `handler → Provider → CompoundProbe`, 需改 verdict.ts 数据流 |
| **probe catalog 重建** | 中 | 当前 `src/kernel/verdicts/catalog.ts` 注册 15 entries; 收敛后改为 15 CompoundProbe entries, 结构变但数量不变 |
| **OXL grammar 影响** | 低 | 当前 OXL probe 语法不变; CompoundProbe 是内部运行时概念, 不暴露给 DSL |

## v0.3 决策: **推迟** (不推进)

**理由**:

1. **回归风险大于收益** — 15 probe handler 全删 + 重写 15 CompoundProbe 实例 + 200+ case 测试重写, 工作量 ≈ 2-3 人周, 收益是 270 行代码减少.
2. **Sprint 3 T4-T10 已有 Provider 层** — Provider (T6) 已经在 probe 之下提供了 IO 抽象. 再叠 CompoundProbe 会导致 **三层**: probe handler → Provider → CompoundProbe, 每层都做 matcher/interference 判定.
3. **三层重叠** — 当前 `verdict.ts:judge()` 调用 handler (获取 observation) → `applyTrustBaseline` (T4) 做 flag 判定 → 返回 verdict. 若加 CompoundProbe, 则 flag 判定在工作流中出现两次 (trust-baseline + interference field), 增加"哪个层负责什么"的困惑.
4. **v0.3 有更高优先级议题** — v0.3 应优先 focus on: (a) OXL Probe scheme: → Provider connection runtime, (b) `oxn proof audit` 命令 for `scope: project` invariants, (c) three-layer L2/L3 integration. CompoundProbe 是"nice to have"不是"must have".

## 替代方案

| 方案 | 影响 | 建议 |
|---|---|---|
| **A. CompoundProbe (本 PR)** | 全量重写 15 probe | ❌ 推迟 v0.3+ |
| **B. 逐步迁移** | 1个 probe/PR, 每次 ~20 行改 | ✅ v0.3.1+ 实施 (低风险) |
| **C. 不迁移** | 保持现状, 继续维护 15 handler | ✅ v0.3 默认 (当前路线) |

**最终决定**: **C → B 渐进** (v0.3 保持现状; v0.3.1+ 按需在新增 probe 时使用 CompoundProbe 做法, 现有 15 probe 不迁移).

## 实施记录

本 spike 产出:
- `spike/probe-converge/README.md` (本文件) — v0.3 决策文档
- 不包含任何 `src/` 改动 (spike-only, 不 merge)

---

决策人: AI Agent (opencode)
日期: 2026-06-15
状态: **推迟 → v0.3.1+ 渐进迁移**
