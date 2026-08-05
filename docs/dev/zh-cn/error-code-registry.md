# OXN 错误码全量索引（SSOT）

> **维护规范**：ADR-0080
> **最后更新**：2026-07-23
> **状态**：初次建立，待回溯登记
> **规则**：新增错误码必须在此登记（ADR-0080 §D5）

---

## Layer 1: 错误类型

| 类型 | 消费者 | 输出渠道 | 退出码 | 定义文件 |
|---|---|---|---|---|
| IAPError | AI Agent | stdout JSON | 1 | `packages/engine/src/kernel/contracts/iap-error.ts` |
| OXNCrash | 人类工程师 | stderr 堆栈 | 2 | `packages/engine/src/errors/oxn-crash.ts` |
| CliInputError | AI/人类 | stdout JSON | 1 | `packages/engine/src/errors/cli-input-error.ts`（检测器） |

CLI 4-tier catch block：`packages/cli/src/index.ts:41-54`

---

## Layer 2: 错误类别

| 类别 | 语义 | 处理策略 | 涉及阶段 |
|---|---|---|---|
| 传感器异常（Sensor Fault） | Probe 基础设施故障 | 阻断 | run / submit |
| 验证结果（Verification Outcome） | Probe 正常执行后的数据 | 只记录不阻断 | submit（宽松走廊） |
| 强制机制（Enforcement） | 转换点把关 | 阻断（Lock 不可绕过 / Finalize 可风险绕过） | lock / finalize |
| 输入校验（Input Validation） | 输入不符合格式或约束 | 阻断 | 所有阶段 |
| 基础设施保护（Infra Protection） | 系统资源保护 | 阻断或降级 | daemon |
| 状态机（State Machine） | Work/Task 生命周期状态违反 | 阻断 | run / submit / next-round |

### 验证结果（不是错误码）

以下状态是 Probe 正常工作的产出数据，不是错误：

| 状态 | 定义 | 处理 |
|---|---|---|
| COMPLETED（验证一致） | 目标符合验证标准 | 记录到 frozen.json |
| DEVIATED（验证有差异） | 目标不符合验证标准 | 记录到 frozen.json，不阻断 |
| INCONCLUSIVE（无法验证） | 脚本执行异常 | 记录到 frozen.json，finalize 时阻断（可风险绕过） |
| MANUAL_PENDING（人工待判定） | 无 script 也无 manual | 记录到 frozen.json，finalize 时阻断（可风险绕过） |

定义文件：`packages/engine/src/infra/frozen/domain-proof-evaluator.ts:7`

### `--force` 绕过审计（ADR-0080 §D7）

frozen.json 新增 `forceUsed` 字段记录 `--force` 绕过事实：

| forceUsed | overallOutcome | 含义 |
|---|---|---|
| `false` | `COMPLETED` | 正常通过 |
| `true` | `DEVIATED` / `INCONCLUSIVE` | 强制绕过——验证有差异但被人为放行 |

`forceUsed=true` 时 `forceDetails` 记录被绕过的 outcome 类型列表 + 时间戳。

---

## Layer 3: 错误码全量索引

### 3.1 IAPError Codes（22 个，含 5 个 deprecated）

**定义文件**：`packages/engine/src/kernel/contracts/iap-error.ts:50-72`
**格式**：`IAP_<AXIS>_<CODE>`；`INFRA_FAIL` 子码例外：`INFRA_FAIL_<SPECIFIC>`（不带 `IAP_` 前缀和 AXIS，见 ADR-0080 §D4d）
**AXIS 枚举**：`INTENT` | `ALIGN` | `PROOF` | `INFRA`
**Action 枚举**：`AUTONOMOUS_RETRY` | `YIELD_TO_HUMAN`

#### INTENT 轴

