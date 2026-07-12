---
title: 证明
---

# 证明（E3 · Engine 独立公证）

> **Proof 是 OXN 的第三结构实体（E3）——OXN Engine 的独立公证**，由 `frozen.json`（机器 SSOT）+ `verdict.md`（人类 SSOT）+ `probe-stats.json`（全局索引）三层证据构成。
> v0.6 起 `oxn proof` 是独立子命令（不再依赖 `oxn work finalize` 触发），但 Proof 仍可在 Work 内作为 Proof 模式（Align 阶段的探针断言）。

> **OpenXenon —— 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**

## 1. Proof 概念

### 1.1 哲学边界

OXN 的终极目标不是"spec 与实现一致"，而是**独立第三方对 AI Agent 工作结果做不可篡改的客观公证**：

```
工程师                AI Agent              OXN Engine
  │                    │                       │
  ▼                    ▼                       ▼
Intent                Align                   Proof
Domain(.md)           Work(.md)              frozen.json
Blueprint(.md)        Task → Artifact        Verdict (事实记录)
  │                    │                       │
  └────── 协作流水线 ──────┴────── 信任基座 ──────┘
```

> **Proof = 公证人，不是裁判**。OXN Engine 记录"发生了什么"（脚本退出码、测试覆盖率、文件路径等客观事实），不评判"工作合格不合格"。"合格"判定属于工程师——基于 Asset 与 Proof 的对照。

### 1.2 关键不变量

1. **AI / 工程师禁手改 `frozen.json`**——唯一写权在 `packages/engine/src/Proof/proof-frozen-writer.ts`
2. **三层不可篡改机制**：
   - OS 层：`chmod 0o444`（写后只读）
   - 内容层：`_xenon_meta.content_hash` = SHA-256（self-excluding 协议）
   - 验证层：`oxn proof verify` 可重新比对 hash
3. **机器 + 人类双 SSOT**：
   - `frozen.json`（uppercase verdict：PASSED / FAILED / INCONCLUSIVE —— **探针运行结果客观记录**，非质量判定）
   - `verdict.md`（lowercase 友好：pass / fail / inconclusive —— frozen.json 的可读视图）
   - 两者同步写、同步锁、含 cross-reference hash

---

## 2. 物理布局

```
.openxenon/proofs/<proof-name>/
├── proof.md                       (0o644, 可编辑 — Probe 声明源)
├── frozen.json                    (0o444, 机器 SSOT — verdict 判决书)
├── verdict.md                     (0o444, 人类 SSOT — frozen.json 的可读视图)
├── .running.json                  (运行时暂存 — run 期间存在，结束后删除)
├── proof.md                       (v0.4 PR-B Q4-A — work.md 不可变快照)
└── work-hash.txt                  (proof.md 的 SHA-256)
```

### 全局跨 Proof 索引

```
.openxenon/.cache/probe-stats.json  (所有 Probe 的历史统计)
```

### Work ↔ Proof 关联

```
domain.invariant { script = "..." | manual = "..." | scope = "work/domain/project" }
                                                          ↓
                                          evaluateDomainProof(domain, invariant, ...)
                                                          ↓
                                          PASS / FAIL / INCONCLUSIVE / MANUAL_PENDING
```

---

## 3. frozen.json (机器 SSOT)

### 3.1 Schema（packages/engine/src/kernel/schemas/proof-schema.ts）

```ts
FrozenProof {
  name: string
  runAt: string (ISO 8601)
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'  // 3-state（uppercase）
  totalCount: number
  passedCount: number
  failedCount: number
  probes: FrozenProofProbeResult[]
  _xenon_meta: {
    frozen_at: string
    content_hash: sha256 (64-hex, self-excluding 协议)
  }
}

FrozenProofProbeResult {
  probeName: string
  ref: string                       // 形如 '@oxn/probes/fs-exists'
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'  // 3-state
  passed: boolean                   // 兼容字段（PASSED → true）
  output: unknown                   // ProbeObservation + ProbeVerdict
  errorMessage?: string
  durationMs: number
  interferenceFlags?: InterferenceFlag[]  // 12 enum (YELLOW flag 透传)
}
```

