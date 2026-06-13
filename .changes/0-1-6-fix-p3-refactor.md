# 0.1.6 — fix-p3-refactor

> Work: `.openxenon/works/fix-p3-refactor/` (9 task, all passed)
> 来源: `.openxenon/forges/2026-06-12-code-quality-pattern-and-logic.md` (P3 + m3 + m4 + m5 + m11)

## 重构

### 1. state schema 合并 (P2)
- `src/work/state.ts`: 全文删除 (-144 行). 调研表明 state.ts 是死代码: 不被 `src/work/index.ts` 导出, 不被任何其他文件 import (除自引用), `WorkState` 类型仅出现在 `src/cli/work.ts` 注释字符串中. 真正在用的是 `dual-state.ts` 的 `WorkspaceState + TaskState`.
- 零调用方破坏 (类型 + 行为双不变).

### 2. work-migrator 拆分 (P8)
- `src/work/work-migrator.ts`: `migrateWorkToV1` 单函数 203 行拆为:
  - `migrateWorkToV1` (95 行, orchestrator + 错误分支)
  - `restoreV0ToV1Paths` (22 行, 从备份恢复到 V1 路径)
  - `regenerateV1Artifacts` (95 行, 重生成 slim 索引 + .work 出生证明)
- 引入 `InvalidRef` type alias 替代 inline union type, 消除 `MigrateResult extends ...` 复杂条件类型.
- 行为不变 (15 work-migrate e2e 测试全 pass).

### 3. 减少 as any (P5)
- `src/oxl/compiler/blueprint-compiler.ts`: 15 处 `as any` 减至 5 (-10). 修复策略:
  - `(part as any).name / .target / .action / .min_version / ._depHash / .probes` 等 → 直接 `part.X` (PartInvocationSchema 已有字段).
  - 剩余 5 处是 `new OxnCompiler(null as any)` test fixture, 故意绕过 HashPort type, 保留.
  - 修复 `DagNode.id` 兜底: `part.id || part.name || ''`.
- 零类型回归 (293 oxl 测试全 pass).

### 4. NaN predicate 显式报错 (m3)
- `src/kernel/processors/evaluate-predicate.ts`: 提取 `checkNaNOperands()` helper, gt/gte/lt/lte 4 case 各加 NaN 检测.
- 修复前: `Number(undefined) → NaN, NaN > 5 → false`, 静默 false 无法区分「实际 0」与「实际 NaN」.
- 修复后: `passed: false + message: 'NaN operand not comparable for gt: actual=undefined, expected=5'`.
- 同步更新 `src/kernel/__tests__/processors/evaluate-predicate.test.ts` 3 处断言 (passed=false + message 含 'NaN operand').

### 5. extractTarget 公共化 (m4)
- 新建 `src/kernel/verdicts/extraction.ts`, 把 `probe-stats-updater.ts:29` 与 `insight-compute.ts:32` 重复的 `extractTarget()` 函数抽公共.
- 两个 caller 改 `import { extractTarget } from './extraction'`.
- `rg 'function extractTarget' src/` 从 2 减到 1.

### 6. dirname 跨平台 (m5)
- `src/work/dual-state-exec.ts:359`: `path.substring(0, path.lastIndexOf('/'))` → `dirname(path)`.
- 兼容 Windows 路径分隔符 (path.sep 在 win32 是 `\\`).
- 同步 `import { dirname } from 'path'`.

### 7. probe-stats splice 注释修正 (m11)
- `src/kernel/verdicts/probe-stats-updater.ts:107-117`: 显式注释说明 `proofRuns` 是浅克隆副本 (`[...stats.proofRuns]` line 56), 这里的 `push` + `splice` 只动副本, 不修改入参 `stats.proofRuns` (functional update 范式).
- 代码本身已正确, 修复纯文档.

## 测试

- `bun test`: 1119/1119 pass (+1 NaN undefined 新测试, baseline 1118)
- `bun run typecheck`: 0 error
- `bun run lint`: 0 增量 (baseline 3 problems, 当前 3 problems)
- `bun run check`: 0 error 增量 (biome diff vs baseline 0 行变化)

## 验证产物

- `.openxenon/works/fix-p3-refactor/verify-output/REPORT.md` — 详细 verify 报告
- `.openxenon/works/fix-p3-refactor/.run/frozen.json` — work 终态快照
- `.openxenon/works/fix-p3-refactor/forensics/state-schema-merge.md` — schema 死代码 forensic 报告

## 范围外 (已知)

- `evaluate-predicate.test.ts` 自身含 5 处 `as any` (test fixture), 不动.
- 其他文件的 `as any` (oxn-generator 7, bundle-compiler 5, mutation-validator 4 等) — 不在本 work scope.