| Code | Action | 类别 | 触发场景 | Throw sites |
|---|---|---|---|---|
| `NAME_FILE_MISMATCH` | YIELD_TO_HUMAN | 输入校验 | 声明名 ≠ 文件名（macOS APFS 防御） | `name-canonical.ts:75,114` |
| `REFERENCE_PREFIX_INVALID` | AUTONOMOUS_RETRY | 输入校验 | Work ref 不符合 `@md/<scope>/<name>` 格式 | `parse-md-ref.ts:51,59,76,92,116,133` |
| `ASSET_HAS_REFS` | YIELD_TO_HUMAN | 强制机制 | Asset 被其他 Asset 引用，不可 archive/delete | `archive.ts:62`, `delete.ts:59` |
| `INCOMPLETE_ASSET_PAPER` | YIELD_TO_HUMAN | 强制机制 | AssetPaper 4 字段不完整（strict mode） | `validate.ts:218` |
| `PROBE_OUT_OF_BOUNDARY` | YIELD_TO_HUMAN | 强制机制 | Task Probe 不在 Blueprint slot.observe[] | `work-validator.ts:238` |
| `TASK_DAG_VIOLATES_SLOT` | YIELD_TO_HUMAN | 强制机制 | Task deps 违反 slot DAG 闭包 | `work-validator.ts:401` |
| `UNDEFINED_TERM` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
<!-- allow-version -->
| `CHECKLIST_MISSING` | — | — | ⚠️ **DEPRECATED**：无 throw site（v0.2 TODO） | — |
<!-- /allow-version -->

#### ALIGN 轴

| Code | Action | 类别 | 触发场景 | Throw sites |
|---|---|---|---|---|
| `INFRA_FAIL_STATE_LOAD` | YIELD_TO_HUMAN | 状态机 | Work/Task state.json 加载失败 | `dual-state-io.ts:96,108,170,182` |

> **INFRA_FAIL 子码**：`INFRA_FAIL` 是错误范围（命名空间），拆分为 `INFRA_FAIL_<SPECIFIC>` 子码（不带 `IAP_` 前缀和 AXIS，见 ADR-0080 §D4d）。裸码 `INFRA_FAIL` 为 deprecated fallback。AI 检测 `code.startsWith('INFRA_FAIL')` 同时匹配新旧。

> **注意**：ALIGN 轴的 `INFRA_FAIL_*` 通过 `throwExecError` 抛出，`oxnCode` 携带在 context 中：

| oxnCode (context) | Action | 类别 | 触发场景 | Throw sites |
|---|---|---|---|---|
| `OXN_WORK_NOT_STARTED` | AUTONOMOUS_RETRY | 状态机 | Work .run/state.json 不存在 | `dual-state-exec.ts:139,618,749` |
| `OXN_TASK_NOT_FOUND` | AUTONOMOUS_RETRY | 状态机 | Task 未声明或未启动 | `dual-state-exec.ts:148,218` |
| `OXN_ROUND_ALREADY_PASSED` | AUTONOMOUS_RETRY | 状态机 | Round 已 passed，应 finalize | `dual-state-exec.ts:639` |
| `IAP_ALIGN_ROUND_MAX_EXCEEDED` | AUTONOMOUS_RETRY | 状态机 | Round 达到 maxIterations | `dual-state-exec.ts:629` |
| `OXN_WORKSPACE_NOT_FOUND` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `OXN_TASK_OXN_MISSING` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `OXN_NO_NEXT_PART` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `OXN_PART_ALREADY_DONE` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `OXN_WORKSPACE_ALREADY_RUNNING` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |

#### PROOF 轴

| Code | Action | 类别 | 触发场景 | Throw sites |
|---|---|---|---|---|
| `IAP_PROOF_FINALIZE_BLOCKED` | YIELD_TO_HUMAN | 强制机制 | finalize 因验证结果未通过而阻断（DEVIATED / MANUAL_PENDING / INCONCLUSIVE，context.outcome 区分） | `work-domains.ts:93,109,125` |
| `INFRA_FAIL_FROZEN_WRITE` | YIELD_TO_HUMAN | 传感器异常 | frozen.json 写入失败 | `work-domains.ts:146` |
| `PROBE_CORRUPTED` | YIELD_TO_HUMAN | 传感器异常 | Probe scheme 缓存损坏 | `work-precheck.ts:36` |
| `PROBE_MISSING` | YIELD_TO_HUMAN | 传感器异常 | Probe scheme 缓存缺失 | `work-precheck.ts:36` |
| `INGEST_SCHEMA_INVALID` | YIELD_TO_HUMAN | 输入校验 | Token ingest schema 校验失败 | `token-writer.ts:27` |
| `INFRA_FAIL_PROBE_CATALOG` | YIELD_TO_HUMAN | 传感器异常 | Probe catalog 未知 probe / 输入缺失 / 类型不匹配 | `catalog.ts:570,586,603,618,633` |
| `CRASH` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `PROBE_INVALID` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |
| `PROBE_FIX_UNAVAILABLE` | — | — | ⚠️ **DEPRECATED**：无 throw site | — |