### 3.2 不可篡改机制

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  frozen.json 三层不可篡改 (v0.6.1-alpha.0)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. chmod 0o444           写后只读（root 可绕过）                            │
│  2. _xenon_meta.content_hash = SHA-256(content 排除 hash 行)               │
│     设计哲学: hash 是内容的指纹，self-excluding                            │
│  3. 写权独占: 仅 packages/engine/src/Proof/proof-frozen-writer.ts 可写      │
│     AI / 工程师禁手改                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 实际示例

```json
{
  "name": "check-deploy",
  "runAt": "2026-07-02T03:30:18.441Z",
  "verdict": "PASSED",
  "totalCount": 1,
  "passedCount": 1,
  "failedCount": 0,
  "probes": [
    {
      "probeName": "p1",
      "ref": "@oxn/probes/fs-exists",
      "verdict": "PASSED",
      "passed": true,
      "output": {
        "observation": {
          "probeType": "fs_exists",
          "output": "/Users/issac/tmp/oxn-v060-test/.openxenon/config.json",
          "executedAt": 1782963018440
        },
        "verdict": {
          "passed": true,
          "verdict": "PASS",
          "message": "fs-exists: hit 1 file(s) >= expected 1",
          "actual": ["/Users/issac/tmp/oxn-v060-test/.openxenon/config.json"],
          "params": { "pattern": ".openxenon/config.json" },
          "duration": 1782963018440
        }
      },
      "durationMs": 1
    }
  ],
  "_xenon_meta": {
    "frozen_at": "2026-07-02T03:30:18.441Z",
    "content_hash": "1ef96e6c1c5ab3e4a88a28dd374212e749fd21ea6300b3155ff947d1a6780477"
  }
}
```

### 3.4 3 态命名分层

| 视图层 | verdict 大小写 | 例 | 说明 |
|---|---|---|---|
| **Kernel ProbeVerdict**（接口契约） | uppercase（无 -ED） | `PASS` / `FAIL` / `INCONCLUSIVE` | Kernel 层纯函数判定 |
| **frozen.json**（机器 SSOT） | uppercase（带 -ED） | `PASSED` / `FAILED` / `INCONCLUSIVE` | JSON Schema 枚举值惯例 |
| **verdict.md**（人类 SSOT） | lowercase | `pass` / `fail` / `inconclusive` | 平易近人 |

**映射边界**：`buildFrozenProof` 在 compile/run 边界做转换（`ProbeVerdict.PASS` → `verdict: 'PASSED'`）。

---

## 4. verdict.md (人类 SSOT)

### 4.1 完整示例

```markdown
---
proof_id: check-deploy
verdict: PASSED
run_at: 2026-07-02T03:30:18.441Z
frozen_hash: 1ef96e6c1c5ab3e4a88a28dd374212e749fd21ea6300b3155ff947d1a6780477
probe_count: 1
passed_count: 1
failed_count: 0
content_hash: a6a8f7a98a8c343e405c207e09e442c8c72f7156f1e27547156035db7d975870
---

# Proof: check-deploy

> **Verdict**: ✅ PASSED (1/1 probes passed)
> **Run at**: 2026-07-02T03:30:18.441Z
> **Frozen**: `frozen.json` (SHA-256: `1ef96e6c1c5ab3e4a88a28dd374212e749fd21ea6300b3155ff947d1a6780477`)

## Evidence

- ✅ **p1** `@oxn/probes/fs-exists` `.openxenon/config.json` (PASSED, 1ms)

## Verdict Summary

| Metric | Value |
|--------|-------|
| Total probes | 1 |
| Passed | 1 |
| Failed | 0 |
| **Overall verdict** | **PASSED** |

## Interference

_(none detected)_
```

### 4.2 Frontmatter 字段语义

