# 0.1.6 — fix-p1-architecture

> Work: `.openxenon/works/fix-p1-architecture/` (7 task, all passed)
> 来源: `.openxenon/forges/2026-06-12-code-quality-pattern-and-logic.md` (P1 + m1 + m2)

## 修复

### 1. Verdict 策略统一到 L0-Kernel (P1, M1)
- `src/kernel/verdicts/verdict.ts`: 重新注册 `exec_exit_zero` (委派 `shellExecStrategy`) 与 `exec_output_match` (新实现) 到 `PROBE_VERDICT_STRATEGIES`; 补 `exec-exit-zero` / `exec-output-match` 别名到 `PROBE_VERDICT_ALIASES`。
- `src/work/probe-evaluator.ts`: 删除本地 `defaultStrategies` 重复实现, 改为从 L0 `PROBE_VERDICT_STRATEGIES` 重导出 (`const defaultStrategies = PROBE_VERDICT_STRATEGIES`)。
- 接口零变化: `evaluateProbe` / `reduceProbeResults` / `ProbeEvaluator` 调用方零感知。

### 2. IAPError 双轨制迁移 (P3, M5)
- `src/work/dual-state-exec.ts`: 移除 `class ExecError extends Error`; 改 `throwExecError(axis, oxnCode, message)` helper, 抛 `IAPError('ALIGN', 'INFRA_FAIL', AUTONOMOUS_RETRY, message, { oxnCode })`。7 个原 `OXN_*` 码完整保留, 通过 `context.oxnCode` 字段下传。
- `src/work/dual-state-io.ts`: 4 处 `throw new Error` 改 `throw new IAPError('ALIGN', 'INFRA_FAIL', YIELD_TO_HUMAN, ..., { path, cause })`。
- `src/cli/work.ts`: 2 处 `catch (err) { if (err instanceof ExecError) ... }` 改 `if (err instanceof IAPError) { ... }`, 从 `err.context.oxnCode` 提取稳定 OXN_* 错误码, 保证 CLI JSON 输出向后兼容。

### 3. work.ts:1149 regex → Langium AST (M3)
- `src/cli/work.ts:1149-1155`: 删除 `matchAll(/blueprint\s+"..."/g)` 与 `matchAll(/domain\s+"..."/g)` 两处 regex, 改 `await parseOxnFile(workFile)` + `doc.entities.filter(isBlueprintDeclaration).map(bp => bp.name)`。regex 会误匹配注释/字符串字面量, AST 不会。
- 顺手把 `add-task` subcommand 的 `run(ctx)` 改为 `async run(ctx)` 以支持 await。

### 4. DAG edges 校验 (m2)
- `src/kernel/processors/dag.ts`: 现有校验只检查 `node.deps`, 当显式传 `edges` 参数时, 上方 if (edges) 分支用 `continue` 静默跳过无效 edge。新增额外循环: 对每个 `edge.from` / `edge.to` 检查是否在 `nodeIds` 集合, 不在则 push 到 errors。
- `src/kernel/__tests__/processors/dag.test.ts`: 1 个旧测试「edges 含不存在节点 → valid=true 静默跳过」改为「valid=false + errors 含 non-existent」(反映修复后正确行为); 新增 2 个测试: edges from 引用不存在 / edges to 引用不存在。

### 5. Loader draft 路径一致性 (m1)
- `src/infra/loader.ts` `resolveAssetPath`: 非 blueprint 类型 + state=draft 时, 优先查询 `arsenal/<type>/drafts/<name>/draft.oxn` (sub-dir 布局, 与 `scanArsenalStructure` 主路径一致, 允许未来装 invariants.yaml / tests/ 等子资源), 旧 flat 布局 `arsenal/<type>/drafts/<name>.oxn` 保留为 fallback (向下兼容已有项目)。

## 测试

- `bun test`: 1100/1100 pass (含 17 dag 测试, 93 work CLI e2e, 248 CLI 测试, 109 work 测试, 83 infra 测试, kernel/verdicts 已覆盖)
- `bun run typecheck`: 0 error
- `bun run lint`: 0 增量 (baseline 3 problems, 当前 3 problems)
- `bun run check`: 0 增量 (baseline 0 errors, 当前 0 errors; 警告/信息数 0 增量, 仅行号偏移)

## 验证产物

- `.openxenon/works/fix-p1-architecture/verify-output/REPORT.md` — 详细 verify 报告
- `.openxenon/works/fix-p1-architecture/.run/frozen.json` — work 终态快照
- `.openxenon/works/fix-p1-architecture/forensics/verdict-strategy-diff.md` — 策略差异 forensic 报告

## 范围外 (已知设计权衡)

- `src/cli/work.ts:2226` 仍使用 regex (`readWorkFile` slim parser, 用于 buildPerWorkBlueprintsIndex)。这是有意保留 — slim parser 在每次 lock 守卫跑, 替代全 Langium AST 解析, 避免 10-100x lock 性能回退。