> **验证结果 vs finalize 阻断 code 分离**（ADR-0080 §D4e）：DEVIATED / MANUAL_PENDING / INCONCLUSIVE 是验证结果（数据，DomainProofOutcome），不是错误码。finalize 因它们而阻断时统一抛 `IAP_PROOF_FINALIZE_BLOCKED`，`context.outcome` 携带具体验证结果类型。

#### INFRA 轴

| Code | Action | 类别 | 触发场景 | Throw sites |
|---|---|---|---|---|
| `PATH_CONFLICT` | YIELD_TO_HUMAN | 输入校验 | Asset 路径冲突（已存在 / 不存在 / 名字冲突） | `create.ts:223`, `evolve.ts:30,44,54`, `archive.ts:51`, `validate.ts:179`, `asset-path-resolver.ts:106` |
| `KIND_UNSUPPORTED` | YIELD_TO_HUMAN | 输入校验 | Asset kind 不支持 / 文件不存在 | `create.ts:256`, `validate.ts:21`, `asset-path-resolver.ts:62` |
| `FORCE_REQUIRED` | YIELD_TO_HUMAN | 强制机制 | 删除 Asset 需要 --force | `delete.ts:47` |
| `PROVIDER_DUPLICATE` | YIELD_TO_HUMAN | 输入校验 | Provider/slug 已注册 | `pool-writer.ts:51`, `provider-registry.ts:103` |
| `PROVIDER_UNSUPPORTED` | YIELD_TO_HUMAN | 输入校验 | Provider 不实现请求的 IO 方法 | `git-provider.ts:131`, `file-provider.ts:143`, `shell-provider.ts:50,63`, `http-provider.ts:172` |
| `SANDBOX_REJECTED` | YIELD_TO_HUMAN | 基础设施保护 | Probe sandbox 不可用（Bun.Transpiler / node:vm） | `sandbox.ts:77` |
| `INFRA_FAIL_INSIGHT_TARGET` | YIELD_TO_HUMAN | 状态机 | Insight 目标文件不存在 | `intent-overwriter.ts:60` |

---

### 3.2 OXNCrash Codes（3 个）

**定义文件**：`packages/engine/src/errors/oxn-crash.ts:23`
**格式**：`OXN_CRASH_<CODE>`

| Code | 触发场景 | Throw sites |
|---|---|---|
| `SIGNATURE_MISMATCH` | frozen.json 签名被篡改 | 无生产 throw（仅测试） |
| `STATE_CORRUPT` | .openxenon 状态机损坏 | 无生产 throw（仅测试） |
| `INTERNAL_ERROR` | 代码死角（Bug） | 无生产 throw（仅测试） |

**注意**：生产代码中 OXNCrash 从未显式抛出。tier-4 fallback（`packages/cli/src/index.ts:122-131`）兜底所有未知 `Error` 作为 OXNCrash 处理。

---

### 3.3 CLI Error Codes（OXN_* 前缀）

**检测器**：`packages/engine/src/errors/cli-input-error.ts:26-37`（前缀白名单）
**输出函数**：`packages/cli/src/commands/output.ts`（`outputError` / `outputUserInputError`）