| 字段 | 含义 |
|---|---|
| `proof_id` | proof 名（与目录名 / frozen.json `name` 一致） |
| `verdict` | 3-state（PASSED/FAILED/INCONCLUSIVE）—— **探针运行结果客观记录，非"工作合格"判定** |
| `run_at` | ISO 8601 时间戳 |
| `frozen_hash` | 交叉引用 `frozen.json` 的 `_xenon_meta.content_hash` |
| `probe_count` / `passed_count` / `failed_count` | 聚合统计 |
| `inconclusive_count` | 仅当 > 0 时出现 |
| `content_hash` | verdict.md 自身的 SHA-256（self-excluding 协议） |

### 4.3 签名协议

```
canonical_body = full_body - (frontmatter 内的 content_hash 行)
content_hash   = SHA-256(canonical_body)

签名前 body 形态：content_hash 字段为占位符 '__PLACEHOLDER__'
签名后 body 形态：content_hash = SHA-256(canonical_body) 替换占位符
验签时：reader 拿到的 body 含真实 hash，先剥掉 content_hash 行再算 hash 比对
```

---

## 5. probe-stats.json (全局 Probe 历史)

### 5.1 实际示例

```json
{
  "schemaVersion": 1,
  "projectRoot": "/Users/issac/tmp/oxn-v060-test",
  "probes": {
    "fs-exists": {
      "totalCount": 2,
      "passCount": 1,
      "failCount": 1,
      "lastRun": "2026-07-02T03:30:33.273Z",
      "targets": {
        ".openxenon/config.json": {
          "total": 1,
          "pass": 1,
          "fail": 0,
          "consecutiveFails": 0,
          "lastRun": "2026-07-02T03:30:18.441Z"
        },
        "/nonexistent-path-xyz": {
          "total": 1,
          "pass": 0,
          "fail": 1,
          "consecutiveFails": 1,
          "lastRun": "2026-07-02T03:30:33.273Z"
        }
      }
    }
  }
}
```

### 5.2 写入触发

每次 `oxn proof run` 完成时（写 frozen.json 之后），自动 merge 到全局 probe-stats.json：

```ts
// packages/cli/src/commands/proof.ts (runSubcommand 末尾)
const statsPath = join(projectRoot, BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
const existing = readProbeStatsFromFile(statsPath) ?? emptyProbeStats(projectRoot)
const updated = updateProbeStats(existing, frozen)  // 纯函数 merge
writeProbeStatsToFile(statsPath, updated)
```

写失败**不影响** frozen.json 主流程（仅 stderr warning）。

---

## 6. 工程师查阅的 5 种方式

### 6.1 方式 1：直接读 `verdict.md`（最简）

```bash
cat .openxenon/proofs/check-deploy/verdict.md
```

**优势**：人类可读，含 emoji + 表格 + cross-reference frozen.json。

### 6.2 方式 2：`oxn proof show <name>`（CLI 人类视图）

```bash
oxn proof show check-deploy
```

输出示例（`renderShowHuman`，含 TTY 色彩降级）：

```
⚠️ Warning: .running.json residue found — last run may have crashed; verdict from previous frozen.json
📄 Human-readable verdict: /Users/issac/tmp/oxn-v060-test/.openxenon/proofs/check-deploy/verdict.md

Proof: check-deploy
Verdict: ✅ PASSED (1/1)
Run at: 2026-07-02T03:30:18.441Z
Signature: 1ef96e6c1c5ab3e4a88a28dd374212e749fd21ea6300b3155ff947d1a6780477

Probes:
  ✅ p1 (@oxn/probes/fs-exists) — PASSED, 1ms
```

**特性**：
- **TTY 彩色**：PASSED=绿 / INCONCLUSIVE=黄 / FAILED=红
- **非 TTY**：仅 emoji（管道 `| cat` 仍可读）
- **emoji 与色彩互为冗余**：TTY / 非 TTY 都可一眼区分
- **⚠️ 检测 .running.json 残留**：防上次 run 崩溃
- **📄 提示 verdict.md 路径**

