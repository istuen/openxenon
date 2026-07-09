# OXN 错误码 SSOT (v1.0.2)

> **OXN 错误码的唯一目的**：告诉 **AI** 当前的 IAP 边界发生了什么，以及它下一步该做什么。
> 不是给人类做报表 — 人类看 `frozen.json` 与 stack trace 就够了。

## 一、双轨制错误体系

OXN 错误码分两条独立轨道，**互不耦合**：

| 维度 | 轨道 1: `IAPError` | 轨道 2: `OXNCrash` |
|---|---|---|
| 触发原因 | IAP 业务流转中的预期内阻断 | OXN 引擎自身 Bug / 底线被击穿 |
| **消费者** | **AI Agent** | **人类工程师** |
| 进程行为 | 继续运行 (exit 1 + stdout JSON) | 立即崩溃 (exit 2 + stderr stack) |
| 是否进 Skill 输出 | ✅ 进 | ❌ 不进 |
| AI 是否应处理 | ✅ 按 `action` 字段决策 | ❌ 绝不能（否则掩盖 Bug） |
| Action 字段 | 1 选 1: `YIELD_TO_HUMAN`（v1.0.2 后无 `AUTONOMOUS_RETRY`） | 无（动作已定：crash） |
| 数量 | 5 个 | 3 个 |

> **附加第三种（隐式）**：用户 CLI 输入错（如缺参数、未知子命令）走普通 `outputError()` 通道，无专属错误类。

---

## 二、IAPError 字典（5 个 — v1.0.2）

> 命名格式: `IAP_<AXIS>_<CODE>`，例如 `IAP_PROOF_INFRA_FAIL`

| 全名 | Axis | Code | Action | 触发场景 |
|---|---|---|---|---|
| `IAP_PROOF_INFRA_FAIL` | PROOF | INFRA_FAIL | `YIELD_TO_HUMAN` | Probe 跑不到（fs 没权限、shell spawn 失败、网络断） |
| `IAP_PROOF_CRASH` | PROOF | CRASH | `YIELD_TO_HUMAN` | Kernel verdict 逻辑崩了（程序员 Bug） |
| `IAP_ALIGN_CHECKLIST_MISSING` | ALIGN | CHECKLIST_MISSING | `YIELD_TO_HUMAN` | `task.part.intent_checklist` 必填字段缺失（AI 漏了开工前对齐宣誓） |
| `IAP_INTENT_UNDEFINED_TERM` | INTENT | UNDEFINED_TERM | `YIELD_TO_HUMAN` | Blueprint 引用了不存在的 Domain 词汇（叫工程师补） |
| `IAP_INTENT_NAME_FILE_MISMATCH` | INTENT | NAME_FILE_MISMATCH | `YIELD_TO_HUMAN` | DSL 声明名（如 `MemberContext`）与文件名（如 `member-context.oxn`）规范化后不一致（macOS APFS case-insensitive 跨平台防御） |

> **v1.0.2 变更**：
> - 移除 `IAP_ALIGN_TIMEOUT` / `IAP_ALIGN_MISMATCH`（Align 轴业务结果，走 `frozen.json.verdict: FAILED` 通道而非异常）
> - 移除 `IAP_INTENT_SLOT_CONFLICT`（僵尸码，slot DAG 冲突在 `oxn blueprint validate` 阶段走档 3 用户输入错通道）
> - 新增 `IAP_INTENT_NAME_FILE_MISMATCH`（macOS-safe 字符串级规范化，OS-agnostic 反馈闭环）
> - 新增 `IAP_ALIGN_CHECKLIST_MISSING`（part.intent_checklist 必填的硬约束，结构性违规）
>
> **删除的码（历史）**：`OXN_PROBE_*`（4 个 catalog 错码）合并到 `IAP_PROOF_INFRA_FAIL`，具体原因走 `context.reason` 字段。
> **绝不放进 IAPError**：`Verdict: FAIL`（正常的 Probe 业务结果）走 `frozen.json.verdict` 通道，不抛异常。

---

## 三、OXNCrash 字典（3 个）

> 命名格式: `OXN_CRASH_<CODE>`，例如 `OXN_CRASH_SIGNATURE_MISMATCH`

