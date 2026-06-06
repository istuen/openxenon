# /oxn-proof — Proof-First 入口（v0.1.2）

> **工程师主定标准，OXN 主给证明。** 这是 IAP 三轴中 **Proof 轴的独立运作**——跳过 Domain / Blueprint 资产化，直接用 Probe 声明验收标准。

## 目标

帮助工程师完成「**让 OXN 验收**」的最小闭环：
1. 用 `oxn proof create` 立一个 proof 空间
2. 用 `oxn proof probe add` 追加 1..N 个 probe
3. 触发 AI 工作（任何 AI 助手）
4. 用 `oxn proof run` 跑物理观测 → Kernel 纯函数判定 → 写 `frozen.json`
5. 用 `oxn proof show` 读 verdict

`frozen.json` 由 OXN 签发，**AI 不得手改**（OS 层 chmod 0o444 + SHA-256 签名双重保险）。

## 何时用

| 场景 | 用 proof 还是 work？ |
|---|---|
| 「AI 说做完了？让 OXN 验收才算」 | **用 `oxn proof`** ← 本 skill |
| 单个验收场景（dist 产物存在 + 跑测试） | **用 `oxn proof`** |
| 多 stage 流水线（develop → test → deploy） | 用 `oxn work` + Blueprint（更重） |
| 跨域业务（注册 + 发邮件 + 写订单） | 用 `oxn work` + Domain |

**口诀**：5 个 probe 以内、单次验收 → `oxn proof`；多 task / 多 stage → `oxn work`。

## 5 个命令（白名单）

| 子命令 | 作用 |
|---|---|
| `oxn proof create <name>` | 创 `.openxenon/proofs/<name>/` + 写 `proof.oxn` 骨架 |
| `oxn proof probe add <name> --ref <R> [args]` | 追加 probe 到 proof.oxn |
| `oxn proof run <name>` | 调 Infra 物理观测 + Kernel 纯函数判定 + 写 `frozen.json`（chmod 0o444 + SHA-256） |
| `oxn proof list` | 列所有 proof + 各自动 verdict |
| `oxn proof show <name>` | 读 frozen.json + 输出 verdict / 详情 / 签名 |

## 支持的 probe 类型

| ref | 参数 | 含义 |
|---|---|---|
| `@oxn/probe/fs-exists` | `--target <pattern>` | glob 命中 ≥ 1 个文件 → PASS |
| `@oxn/probe/shell-exec` | `--command "<cmd>"` `--timeout <ms>` | `exitCode === 0` → PASS |

> 新增 probe（fs-match / fs-not-exists / file-exports / http-responds）属 P1+ 范围。

## Quickstart — 5 分钟闭环

```bash
# 1. 项目初始化（已 init 可跳过）
oxn init

# 2. 创建 proof 空间
oxn proof create check-deploy
# → 创 .openxenon/proofs/check-deploy/proof.oxn 骨架

# 3. 添加 probe
oxn proof probe add check-deploy --ref @oxn/probe/fs-exists --target ./dist/index.js
oxn proof probe add check-deploy --ref @oxn/probe/shell-exec --command "bun test" --timeout 60000

# 4. 让 AI 工作（任何 AI 助手 / 你自己）

# 5. 跑证明
oxn proof run check-deploy
# → Kernel 校验 Probe 声明合法性... OK
# → Infra 跑 2 个 probe...
# →   ✅ p1 (@oxn/probe/fs-exists) — 5ms
# →   ✅ p2 (@oxn/probe/shell-exec) — 12340ms
# → Verdict: PASSED (2/2)
# → Proof saved: .openxenon/proofs/check-deploy/frozen.json
# → Read-only: true

# 6. 看 verdict
oxn proof show check-deploy
# → 读 frozen.json + 验签 + 输出每 probe 详情

# 7. AI 修复后再次跑
oxn proof run check-deploy
# → Verdict: PASSED (2/2)  ← frozen.json 被覆盖（OS 允许 chmod 0o444 → 0o644 → 写 → 0o444）
```

## 物理边界