### 6.3 方式 3：`oxn proof show --json`（机器视图）

```bash
oxn proof show check-deploy --json
```

返回结构化 JSON（含 `signatureValid` / `inProgress` / `hasVerdict` / `verdictPath`），供 dashboard / CI 消费。

### 6.4 方式 4：`oxn proof verify <name>`（证据完整性检查）

```bash
oxn proof verify check-deploy
```

**两层校验**：

1. **frozen.json 自身 hash 完整性**（v0.6.1-alpha.0 #5-1 新增）
   - 重新算 SHA-256 → 比对 `_xenon_meta.content_hash`
   - 不匹配 → `E_PROOF_HASH_DRIFT` 抛错
2. **proof ↔ work 快照一致性**（v0.4 PR-B Q4-A）
   - 读 `proof.md`（work.md 不可变快照）+ `work-hash.txt`
   - 重算 live work.md SHA-256
   - 三种状态：

| 状态 | 含义 | 错误码 |
|---|---|---|
| `match` | 证据一致，proof 可信 | — |
| `drift` | work.md 已被 AI 改动（旧 proof.md 快照是唯一可信证据） | `E_PROOF_WORKHASH_DRIFT` |
| `no-snapshot` | proof 从未 run 过 | `E_PROOF_NO_SNAPSHOT` |
| `no-target` | proof.md 缺 `// proofs-target-work:` 注释（无快照机制） | — |
| `work-missing` | 注释指向的 work.md 不存在 | `E_PROOF_WORK_MISSING` |

### 6.5 方式 5：`oxn proof list`（全局浏览）

```bash
oxn proof list            # human-readable
oxn proof list --json     # 机器消费
```

列出所有 Proof + verdict + 概要。

---

## 7. Probe 执行链路（Infra + Kernel 分离）

```
proof.md → proofProbesToIR() → ProofProbeIR { probeName, ref, params }
                                     ↓
runSubcommand (loop per probe)
                                     ↓
resolveProbeKind(ref) → internalRef
  - "@oxn/probes/fs-exists" → "fs_exists" (catalog 默认)
  - "@oxn/probe/fs-exists"  → "fs-exists" (旧别名)
  - 内置 alias: shell-exec → shell_exec, fs-content-match → fs_match, ...
                                     ↓
getProbeHandler(internalRef) (L1-Infra: infra/probes/)
  - fs_exists.ts / shell_exec.ts / git_* / http_get.ts ...
                                     ↓
executeProbe(ir, context)
                                     ↓
Infra: executeObservation() → 物理观测 (e.g. fs.stat)
                                     ↓
Kernel: judge() → ProbeVerdict (3-state PASS/FAIL/INCONCLUSIVE)
                                     ↓
FrozenProofProbeResult { probeName, ref, verdict, passed, output, durationMs }
                                     ↓
buildFrozenProof → frozen.json (chmod 0o444)
                                     ↓
writeVerdictMd → verdict.md (chmod 0o444)
                                     ↓
updateProbeStats → probe-stats.json (atomic)
```

### 7.1 12 个 InterferenceFlag（YELLOW 信号）

| Flag | 含义 |
|---|---|
| `waf_detected` | WAF 拦截请求 |
| `cdn_cache` | CDN 缓存命中 |
| `cache_path` | 缓存路径命中 |
| `just_modified` | 目标文件刚被改 |
| `symlink` | 目标为软链 |
| `detached_head` | Git detached HEAD |
| `shallow_clone` | Git shallow clone |
| `sandbox_violation` | 沙箱违规 |
| `network_timeout` | 网络超时 |
| `response_truncated` | 响应被截断 |
| `permission_denied` | 权限不足 |
| `unknown` | 未知干扰 |

---

## 8. CLI 子命令完整清单（11 个）