#### work 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_NO_PROJECT` | 输入校验 | 项目未 init |
| `OXN_FILE_NOT_FOUND` | 输入校验 | Blueprint/task 文件不存在 |
| `OXN_NO_BLUEPRINT` | 输入校验 | 文件无 Blueprint 声明 |
| `OXN_INVALID_BLUEPRINT` | 输入校验 | Blueprint 无 boundaries |
| `OXN_INVALID_ASSET_KIND` | 输入校验 | Asset kind 无效 |
| `OXN_INVALID_WORK_NAME` | 输入校验 | Work name 格式无效 |
| `OXN_INVALID_TASK_NAME` | 输入校验 | Task name 格式无效 |
| `OXN_WORK_EXISTS` | 输入校验 | Work 已存在 |
| `OXN_WORK_ALREADY_EXISTS` | 输入校验 | Work 已存在（state parse fallback） |
| `OXN_WORK_ALREADY_FINALIZED` | 状态机 | Work 已 finalize |
| `OXN_WORK_ALREADY_RUNNING` | 状态机 | Work 已在运行 |
| `OXN_WORK_NOT_FOUND` | 输入校验 | Work 不存在 |
| `OXN_WORK_NOT_STARTED` | 状态机 | Work 未 run |
| `OXN_WORK_VALIDATE_FAILED` | 强制机制 | Work 校验失败 |
| `OXN_WORK_LOCKED` | 强制机制 | Work 已 lock |
| `OXN_WORK_REFS_UNRESOLVED` | 强制机制 | Work refs 未解析 |
| `OXN_WORK_LOCK_FAILED` | 强制机制 | Work lock 失败 |
| `OXN_WORK_UNLOCK_FAILED` | 强制机制 | Work unlock 失败 |
| `OXN_WORK_MIGRATE_FAILED` | 输入校验 | Work migrate 失败 |
| `OXN_WORK_NO_V0_LAYOUT` | 输入校验 | 无 V0 layout |
| `OXN_TASK_NOT_FOUND` | 输入校验 | Task 不存在 |
| `OXN_TASK_OXN_MISSING` | 输入校验 | task.md 缺失 |
| `OXN_BLUEPRINT_NOT_IN_WORK` | 输入校验 | Blueprint 未在 work.md 声明 |
| `OXN_DOMAIN_NOT_IN_WORK` | 输入校验 | Domain 未在 work.md 声明 |
| `OXN_PATH_NOT_FOUND` | 输入校验 | 编译路径不存在 |
| `OXN_INVALID_TASK_FILE` | 输入校验 | Task 文件名无效 |
| `OXN_PATH_NOT_IN_WORK` | 输入校验 | 路径不在 Work 目录内 |
| `OXN_CONFIRM_REQUIRED` | 输入校验 | 需要确认（--yes） |
| `OXN_ROUND_OUTCOME_INVALID` | 输入校验 | Round outcome 无效 |
| `OXN_NO_WORK` | 输入校验 | 无 Work 声明 |
| `OXN_ALIGN_LOCK_NOT_FOUND` | 强制机制 | planLock 缺失 |
| `OXN_ALIGN_LOCK_HASH_MISMATCH` | 强制机制 | planLock hash 不匹配 |
| `OXN_ALIGN_WORK_REMOVED` | 强制机制 | Work 目录被删 |
| `OXN_DSL_PARSE_FAILED` | 输入校验 | Work file 解析失败（⚠️ work.ts:2240 有拼写错误 `PARVE`） |
| `OXN_OUTPUT_FILE_EXISTS` | 输入校验 | 输出文件已存在 |
| `OXN_OUTPUT_DIR_EXISTS` | 输入校验 | 输出目录已存在 |

#### domain 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_INVALID_NAME` | 输入校验 | Domain name 格式无效 |
| `OXN_FORMAT_DEPRECATED` | 输入校验 | 格式废弃（仅 .md） |
| `OXN_DOMAIN_INVALID` | 输入校验 | Domain 无效 |
| `OXN_DOMAIN_INDEX_FAILED` | 输入校验 | Domain 索引失败 |

#### blueprint 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_INVALID_SLOTS` | 输入校验 | Slots 无效 |
| `OXN_DSL_PARSE_FAILED` | 输入校验 | .md 解析失败 |
| `OXN_BLUEPRINT_DAG_CYCLE` | 强制机制 | Blueprint DAG 有环 |
| `OXN_BLUEPRINT_INDEX_FAILED` | 输入校验 | Blueprint 索引失败 |

#### asset 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_ERROR` | — | 通用错误（catch-all） |
| `OXN_ASSET_NOT_FOUND` | 输入校验 | Asset 不存在 |
| `OXN_ASSET_CREATE_FAILED` | 输入校验 | Asset 创建子进程失败 |
| `OXN_CLI_INPUT_ERROR` | 输入校验 | CLI 输入错误（缺 name/kind） |

#### proof 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_PROBE_UNKNOWN` | 输入校验 | 未知 probe |
| `OXN_PROOF_NOT_FOUND` | 输入校验 | Proof 不存在 |
| `OXN_INPUT_JSON_INVALID` | 输入校验 | --input-json 解析失败 |
| `OXN_PROOF_PARSE_FAILED` | 输入校验 | Proof 解析失败 |
| `OXN_PROOF_EMPTY` | 输入校验 | Proof 无 probe 声明 |
| `OXN_PROOF_WORK_MISSING` | 输入校验 | Proof 的 Work 文件缺失 |
| `OXN_PROOF_NOT_RUN` | 输入校验 | frozen.json 缺失 |

