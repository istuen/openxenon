---
title: 证明轴
---

# 证明轴

> Proof 轴是 OXN 的主权领域。Probe 声明验收标准，OXN 产出不可篡改的 frozen.json，Verdict 决定 Pass 还是 Fail。

## What —— Proof 轴的三层结构

| 实体 | 中文 | 职责 |
|---|---|---|
| Probe | 探针 | 验收标准的声明与执行。Engineer 声明标准，OXN 执行检查 |
| Proof | 证明 | OXN 执行 Probe 后产出的完整判定记录（`frozen.json`） |
| Verdict | 裁定 | Proof 的最终结论：PASS 或 FAIL |

流程图：

```
Intent 轴                    Align 轴
Blueprint(.oxn)             Task → Artifact
    │   Probe 标准              │   Artifact 事实
    └────────────┬───────────────┘
                 │
                 ▼
              Proof 轴
           Proof(Verdict)
      OXN (Kernel + Infra + Daemon)
                 │
                 │  Verdict = FAIL
                 ▼
            逃逸机制
        预警 + 阻止 + 诊断
```

---

## Probe：验收标准的声明与执行

### 内置 Probe 类型

| Probe | 物理观测 | 判定逻辑 |
|---|---|---|
| `fs-exists` | 文件系统 glob 扫描 | `found.length > 0` |
| `fs-not-exists` | 文件系统 glob 扫描 | `found.length === 0` |
| `fs-content-match` | readFile + RegExp | `matched === true` |
| `fs-parseable` | readFile + JSON.parse | `parsed === true` |
| `shell-exec` | spawn 执行命令 | `exitCode === 0` |
| `test-pass` | `bun test` | `exitCode === 0` |
| `deps-resolved` | 解析 lock 文件 | `missing.length === 0` |
| `ts-compiles` | `tsc --noEmit` | `exitCode === 0` |
| `lint-check` | `biome check` | `exitCode === 0` |
| `http-responds` | HTTP fetch | `status === expectedStatus` |
| `file-exports` | 子进程 import 提取 exports | `exports.length > 0` |

### Proof-First 模式：CLI 直接使用

```bash
oxn proof create check-deploy
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add http-responds --url http://localhost:3000/health --status 200
oxn proof run check-deploy
```

### IAP 完整模式：内联在 Part 中

```oxn
part "build" {
  skill_context = "实现 Member 注册 API"
  probe "api-exists" ref "@oxn/probes/fs-exists" {
    params = { path = "src/api/member.ts" }
  }
  probe "api-compiles" ref "@oxn/probes/ts-compiles" {
    params = { project = "tsconfig.json" }
  }
}
```

**信息隐藏**：Part 内的 Probe 块 AI 不可见。AI 只能看到 `skill_context`。

---

## Proof：frozen.json 契约

OXN 执行 Probe 后产出 frozen.json——不可篡改的证明记录：

```json
{
  "proofName": "check-deploy",
  "frozenAt": "2026-06-12T10:00:00Z",
  "verdict": "PASS",
  "probes": [
    { "name": "fs-exists", "status": "PASSED", "actual": "found", "expected": "found" },
    { "name": "http-responds", "status": "PASSED", "actual": "200", "expected": "200" }
  ]
}
```

### frozen.json 的不可篡改性

- AI **不能写** frozen.json——判决书由 OXN 独占
- 工程师**不能编辑** frozen.json——只能读
- 如果 AI 能绕过 Probe 直接改 verdict，整个 Proof 轴名存实亡

### Verdict 三态（v0.2 Sprint 3b T5 起）

自 v0.2 起，`frozen.json` 区分三种 verdict：

| Verdict | 含义 | 颜色（TTY） | 图标 |
|---|---|---|---|
| `PASSED` | 所有 probe 都通过 | 绿 | ✅ |
| `FAILED` | 至少一个 probe 失败 | 红 | ❌ |
| `INCONCLUSIVE` | 至少一个 probe 命中污染信号（沙箱违规、权限拒绝、cache 命中…） | 黄 | ⚠️ |