| 子命令 | 功能 |
|---|---|
| `create <name>` | 建 proof 空间（写 proof.md 模板） |
| `list` | 列出所有 Proof |
| `describe <name>` | 描述 proof.md 元信息 |
| `probe` (parent) | Probe 管理 sub-tree |
| ├─ `probe list` | 列出可用 Probe catalog |
| ├─ `probe describe <probe>` | 描述单个 Probe（输入/输出/示例） |
| └─ `probe add <proof> <probe> --input-json` | 添加 Probe 到 proof.md |
| `run <name>` | 跑证明（生成 frozen.json + verdict.md + 更新 probe-stats.json） |
| `verify <name>` | 验证 frozen.json hash + work.md 一致性 |
| `show <name>` | 显示 verdict 详情（含 frozen.json + verdict.md 引用） |

### 8.1 run 子命令详细流程

```
Phase 0.5 (v0.4 PR-B Q4-A):
  1. 读 proof.md 注释 '// proofs-target-work: <path>'
  2. 计算 work file SHA-256 (work.md)
  ...
  缺注释 → 跳过
  work file 缺失 → OXN_PROOF_WORK_MISSING

Phase 1 (v0.1.3 PR-2):
  写 .running.json（self-ref probe 可见）
  残留检测：上一轮 run Phase 2/3 崩溃 → 直接覆盖

Phase 2:
  for each ProbeIR:
    resolveProbeKind(ref) → internalRef
    executeProbe(ir, context) → FrozenProofProbeResult
  → buildFrozenProof → writeFrozenProof (chmod 0o444)
  → unlink .running.json (失败保留, 供 list/show 检测)

Phase 3.5 (v0.5 PR-A):
  writeVerdictMd → verdict.md (chmod 0o444)
  失败 → stderr warning (不阻断)

Phase 4 (v0.1.2):
  updateProbeStats → probe-stats.json (atomic)
  失败 → stderr warning (不阻断)
```

### 8.2 错误码

| 错误码 | 触发 |
|---|---|
| `OXN_PROOF_PARSE_FAILED` | proof.md 解析失败 |
| `OXN_PROOF_EMPTY` | proof 无 probe 声明 |
| `OXN_PROOF_WORK_MISSING` | `proofs-target-work` 指向不存在 |
| `OXN_PROOF_NOT_FOUND` | proof 未创建 |
| `OXN_PROOF_NOT_RUN` | proof 未 run（frozen.json 缺失） |
| `E_PROOF_HASH_DRIFT` | frozen.json 自身 hash 失配 |
| `E_PROOF_WORKHASH_DRIFT` | work.md drift |
| `E_PROOF_NO_SNAPSHOT` | 无 snapshot（proof 从未 run） |
| `OXN_PROBE_NOT_FOUND` | probe add 时 ref 不存在 |

---

## 9. 反模式

- ❌ AI / 工程师手改 `frozen.json`（OS 层 0o444 拦不住 root，但 hash 失配 `E_PROOF_HASH_DRIFT`）
- ❌ `oxn proof run` 不带 work file 引用（无快照机制，verify 报 `no-target`）
- ❌ 用 `oxn proof run` 跑非 Probe 类型的"验收"（probe 必须用 `infra/probes/` catalog）
- ❌ 把 `verdict.md` 当成"可二次修改的人类文档"——它是 frozen.json 的 deterministic render
- ❌ 在 `INCONCLUSIVE` 状态下宣称 PASS（必须 re-run 直至 3-state 收敛）

---

## 10. Probe 五级参数优先级链（ADR-0002）

### 10.1 Probe 默认值规则

| 字段类型 | 是否允许 default | 原因 |
|---|---|---|
| Probe `required` 字段 | ❌ 禁 default | 强制调用者显式传入 |
| Probe `optional` 字段 | ✅ 允许 default | 提供合理回退 |

### 10.2 五级参数优先级链（从高到低）

1. `Task --param key=value`（命令行最高优先）
2. `parts[].params`（Part 实例化覆盖）
3. 顶级 `params`（Blueprint 显式）
4. `Part` schema default
5. `Probe` schema default（最低）