#### insight 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_INSIGHT_INPUT_MISSING` | 输入校验 | Insight 输入缺失 |
| `OXN_INSIGHT_NO_PROOFS` | 输入校验 | 无 frozen proofs |
| `OXN_INSIGHT_NO_DATA` | 输入校验 | 无数据 |

#### roadmap 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_ROADMAP_NOT_FOUND` | 输入校验 | Roadmap 不存在 |
| `OXN_ROADMAP_SCENE_NOT_FOUND` | 输入校验 | Scene 不存在 |
| `OXN_ROADMAP_SUGGEST_BAD_INPUT` | 输入校验 | Suggest 输入错误 |
| `OXN_ROADMAP_SHOW_FAILED` | 输入校验 | Show 失败 |
| `OXN_ROADMAP_SUGGEST_FAILED` | 输入校验 | Suggest 失败 |
| `OXN_ROADMAP_SYNC_FAILED` | 输入校验 | Sync 失败 |
| `OXN_ROADMAP_VALIDATE_FAILED` | 输入校验 | Validate 失败 |

#### config 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_CONFIG_KEY_UNSUPPORTED` | 输入校验 | Config key 不支持 |
| `OXN_CONFIG_VALUE_INVALID` | 输入校验 | Config value 无效 |

#### init 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_INVALID_LOCALE` | 输入校验 | Locale 无效 |
| `OXN_INVALID_TOOL` | 输入校验 | Tool 无效 |
| `OXN_INIT_FAILED` | 输入校验 | Init 失败 |

#### token 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_TOKEN_JSON_INVALID` | 输入校验 | Token JSON 无效 |

#### pool 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_POOL_ENTRY_NOT_FOUND` | 输入校验 | Pool entry 不存在 |
| `OXN_INTENT_TARGET_MISSING` | 输入校验 | 目标文件不存在 |

#### daemon 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_DAEMON_START_FAILED` | 基础设施保护 | Daemon 启动失败 |

#### external 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_EXTERNAL_NOT_FOUND` | 输入校验 | External 资源不存在 |

#### migrate / unpack 命令

| Code | 类别 | 触发场景 |
|---|---|---|
| `OXN_MIGRATE_NO_TARGET` | 输入校验 | 无迁移目标 |
| `OXN_MIGRATE_FAILED` | 输入校验 | 迁移失败 |
| `OXN_UNPACK_FAILED` | 输入校验 | Unpack 失败 |

---

### 3.4 E_MD_xxx Codes（MD Pipeline，15 个）

**定义文件**：`packages/engine/src/oxl/md-bridge/mdast-validator.ts:32-55`
**格式**：`E_MD_<CODE>`

| Code | 类别 | 触发场景 |
|---|---|---|
| `E_MD_INVALID_SYNTAX` | 输入校验 | mdast 解析失败 |
| `E_MD_MISSING_REQUIRED` | 输入校验 | 必填字段缺失 |
| `E_MD_TYPE_MISMATCH` | 输入校验 | 字段类型不匹配 |
| `E_MD_REFERENCE_BROKEN_FATAL` | 强制机制 | 内部 Intent ref 断裂 |
| `E_MD_REFERENCE_BROKEN_WARN` | 输入校验 | 外部 URL/path 断裂（警告） |
| `E_MD_HASH_MISMATCH` | 强制机制 | Hash 不匹配 |
| `E_MD_DEPRECATED_SYNTAX` | 输入校验 | 废弃的 `:::intent{...}` 语法 |
| `E_MD_DUPLICATE_H3` | 输入校验 | H3 文本在 `##` 分类内不唯一 |
| `E_MD_H1_MISSING` | 输入校验 | H1 缺失 |
| `E_MD_H1_MISMATCH` | 输入校验 | H1 ≠ frontmatter.name |
| `E_MD_CATEGORY_UNKNOWN` | 输入校验 | 未知 H2 分类 |
| `E_MD_LIST_FORMAT_INVALID` | 输入校验 | 列表格式无效 |
| `E_MD_NESTED_LEVEL_OVERFLOW` | 输入校验 | 嵌套层级溢出 |
| `E_MD_REDUNDANT_FIELD` | 输入校验 | 冗余字段 |
| `E_MD_INVALID_RUNTIME_BLOCK` | 输入校验 | Runtime block 无效 |

**外部校验码**（`external-validate.ts`）：