聚合规则（见 `src/cli/proof-frozen-writer.ts`）：
- 任一 probe `verdict === 'INCONCLUSIVE'` → 整体 `INCONCLUSIVE`
- 否则全部 probe `PASSED` → `PASSED`
- 否则 → `FAILED`
- 空 probe 列表 → `FAILED`（无证据即无证明）

`interferenceFlags[]` 是 probe 级的 YELLOW 信号记录，不会让 probe 自身失败，但
会把整体 verdict 抬到 `INCONCLUSIVE`。使用 `oxn proof show <name>` 查看 flags
和人类可读的 verdict。

### 物理路径

| 模式 | 路径 |
|---|---|
| Proof-First（P 独立） | `.openxenon/proofs/<name>/frozen.json` |
| IAP 完整模式 | `.openxenon/works/<w>/tasks/<t>/frozen.json` |

两种模式使用同一文件名 `frozen.json`，区别仅在父目录与生命周期。

---

## Verdict 与逃逸机制

### Verdict

- **PASS**：所有 Probe 通过 → Work / Task 可继续
- **FAIL**：任一 Probe 未通过 → **逃逸机制触发**

### 逃逸机制

当 Kernel 判定 Verdict = FAIL 时，Daemon 触发强制干预，阻止 AI "假完成"：

1. **预警**（notify）— 通知工程师与 AI "执行结果未达预期"
2. **阻止**（block）— Work 保持 `running` 状态，不允许进入 `done`
3. **诊断**（diagnose）— 提供 Intent → Align → Proof 完整链路快照

```json
{
  "work": "trial-deploy",
  "task": "deploy-prod",
  "proof": {
    "verdict": "FAIL",
    "probe": "@oxn/probes/fs-exists",
    "expected": "found",
    "actual": "not_found",
    "escape_action": "BLOCK_DONE"
  }
}
```

**无 `--force` 绕过**。这是 IAP 范式的终极防线——如果证明可被绕过，IAP 就名存实亡。

---

## How —— 怎么用

### Proof-First 模式（快速验证）

```bash
# 证明轴
oxn proof create check-deploy

# 证明轴
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add file-exports --target ./dist/index.js --export handler
oxn proof probe add http-responds --url http://localhost:3000/health --status 200

# 证明轴
oxn proof run check-deploy
# 证明轴
# 证明轴
# 证明轴

# 证明轴
oxn proof run check-deploy
# 证明轴
```

### 管理 Proof

```bash
oxn proof list                  # 列出所有 Proof
oxn proof show check-deploy     # 查看指定 Proof 详情
```

### IAP 完整模式（Blueprint 驱动）

在 [Align](./align.md) 的 Work 流程中，每调用一次 `oxn work submit` 都会自动触发 Probe 执行并产出 frozen.json。

---

## Runtime 三模块协作

Proof 轴的执行依赖 Runtime 三模块的严格分工：

| 模块 | 职责 | 约束 |
|---|---|---|
| Kernel | 纯逻辑校验 Probe 声明合法性 | 零 IO，不得执行任何副作用 |
| Infra | 执行 Probe（fs / http / shell 等）| 只回答事实，不得做 PASS/FAIL 判定 |
| Daemon | 管理状态机 + Verdict FAIL 时触发逃逸 | 不得修改 Kernel 规则 |

> **纯洁性第一法则**：Infra 不能绕过 Daemon 自我宣布完成 → Daemon 不能修改 Kernel 规则 → Kernel 不能直接执行 Task

## v0.3 Proof Verdict 输出规范（canonical .md）

> **本节是 v0.3.0 锁死的 canonical 纯 MD 形式规范**。与 `## Verdict 与逃逸机制` 互补：
> 上一节讲 **frozen.json**（机器内核产物），本节讲 **.md canonical**（人类阅读 SSOT）。

### 1️⃣ 核心结构（H1 + H2 + H3 + 列表）

