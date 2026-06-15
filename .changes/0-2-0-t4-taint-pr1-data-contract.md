# 0.2.0 — Sprint 3a T4: Probe Signal Taint v2 PR-1 数据契约骨架

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-1
> Sprint 3a 任务 T4, probe-taint v2 6 PR 系列的第 1 PR (数据契约地基)

## 变更

### 1. 新建 `src/kernel/contracts/io-primitive.ts` (~80 行)

L0-Schema 层, 纯洁性约束:
- 不得 import 任何上层 (L0-Processor / L1+)
- 不得 import 'fs' / 'net' / 'child_process' (Kernel 是兰姆达真空)

```ts
export type IOPrimitive = 'io.stat' | 'io.read' | 'io.exec'
export type InterferenceFlag = 'waf_detected' | 'cdn_cache' | 'cache_path' | 'just_modified'
  | 'symlink' | 'detached_head' | 'shallow_clone' | 'sandbox_violation'
  | 'network_timeout' | 'response_truncated' | 'permission_denied' | 'unknown'
// 12 项枚举 + IOStat/IORead/IOExec Request/Result + IOInterference
```

### 2. 扩展 `src/kernel/contracts/probe-port.ts`

```ts
export interface ProbeObservation {
  // ... 原有 5 字段
  interference?: { flags: InterferenceFlag[] }  // ← v0.2 T4 新增
}
export interface ProbeVerdict {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'  // ← v0.2 T4 新增三态 (必填)
  passed: boolean                              // 保留兼容
  // ... 原有其他字段
  interferenceFlags?: InterferenceFlag[]      // ← v0.2 T4 新增 (YELLOW 透传记录)
}
```

### 3. 新建 `src/kernel/verdicts/trust-baseline.ts` (~50 行)

```ts
export const TRUST_BASELINE: Readonly<Record<InterferenceFlag, 'RED' | 'YELLOW'>> = Object.freeze({
  waf_detected: 'RED', cdn_cache: 'YELLOW', cache_path: 'YELLOW',
  just_modified: 'RED', symlink: 'YELLOW', detached_head: 'RED',
  shallow_clone: 'RED', sandbox_violation: 'RED', network_timeout: 'RED',
  response_truncated: 'RED', permission_denied: 'RED', unknown: 'RED',
})
// 8 RED + 4 YELLOW = 12 项

export function applyTrustBaseline(flags, normalJudge): ProbeVerdict {
  // 任一 RED → 短路返回 INCONCLUSIVE (YIELD_TO_HUMAN)
  // 仅 YELLOW → 透传 + 记录
  // 无 flag → 走 normalJudge 原 logic (AC-2 透传守护)
}
```

### 4. 改造 `src/kernel/verdicts/verdict.ts:judge()`

```ts
export function judge(observation, params): ProbeVerdict {
  const flags = observation.interference?.flags ?? []
  return applyTrustBaseline(flags, () => {
    const strategy = getVerdictStrategy(observation.probeType)
    if (!strategy) {
      return { verdict: 'FAIL', passed: false, message: ..., params, failureMessage: ... }
    }
    const v = strategy(observation, params)
    return { ...v, verdict: v.passed ? 'PASS' : 'FAIL' }
  })
}
```

**同时**: 14 个 verdict strategy 全部加 `verdict: passed ? 'PASS' : 'FAIL'` (10 个用 `passed,` 模式 + 4 个用 `ok` 别名).

### 5. 修复 `src/work/probe-evaluator.ts` 5 处构造点

5 个 `return { passed: ..., message: ... }` 补 `verdict: passed ? 'PASS' : 'FAIL'` 字段.

### 6. 新增 `src/kernel/verdicts/__tests__/trust-baseline.test.ts` (17 case)

覆盖父文档 T1.5 表:
- 12 项 flag 全部映射 / Object.freeze 不可变 / 8 RED + 4 YELLOW 分桶
- 无 flag 透传 / YELLOW 透传 / 单 RED 短路 / 多 RED 短路 / 混合 RED 优先
- 未知 flag (unknown) / sandbox_violation (PR-4 触发) / permission_denied (父文档笔误修正)
- actual 字段含 redFlags + allFlags
- AC-2 透传守护: normalJudge 不被调用当 RED flag 存在

## 指标

- 测试: 1248 -> 1266 (+18: trust-baseline 17 case + retry 1)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 14 个 builtin probe 透传: 全绿 (AC-2 守护通过)
- 行为变化: ProbeVerdict 多 1 必填 verdict 字段 (typecheck 强制暴露所有旧构造点)
- 端到端 CLI work validate: 仍正常 (无回归)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| verdict 必填破坏旧构造点 | 中 | typecheck 强制暴露 + 5-10 处补全 (实测 17 处) |
| 14 个 builtin probe 透传测试 | 中 | 28/0/4 全绿 |
| permission_denied 父文档笔误 (空格→下划线) | 低 | 已修正 + 测试覆盖 |
| applyTrustBaseline 性能 | 低 | 12 flag O(1) hash 查表 |
| TRUST_BASELINE 误改 | 低 | Object.freeze + 不可变测试 |

## 关联

- 上游: T1 (t1a + t1b) + T2 + T3 已合入
- 下游 [sprint-3b]: PR-2 frozen schema 依赖 verdict 三态 + interferenceFlags 字段
- 下游 [sprint-3c]: PR-3 ProviderRegistry 依赖 InterferenceFlag 类型
- 下游 [sprint-3d]: PR-4 沙箱 CLI 依赖 sandbox_violation flag

Refs: .openxenon/forges/sprints/sprint-3a/2026-06-15-probe-taint-data-contract-pr1.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