```
.openxenon/proofs/
└── check-deploy/                 ← proof 空间
    ├── proof.oxn                 ← Probe 声明（你可编辑，OXN DSL 格式）
    └── frozen.json               ← 判决书（**chmod 0o444 + SHA-256 签名**）
```

**写权独占**：
- `proof.oxn` ← 工程师可编辑（也可用 CLI `oxn proof probe add`）
- `frozen.json` ← **仅 OXN 写**。CLI 白名单：`oxn proof run`。AI / 工程师**禁止**直接 `vim` 或 `echo` 改 frozen.json。

## IAP 范式对照

```
Proof-First 入口 = IAP 中 Proof 轴的独立运作
├─ Intent 轴被跳过（不写 Domain / Blueprint）
├─ Align 轴被简化（不写 Work / Task / Part DAG）
└─ Proof 轴被激活（probe 声明 → 物理观测 → 纯函数判定 → frozen.json）
```

**为什么 Proof-First？**：让工程师 5 分钟内就感受到 OXN 的核心价值——「**AI 假完成，OXN 不会骗自己**」。如果 Probe 重复了，自然涌现出 Blueprint + Domain 的需求（→ P1 阶段）。

## 判定模型（Kernel + Infra 分离）

```
proof.oxn
  │  Langium parser → ProofDeclaration AST
  ▼
proof-runner (Align 编排)
  │
  ├─ 1. 路由：resolveProbeKind("@oxn/probe/fs-exists") → "fs-exists"
  │
  ├─ 2. Infra 物理观测：
  │     src/infra/probes/fs-exists.ts → ProbeObservation (output, exitCode, ...)
  │     （真实执行：fs.statSync / child_process.spawn）
  │
  └─ 3. Kernel 纯函数判定：
        src/kernel/probes/verdict.ts → ProbeVerdict (passed, message, ...)
        （零 IO：仅做 expected 对比 / exitCode === 0 判定）
        │
        ▼
      FrozenProofProbeResult → 写 frozen.json + chmod 0o444 + SHA-256
```

**纯洁性约束**（IAP 守护）：
- **Kernel 永远不碰 IO**（fs.* / net.* / child_process 一律不出现）
- **Infra 永远不给 PASS/FAIL**（只回答事实）
- **Infra 不能绕过 Daemon 自己宣布完成**（escape 机制留给 P1）

## 不可篡改性

`frozen.json` 是 OXN 签发的**检验报告**。双重保险：

| 层 | 机制 | 绕过成本 |
|---|---|---|
| OS 层 | `chmod 0o444`（创建即只读） | `chmod 0o644` 后才能写（需要 OS 权限） |
| 内容层 | `_xenon_meta.content_hash` = SHA-256(body) | 改了内容 hash 对不上（`oxn proof show` 会报 "signature mismatch"） |

**`oxn proof run` 覆盖语义**：用 `chmod 0o644` → 写 → `chmod 0o444` 的原子流程，OS 允许 owner 改自己的文件。

**AI 约束**（CLI 白名单）：
- ✅ 允许：`oxn proof create` / `oxn proof probe add` / `oxn proof run` / `oxn proof list` / `oxn proof show`
- ❌ 禁止：直接 `vim .openxenon/proofs/*/frozen.json` / `echo ... > frozen.json` / 任何直写

## 模式选择速查

| 你的需求 | 选什么 | 关键标志 |
|---|---|---|
| 5 分钟验收「AI 做完了吗」 | **`oxn proof`** ← 本 skill | 1..N 个 probe，1 个 proof.oxn |
| 单域深度开发 | `oxn work` + Blueprint | 多 part 流水线 |
| 跨多域业务 | `oxn work` + Domain + Blueprint | work 级 refPool |

## 完成标准

**`oxn proof run <name>`** 返回：
- `data.verdict === "PASSED"` ← 所有 probe 都过
- `data.readOnly === true` ← frozen.json 已 chmod 0o444
- `data.frozenPath` ← 判决书路径

**`oxn proof show <name>`** 返回：
- `data._xenon_meta.content_hash` ← 64-char hex SHA-256
- `data.probes[].passed` ← 每 probe 详情

把 `frozenPath` 给工程师审核。**禁止**改 frozen.json。