```markdown
---
entity: proof
version: 0.3.0
name: <proof-name>
---

# Proof: <proof-name>

> 一句话说明这个 Proof 验证什么

## Verdicts

### <verdict-name>
- type: pass | fail | inconclusive
- value: <人类可读描述>

## Runtime

### snapshot
- observed_at: <ISO 8601>
- probes_run: <int>
- probes_passed: <int>
- probes_inconclusive: <int>
```

### 2️⃣ 3 态 Verdict 语义

| `type` 值 | 语义 | 触发场景 |
|---|---|---|
| `pass` | 验证通过 | 所有 Probe 命中预期 |
| `fail` | 验证失败 | 任一 Probe 未命中 |
| `inconclusive` | 信号污染 | ProbeVerdict 收到 RED flag（如 fs 探针读到 SIGINT 路径） |

### 3️⃣ 完整示例（3 状态混合）

```markdown
---
entity: proof
version: 0.3.0
name: order-build-validity
---

# Proof: order-build-validity

> 证明 place-order Work 的 build 步骤产出可执行 + 类型 + lint 全部通过

## Verdicts

### build-exists
- type: pass
- value: dist/oxn 文件存在且 sha256 与 lock 记录一致

### type-check
- type: pass
- value: bun run typecheck 0 error（0 warning）

### lint
- type: fail
- value: biome check 1 error in src/cli/proof.ts:88 — see frozen.json#probes[2].errorMessage

### network-reachable
- type: inconclusive
- value: http-responds probe returned RED flag: TLS handshake interrupted by signal

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 4
- probes_passed: 2
- probes_inconclusive: 1
```

### 4️⃣ 关键规则（编译器硬约束）

| 规则 | 错误码 | 来源 |
|---|---|---|
| H2 必须是 `Verdicts` 或 `Runtime` | `E_MD_CATEGORY_UNKNOWN` | `proof-compiler.ts:203` |
| H3 在所属 H2 内必须唯一 | `E_MD_DUPLICATE_H3` | `proof-compiler.ts:214` |
| `type` 必须是 3 态之一（其他值静默降级 `inconclusive`）| 静默降级 | `proof-compiler.ts:243` |
| 缺失 `type` 字段 | 静默默认 `inconclusive` | `proof-compiler.ts:144` |
| `## Runtime` 必须**唯一**一个 H3 = `snapshot`（v0.3.0 Q3 决策）| `E_MD_INVALID_RUNTIME_BLOCK` | `proof-compiler.ts:251` |
| Runtime 字段不得显式写 `probes_failed`（v0.3.0 Q2 决策）| `E_MD_REDUNDANT_FIELD` | `proof-compiler.ts:286` |

### 5️⃣ Runtime 字段定义（强 schema）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `observed_at` | ISO 8601 string | 否 | 跑 Proof 的时间戳 |
| `probes_run` | int | 否 | 跑了几个 Probe |
| `probes_passed` | int | 否 | 通过数 |
| `probes_inconclusive` | int | 否 | 污染数 |
| `probes_failed` | **推导** | **禁止显式写** | `run - passed - inconclusive` 自动计算 |

> **数据冗余是万恶之源**：若用户（或 AI）手写 `probes_failed: 1`，而实际 `probes_passed + probes_inconclusive` 已给出，存储会不一致（`4 ≠ 2+1+1`）。**Q2 决策**：`E_MD_REDUNDANT_FIELD` strict reject。

### 6️⃣ 双层 Verdict 关系（.md ⇄ frozen.json）

```
┌─────────────────────────┐         ┌────────────────────────────┐
│ .md (canonical SSOT)    │         │ frozen.json (Kernel 产物) │
├─────────────────────────┤         ├────────────────────────────┤
│ ### build-exists         │         │ { verdict: "PASSED",      │
│ - type: pass            │ ◀────▶  │   probes: [                │
│ - value: dist/oxn ...   │  (Proof │     { probeName: "build..", │
│                         │   run)  │       passed: true },      │
│ ### type-check           │         │     ...                    │
│ - type: fail            │         │   ],                       │
│ - value: biome ...      │         │   totalCount: 2,           │
│                         │         │   passedCount: 1 }        │
└─────────────────────────┘         └────────────────────────────┘
```