| 全名 | 触发场景 | 后果 |
|---|---|---|
| `OXN_CRASH_SIGNATURE_MISMATCH` | frozen.json 签名被外部篡改（防线击穿） | 进程退出 2，stack 走 stderr |
| `OXN_CRASH_STATE_CORRUPT` | `.openxenon` 状态机损坏 | 进程退出 2，stack 走 stderr |
| `OXN_CRASH_INTERNAL_ERROR` | 代码未覆盖的死角（Bug） | 进程退出 2，stack 走 stderr |

> **AI 永远看不到 OXNCrash** — 走 stderr 通道，AI Skill 收不到。AI 若试图处理 OXNCrash 只会掩盖 Bug。

---

## 四、CLI 4 档错误出口

`src/cli/index.ts` 顶层 catch 块按 4 档分流：

| 档 | 类型 | 通道 | Exit | 进程行为 |
|---|---|---|---|---|
| **1** | `IAPError` | stdout JSON | **1** | 业务流阻断，AI 决策 |
| **2** | `OXNCrash` | stderr + stack | **2** | 引擎崩溃，AI 看不到 |
| **3** | `isCliInputError()` | stdout JSON | **1** | 用户输入错，AI/人都能消费 |
| **4** | 其他 `Error`（兜底） | stderr + stack | **2** | 未知异常 = 引擎崩溃，**严禁**给 AI 看 |

### Unix 哲学退出码

| Code | 含义 |
|---|---|
| `0` | 成功 |
| `1` | 业务流阻断（IAPError / 用户输入错） — 可恢复 |
| `2` | 引擎崩溃（OXNCrash / 未知异常） — 不可恢复 |

### CLI 输出契约

**档 1 (IAPError) — stdout**:
```json
{
  "ok": false,
  "error": {
    "code": "IAP_PROOF_INFRA_FAIL",
    "axis": "PROOF",
    "action": "YIELD_TO_HUMAN",
    "message": "Daemon 未运行（ENOENT: connect ENOENT ~/.openxenon/daemon.sock）",
    "context": { "phase": "connect", "systemError": "ENOENT", "socketPath": "...", "suggestion": "..." }
  }
}
```

**档 2 (OXNCrash) — stderr**:
```
=== OXN ENGINE CRASH: OXN_CRASH_SIGNATURE_MISMATCH ===
frozen.json 签名被外部篡改
Caused by: signature mismatch: expected 4f2a..., got e1b9...
TypeError: ...
    at ...
```

**档 3 (用户输入错) — stdout**:
```json
{
  "ok": false,
  "error": {
    "code": "commander.missingArgument",
    "message": "Missing required argument: NAME"
  }
}
```

**档 4 (兜底) — stderr**:
```
=== OXN UNEXPECTED CRASH ===
TypeError: cannot read property x of undefined
    at ...
```

---

## 五、isCliInputError 检测规则

CLI 输入错通过以下规则识别（`src/core/errors/cli-input-error.ts`）：

### 错误码前缀（白名单，按优先级）
- `commander.*` (Commander.js 抛)
- `citty.*` (citty 抛)
- `cli.*` (项目自定义前缀)
- `OXN_INVALID_CLI_*` (项目自定义 CLI 码)
- `OXN_PROOF_*` (子命令 Proof 用户输入错)
- `OXN_PROBE_*` (子命令 Probe 用户输入错)
- `OXN_INPUT_*` (子命令 输入参数 错)
- `OXN_OUTPUT_*` (子命令 输出目标 错)
- `OXN_INVALID_*` (子命令 通用校验错)

### 消息关键词
- `Missing required argument`
- `Missing required option`
- `Unknown argument`
- `Unknown command`
- `Unknown option`
- `Too many arguments`
- `Too few arguments`
- `Invalid argument`
- `Invalid option`

> **保守策略**：宁可漏判（落到档 4 兜底 Crash），也不误判（把 IAPError 当成 CLI 输入错）。

---

## 六、Verdict: FAIL vs IAPError

这是 IAP 哲学的关键澄清：**业务结果 ≠ 系统异常**。

| 概念 | 通道 | 例子 |
|---|---|---|
| **Verdict: PASS** | `frozen.json.verdict === 'PASSED'` | 正常业务结果 |
| **Verdict: FAIL** | `frozen.json.verdict === 'FAILED'` | 正常业务结果，**AI 自己改** |
| **IAPError** | thrown exception → CLI stdout | 业务流被阻断，叫人或自己改 |
| **OXNCrash** | thrown exception → CLI stderr | 引擎崩了，AI 别动，叫人修 |