### 10.3 编译期校验

OXL 编译期校验 required 字段**必须**在五级链中有显式来源，否则编译报错。

## 11. Proof = 公证人 ≠ 裁判（ADR-0031）

### 11.1 公证人做什么

- ✅ 记录"发生了什么"（命令 / 退出码 / stdout / stderr）
- ✅ 在 hash 校验基础上证明"数据未被篡改"
- ✅ 输出可重现的 verdict（基于已定义规则）

### 11.2 公证人不做什么

- ❌ 评判"代码质量" / "设计好坏"
- ❌ 预测"未来风险"
- ❌ 自主决定"该不该 merge"

### 11.3 决策权归属

| 决策 | 归属 |
|---|---|
| 代码是否合并 | 工程师（或 PR reviewer AI） |
| Probe 是否失败 | 公证人（仅基于事实判定） |
| 业务是否正确 | 人类 |

> slogan 印证：**OpenXenon 不生产代码，只生产信任。**

### 11.4 与 E4 Insight 的边界

| E3 Engine（Proof） | E4 Insight |
|---|---|
| 还原论：单 Probe 行为 | 整体论：跨 Probe 模式 |
| 客观事实判定 | 行为特征信号 |
| 永不自主回写 Asset | 可经 audit pool approve 回写 Asset |

---

## 12. 关键代码路径索引（v0.6.1-alpha.0）

| 文件 | 角色 |
|---|---|
| `packages/engine/src/Proof/index.ts` | 引擎层 Proof API barrel |
| `packages/engine/src/Proof/runner.ts` | `executeProbe()` + `resolveProbeKind()` |
| `packages/engine/src/Proof/proof-frozen-writer.ts` | `buildFrozenProof` + `writeFrozenProof` + `readFrozenProof` |
| `packages/engine/src/Proof/proof-manager.ts` | `renderProbeDescribeHuman` + `renderVerdictHuman`（CLI human 输出） |
| `packages/engine/src/Proof/verdict-writer.ts` | `buildVerdictMd` + `writeVerdictMd` + `readVerdictMd` |
| `packages/engine/src/kernel/schemas/proof-schema.ts` | `FrozenProof` Zod schema |
| `packages/engine/src/kernel/verdicts/verdict.ts` | `judge()` 纯函数判定 |
| `packages/engine/src/kernel/verdicts/catalog.ts` | catalog 语义翻译 |
| `packages/engine/src/kernel/verdicts/cross-proof-compute.ts` | E4 Insight 跨 Proof 聚合 |
| `packages/engine/src/infra/probes/` | L1-Infra Probe 物理观测（fs/git/http/shell） |
| `packages/engine/src/infra/probes/probe-stats-store.ts` | probe-stats.json IO |
| `packages/engine/src/infra/probes/insight-collector.ts` | 读 frozen.json + probe-stats.json 给 E4 Insight |
| `packages/engine/src/infra/frozen/domain-proof-evaluator.ts` | Work.frozen ↔ Domain.invariant 桥接 |
| `packages/engine/src/infra/frozen/immutable.ts` | `writeFrozenImmutable`（chmod 0o444 + content_hash） |
| `packages/engine/src/Work/work-context-builder.ts` | Work context 渲染 |
| `packages/cli/src/commands/proof.ts` | 11 个 CLI 子命令 thin shell + `renderShowHuman` |

---

## → 参考

- [Core Concepts](./core-concepts.md) — E1-E4 完整概念
- [Asset](./asset.md) — E1 硬约束边界
- [Work](./work.md) — E2 Work 生命周期（Proof 在 Work 内的位置）
- [Insight](./insight.md) — E4 涌现层（消费 frozen.json + probe-stats.json）
- [Architecture](./architecture.md) — Engine L0-L3 分层（Probe 在 L1-Infra / L0-Kernel）
- [CLI 参考](./cli.md) — `oxn proof` 完整命令清单
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)