| Code | 触发场景 |
|---|---|
| `E_MD_EXTERNAL_KIND_INVALID` | External kind 无效 |
| `E_MD_EXTERNAL_URL_PATH_CONFLICT` | URL/path 冲突 |
| `E_MD_EXTERNAL_URL_PATH_REQUIRED` | URL/path 缺失 |

**实体注册码**：

| Code | 定义文件 | 触发场景 |
|---|---|---|
| `E_OXL_ENTITY_NOT_REGISTERED` | `entity-registry.ts:26` | Entity type 未注册编译器 |

> **注意**：`E_MD_xxx` 当前作为原生 `Error` 抛出（非 IAPError），后续需决定是否纳入 IAPError 体系。

---

### 3.5 Daemon 错误（IPC 层，不纳入 OXN 业务错误规范）

#### HTTP 错误响应

| error string | statusCode | 触发场景 |
|---|---|---|
| `BadRequest` | 400 | 请求体缺失 / 字段缺失 |
| `NotFound` | 404 | 项目/资源不存在 |
| `InternalServerError` | 500 | 内部错误 |
| `MissingProjectPath` | 400 | 缺少 project path |
| `ProjectNotFound` | 404 | 项目不存在 |
| `InvalidJSON` | 400 | JSON 无效 |
| `MissingField` | 400 | 字段缺失 |
| `CircuitBreakerOpen` | 503 | 熔断器开启 |

#### Socket 错误码

| Code | category | 触发场景 |
|---|---|---|
| `OXN_INVALID_PARAMS` | USER | 项目无效 |
| `OXN_INTERNAL_ERROR` | SYSTEM | Daemon 内部错误 |

#### Daemon 事件状态（非错误码）

| 事件类型 | 状态值 |
|---|---|
| PartEvent.status | STARTED / COMPLETED / DEVIATED / TIMEOUT |
| TaskEvent.status | CREATED / RUNNING / COMPLETED / DEVIATED / ABANDONED |
| ProbeEvent.result | COMPLETED / DEVIATED |

---

## 新增错误码登记区

> 新增错误码在此追加。格式：`| <code> | <type> | <category> | <axis> | <action> | <trigger> | <throw-site> |`

| Code | Type | Category | Axis | Action | Trigger | Throw site |
|---|---|---|---|---|---|---|
| _(empty)_ | | | | | | |

---

## 待修正项（ADR-0080 确认）

| 修正项 | 当前 | 修正为 | 位置 |
|---|---|---|---|
| 前缀不一致 | 文档 `IAP_ALIGN_LOCK_NOT_FOUND` | `OXN_ALIGN_LOCK_NOT_FOUND` | `iap-cheatsheet.md:89-91`, `cli-user-guide.md:245-247` |
| 前缀不一致 | 文档 `IAP_ALIGN_LOCK_HASH_MISMATCH` | `OXN_ALIGN_LOCK_HASH_MISMATCH` | 同上 |
| 前缀不一致 | 文档 `IAP_ALIGN_WORK_REMOVED` | `OXN_ALIGN_WORK_REMOVED` | 同上 |
| 拼写错误 | `OXN_DSL_PARVE_FAILED` | `OXN_DSL_PARSE_FAILED` | `work.ts:2240` |
| 命名不一致 | `IAP_ALIGN_ROUND_MAX_EXCEEDED`（在 OXN_* 联合类型中） | `OXN_ROUND_MAX_EXCEEDED` | `dual-state-exec.ts:62` |
| 裸码拆分 | `INFRA_FAIL`（跨 4 种类别复用） | 拆分为 4 个 `INFRA_FAIL_*` 子码 + 1 个 `IAP_PROOF_FINALIZE_BLOCKED`（验证结果与错误码分离，见 §3.1 PROOF 轴） | `dual-state-io.ts`, `work-domains.ts`, `catalog.ts`, `intent-overwriter.ts` |
| 重复声明 | E_MD_xxx 联合类型 5 个重复成员 | 删除重复 | `mdast-validator.ts:50-55` |
| 僵尸码 | 5 个 IAPError codes 无 throw site | 标记 deprecated | `iap-error.ts` |
| 僵尸码 | 5 个 ExecErrorCode 无 throw site | 标记 deprecated | `dual-state-exec.ts:54-59` |
| 过时注释 | IAPError doc comment "6 items" | 更新为实际数量 | `iap-error.ts:34-48` |