> **AI 决策表**：
> - 看到 `frozen.json` → 读 `verdict` 字段
> - 看到 `IAPError` → 读 `action` 字段（`AUTONOMOUS_RETRY` 自己改 / `YIELD_TO_HUMAN` 叫人）
> - 看到 `OXNCrash` / 档 4 兜底 → **什么也别做**，让进程挂

---

## 七、代码位置

| 文件 | 作用 |
|---|---|
| `src/core/errors/iap-error.ts` | `IAPError` 类 + `IAPAction` enum + 类型 |
| `src/core/errors/oxn-crash.ts` | `OXNCrash` 类 + 类型 |
| `src/core/errors/cli-input-error.ts` | `isCliInputError` 守卫（8 个错误码前缀白名单 + 9 个 citty 关键词） |
| `src/core/errors/index.ts` | Re-export barrel |
| `src/core/errors/__tests__/` | 21 (IAP) + 25+11 = 57 个测试 |
| `src/cli/index.ts` | 4 档 catch 块（`classifyError` + 4 个 `handleXxx`） |
| `src/cli/output.ts` | `outputError` + `outputUserInputError` helper |
| `src/cli/socket-client.ts` | OS 套接字错 → `IAPError('PROOF','INFRA_FAIL',...)` 包装 |
| `src/cli/{proof,blueprint,work,domain}.ts` | 7+1 个用户输入错（`OXN_PROOF_*` / `OXN_PROBE_*` / `OXN_INPUT_*` / `OXN_OUTPUT_*` / `OXN_INVALID_*`）走 `outputUserInputError` |

### Phase 4 完成项

- ✅ `socket-client.ts` 把 OS 套接字错（ECONNREFUSED/ENOENT/ETIMEDOUT）翻译为 `IAPError('PROOF', 'INFRA_FAIL', YIELD_TO_HUMAN, ...)`
- ✅ 删除 `src/cli/index.ts` 的 `handleLegacyDaemonError`（IAPError catch 块天然处理）
- ✅ 7+1 个用户输入错（`OXN_PROOF_*` / `OXN_PROBE_*` / `OXN_INPUT_*` / `OXN_OUTPUT_*` / `OXN_INVALID_NAME`）已迁移至 `outputUserInputError(code, message, options)` helper
- ✅ `isCliInputError` 白名单扩展到 8 个错误码前缀（4 个 + `OXN_PROOF_` / `OXN_PROBE_` / `OXN_INPUT_` / `OXN_OUTPUT_` / `OXN_INVALID_`）
- ✅ E2E 集成测试 (`src/cli/__tests__/cli-e2e.test.ts`) 验证 4 档错误出口契约
- ✅ `src/kernel/enums.ts` Phase 2 stale 注释已更新

---

## 八、演进路线

- **v1.0 (Phase 1-3)**: 双轨制错误码体系（本文档，6 IAPError + 3 OXNCrash）
- **v1.0.1 (Phase 4)**: socket-client IAPError 包装 + 用户输入错 helper + 4 档 E2E 集成测试
- **v1.0.2**: 字典收敛 — 移除 3 个僵尸/伪异常码，新增 2 个结构性违规码（NAME_FILE_MISMATCH / CHECKLIST_MISSING）
- **v1.1 (Phase 5, 已完成 ✅)**: Probe 字典扩到 11 条
  - 5a Catalog Gap: `fs-not-exists` / `fs-content-match` 注册 + `fs-parseable` 新增；清理 `exec_exit_zero` / `exec_output_match` 遗留
  - 5a.0 P0 修复: `fs_match` 数据契约 bug（verdict 读 `output.matched`，不再假 PASS）
  - 5b P1 Probes: `test-pass` / `deps-resolved` / `ts-compiles` / `lint-check` / `http-responds` / `file-exports`
  - ProgramContext builtin Domain: 6 term（SourceFile / Module / TestCase / Package / BuildArtifact / APIEndpoint）
  - catalog entry 新增 `domainTerm` 字段标记服务哪个 P1 term
  - 清理: `builtin-probes.oxn` 删除（PROBE_CATALOG 单一管理）；`collector.ts` 从 catalog 读取
- **v0.2+**: `part.intent_checklist` DSL 字段 + `oxn work lint` preflight + `CHECKLIST_MISSING` throw site 上线