**3 态命名差异**（Q1 决策：保持现状，不为形式统一改 Kernel Schema）：

| 层 | 值空间 |
|---|---|
| `.md` canonical (ProofCompiler) | `pass` / `fail` / `inconclusive` ← lowercase |
| `frozen.json` (FrozenProofSchema) | `PASSED` / `FAILED` / `INCONCLUSIVE` ← uppercase + `-ED` |
| Kernel `ProbeVerdict` | `PASS` / `FAIL` / `INCONCLUSIVE` ← uppercase no `-ED` |

**映射边界**：`src/cli/proof-frozen-writer.ts` 写 frozen.json 时做 `PASS → PASSED` 映射；`src/oxl/md-bridge/compilers/proof-compiler.ts:parse()` 反向读时，uppercase 值静默降级 `inconclusive`（避免大小写歧义）。

### 7️⃣ 5 个 anti-pattern（避坑指南）

```markdown
❌ 1. 把 type 写成大写（frozen.json 风格）→ 静默降级为 inconclusive！
- type: PASS

❌ 2. 用 :::intent{...} 容器（v0.3 改革后抛 E_MD_DEPRECATED_SYNTAX）
```
: : :intent{#v1 type="verdict"}    ← 把开头 :::intent{ 拆开避免触发 canonical CI
  type: pass
: : :
```

❌ 3. 多个 Verdict 共享同一 H3 文本（抛 E_MD_DUPLICATE_H3）
### build
- type: pass
### build          ← 同 H2 内重名 → 报错
- type: fail

❌ 4. 写未在白名单的 H2（抛 E_MD_CATEGORY_UNKNOWN）
## Probes          ← 必须是 Verdicts 或 Runtime

❌ 5. 显式写推导字段（抛 E_MD_REDUNDANT_FIELD）
## Runtime
### snapshot
- probes_failed: 1   ← 由 probes_run - probes_passed - probes_inconclusive 推导
```

### 8️⃣ 端到端流程（v0.3.0）

```bash
# 1. 写 .oxn（Langium grammar）
cat > .openxenon/proofs/my-proof/proof.oxn <<'EOF'
proof "my-proof" {
  description = "..."
  probe "p1" { ref "@oxn/probes/fs-exists" params { pattern = "./dist/oxn" } }
  probe "p2" { ref "@oxn/probes/shell-exec" params { command = "bun test" } }
}
EOF

# 2. 编译为 v0.3 canonical .md（v0.3.0 新增 CLI）
oxn proof compile my-proof
# → 写 .openxenon/proofs-md/my-proof.md（含 ## Verdicts / ## Runtime）

# 3. 跑 proof（自动生成 frozen.json）
oxn proof run my-proof
# → 写 .openxenon/proofs/my-proof/frozen.json（含 probes[] + verdict）

# 4. （可选）AI 读 .md 看 verdict
cat .openxenon/proofs-md/my-proof.md
```

### 9️⃣ 实测样例（仓库已有）

`src/oxl/examples-md/order-build-validity-proof.md`（3 个 pass verdict + Runtime snapshot）：

```markdown
---
entity: proof
version: 0.3.0
name: order-build-validity
---

# Proof: order-build-validity

> 证明 place-order Work 的 build 步骤产出可执行 + 类型 + lint 全部通过

## Verdicts

### build-exists
- type: pass
- value: dist/oxn 文件存在且 sha256 与 lock 记录一致

### type-check
- type: pass
- value: bun run typecheck 0 error（0 warning）

### lint
- type: pass
- value: bun run lint 0 error（pre-existing 1 warning 不计）

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 3
- probes_passed: 3
- probes_inconclusive: 0
```

---

## → 参考

- [Intent](./intent.md) — Probe 标准来自 Blueprint 的 observe 字段
- [Align](./align.md) — Task + Part 中的 Probe 内联方式
- [Quickstart](./quickstart.md) — Proof-First 模式完整演示
- 旧文档：[Probe 类型完整参考](./reference/probe-types.md)（旧 SSOT）
