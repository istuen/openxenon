# 0.2.0 — Sprint 3b T5: Probe Signal Taint v2 PR-2 frozen.json 三态 schema + CLI 展示

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-2
> Sprint 3b 任务 T5, probe-taint v2 6 PR 系列的第 2 PR (frozen.json 落地 + CLI)
> 前置: T1+T2+T3+T4 已合入主分支

## 变更

### 1. Schema 三态扩展 `src/kernel/schemas/proof-schema.ts`

```ts
// FrozenProofProbeResult:
verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE'])  // ← v0.2 T5 必填
interferenceFlags?: z.array(InterferenceFlagZodEnum)    // ← v0.2 T5 可选

// FrozenProof:
verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE'])  // 原 2 态 → 3 态
```

**修正**: 12 项 InterferenceFlag zod enum 中 `'permission denled'` (笔误, 空格) → `'permission_denied'`, 与 `io-primitive.ts` 对齐.

**同层 schema 同步 3 态**:
- `src/kernel/schemas/insight-schema.ts` `InsightSchema.proof.verdict`: 2 态 → 3 态
- `src/kernel/schemas/probe-stats-schema.ts` `ProbeRunRecordSchema.verdict`: 2 态 → 3 态

### 2. Writer 三态聚合 `src/cli/proof-frozen-writer.ts:buildFrozenProof`

```ts
const verdict =
  totalCount === 0      ? 'FAILED'
: inconclusiveCount > 0 ? 'INCONCLUSIVE'
: passedCount === total ? 'PASSED'
                        : 'FAILED'
```

**容错补全**: 老 caller / 老 test fixture 只传 `passed`, 缺 `verdict`; 按 `passed` 推断二态.

**修正**: `failedCount = totalCount - passedCount` → `totalCount - passedCount - inconclusiveCount` (避免 INCONCLUSIVE 被重复扣).

### 3. Reader hash 关键 bug 修复 `src/infra/frozen/immutable.ts:109-117`

```diff
- const { _xenon_meta, ...body } = result  // ← zod re-emit 按 schema 声明顺序重排 key
- const expectedHash = sha256(JSON.stringify(body))
+ const { _xenon_meta: _rawMeta, ...rawBody } = parsed  // ← raw JSON, 保留原始 key 顺序
+ const expectedHash = sha256(JSON.stringify(rawBody))
```

**根因**: writer 端 `JSON.stringify(body)` 用 caller 传入的 key 顺序 (compact, `probeName/ref/passed/durationMs/verdict`); reader 端 zod `safeValidateFrozenProof` 把 body re-emit 时按 zod schema 声明顺序 (`probeName/ref/verdict/passed/...`), key 顺序不一致 → hash 不一致 → `signature mismatch`.

**影响**: 这是 T4 之后**首个发现并修复的 hash 兼容 bug**. 修复前 4 个 `writeFrozenProof` 测试 + 1 个 `tamper-detect` 测试 fail; 修复后 20/20 全绿.

### 4. CLI 3 态展示 `src/cli/proof.ts:renderShowHuman`

- 3 态 emoji: ✅ (PASSED) / ❌ (FAILED) / ⚠️ (INCONCLUSIVE)
- TTY 色彩降级: 绿/红/黄 (chalk ANSI), `process.stdout.isTTY === true` 才启用
- probe 行展示 `verdict` + `interferenceFlags` 列表
- `oxn proof show <name>` 同步升级

### 5. 新增测试 (8 case 总)

`src/kernel/schemas/__tests__/frozen-proof-shape.test.ts` (5 case, 父文档 T2.3):
1. 读老 frozen.json (无 verdict 字段) — 验签行为记录
2. 写新格式 (3-state verdict + interferenceFlags) — 验签 OK
3. INCONCLUSIVE 写读 round-trip
4. 老 content_hash 兼容 (v0.1.x 时代手写 hash) 仍可读取
5. 新字段 interferenceFlags 加入后 schema 接受, content_hash 变化但两次写入合法

`src/cli/__tests__/proof.test.ts` 扩展 (3 case):
- PASSED 渲染含 ✅ + "PASSED (1/1)"
- FAILED 渲染含 ❌ + errorMessage
- INCONCLUSIVE 渲染含 ⚠️ + flags 列表

### 6. 文档 (中英双 SSOT)

`docs/en/proof.md` + `docs/zh-cn/proof.md` 新增 "Verdict 三态 (3-state verdict, v0.2 Sprint 3b T5)" 章节:
- 3 态含义表 (verdict / 含义 / 颜色 / 图标)
- 聚合规则 (任一 INCONCLUSIVE → 整体)
- interferenceFlags 行为 (YELLOW-tint 记录, 不 auto-fail, 整体抬到 INCONCLUSIVE)
- `oxn proof show` 引用

## 指标

- 测试: 1266 → 1273 (+7: 5 frozen-proof-shape + 3 renderShowHuman - 1 retry 净增)
- biome: 0 warnings
- L0–L3 依赖违规: 0 (validate-dependencies.ts 244 文件 763 imports 0 violations)
- 14 个 builtin probe 透传: 不变 (T5 不动 verdict strategies)
- 行为变化: frozen.json `verdict` 字段从 2 态升级为 3 态; 老 `permission_denied` 笔误修正
- 端到端 CLI work run + proof show: 仍正常 (无回归)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| hash 兼容性 (老 reader 验签) | 中 | 已修复, raw hash 不依赖 zod key 顺序 |
| 老 frozen.json (2 态 verdict) 读取 | 中 | schema 必填 verdict → 老文件 fail 验签; 由 T7 PoC 阶段 migration shim 提供向后兼容 |
| TTY 色彩跨平台 (Windows console) | 低 | isTTY 检测 + 色彩降级 |
| renderShowHuman 测试需 round-trip (写+读拿 _xenon_meta) | 低 | test helper `buildAndRoundtrip` 封装 |
| 2 个 pre-existing work-run-diagnostics e2e flake | 低 | 单跑通过; 不在 T5 范围 |

## 关联

- 上游: T1 (t1a+t1b) + T2 + T3 + T4 已合入主分支
- 下游 [sprint-3c]: PR-3 ProviderRegistry 依赖 frozen.json 3 态 schema
- 下游 [sprint-3d]: PR-4 沙箱 CLI 依赖 `sandbox_violation` flag + INCONCLUSIVE verdict

Refs: .openxenon/forges/sprints/sprint-3b/2026-06-15-probe-taint-frozen-verdict-pr2.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
