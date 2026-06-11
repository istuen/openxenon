# Daemon 功能分析与设计方案

> 范围：OpenXenon Daemon（`src/daemon/`）的现状审计 + 4 个 PR 的设计稿。
> 模式：P0 Proof 闭环 + AI 通过 CLI 回写（信息隐藏原则）。
> 评审：架构师 + OXN 维护者。

## 0. 元信息

- 创建时间：2026-06-11
- 关联路径：`src/daemon/` `src/server.ts` `src/cli/daemon*` `src/cli/step*`
- 关联文档：`docs/core/document.md §2.4-2.6 §3.3 §4.3`、`docs/architecture/l0-l3-constitution.md §2.4`、`docs/architecture/state.md`、`docs/horizon/iap-as-signal-system.md §3`
- 关联宪法：L0-L3 宪法（L3 Runtime = `src/cli` `src/daemon` `src/hall` `src/skills` `src/watcher` `src/core` `src/i18n`）
- IAP 范式：Daemon = Proof 轴的执行机制，承担"逃逸机制"与"Work 生命周期管理"

## 1. 设计决策（已与产品方确认）

| 决策点 | 选择 | 含义 |
|---|---|---|
| 实施节奏 | 4 个 PR 一次规划、分批合入 | 给出完整设计稿，每 PR ≤ 500 行 |
| AI 完成信号 | AI 调 `oxn step start/verify` 回写 | 信息隐藏原则（AI 不直连 daemon，只走 CLI） |
| 范围边界 | **P0 闭环**：daemon 只服务 Proof-First | Work/Task v1.1 留到 P1；不实现 `work/execute` |
| Hall Web UI | 不在范围 | daemon 不做 UI；Hall v0.2 独立 |

## 2. 现状审计（25 项痛点）

### 2.1 必修（🔴 阻断 P0 闭环）

| 编号 | 问题 | 证据 |
|---|---|---|
| P-1 | `daemon-stop` 是 stub | `src/cli/daemon-stop.ts:9`（"需要与 Core 守护进程通信"） |
| P-2 | `daemon/engine/executor.ts` 实现完整但**无人调用** | `engine/executor.ts:166` 导出 `executeBlueprint`，但 12 handler 都自己写 trace |
| P-3 | 12 个 `task-*` `step-*` handler 是纯 stub | `task-submit.ts:50` 写文件 + recovery，不触发执行 |
| P-4 | `hallEmitter` 无人在执行期 emit——SSE 流永远是空 | handler 不触发 executor |
| P-11 | `daemon/recovery.ts` 反向 import `cli/project`（违反 daemon↔cli 边界） | `recovery.ts:3` `import { getProjectBoundaryPath } from '../cli/project'` |
| P-19 | IAP 逃逸机制未实装——FAIL 时无阻止 + 预警 + 诊断三步 | document.md §3.3 描述 vs 代码缺失 |
| P-21 | `event-stream.ts` 监听 `stage:*`，但 `hall.ts` emit `part:*` | `event-stream.ts:30` vs `hall.ts:41`，事件名错位 |

### 2.2 应修（🟡 重复 / 死代码）

| 编号 | 问题 | 证据 |
|---|---|---|
| P-5 | `daemon/server.ts` 是死代码（HTTP server） | `index.ts:15` export 但 `src/server.ts:2` 用 `ipc/server.ts` |
| P-6 | `supervisor.ts` 与 `process.ts` 重复实现"启动 daemon + 进程管理" | `supervisor.ts:76` vs `process.ts:20` |
| P-8 | `daemon/watcher.ts` 写完没下文 | `server.ts:60 handleFileChange` 只打日志 |
| P-10 | `recovery.ts` 路径硬编码旧单层布局 | `recovery.ts:42-49` `.openxenon/tasks/<id>/state.json` |
| P-12 | `task-list-handler.ts` 写死单层布局，与 v0.1 双层冲突 | `task-list-handler.ts:8` |
| P-15 | 错误出口不一致：handler try/catch 直接返回 500 JSON | `task-submit.ts:91` |
| P-16 | 无 daemon `restart` 命令 | `supervisor.ts:157` 有逻辑但无 CLI |
| P-17 | 无 daemon `logs -f` 跟踪命令 | 没有 |
| P-18 | 无 task/blueprint 强制 cancel（SIGKILL 兜底） | `task-stop.ts:38` |
| P-20 | `daemon-payload.ts` Blueprint 与 `kernel/index` schema 不一致 | `daemon-payload.ts:15-32` vs `kernel/index.ts` |
| P-22 | `recovery.ts` 与 `trace/writer` 状态模型重复 | `recovery.ts:53-66` |
| P-23 | `process-manager.ts:48` `code === 0` 与非 0 都置 `'stopped'` | 弱信号 |
| P-25 | `trace/blueprint-parser.ts` 是手写 YAML 解析器 | 210 行 if/else |

### 2.3 弱信号（🟢 加分）

| 编号 | 问题 |
|---|---|
| P-7 | supervisor.stopDaemon 无 CLI 入口 |
| P-9 | circuit-breaker 跟实际 task 状态没联动 |
| P-13 | radar/clock 被动轮询，不与 manifest-watcher 联动 |
| P-14 | manifest-watcher 永远等不到 AI 写入 |
| P-24 | executor spawn AI 进程后 fire-and-forget |

## 3. 目标 Daemon 行为（用户故事）

```
1. 用户: oxn daemon start                    → 守护进程常驻
2. 用户: oxn proof create check-deploy
3. 用户: oxn proof probe add fs-exists --target ./dist/index.js
4. 用户: (AI 写代码；通过 oxn step start/verify 回写)
5. 用户: oxn proof run check-deploy
         └─ CLI → socket → daemon /api/v1/fs/execute (EXECUTE_TASK)
         └─ daemon: 调 executor.executeBlueprint
              └─ 每个 part 跑真实 probe（infra.probes.fs-exists 等）
              └─ PASS 全过 → 写 frozen.json → verdict: PASS
              └─ 任一 FAIL → 写 trace + escape: BLOCK_DONE → verdict: FAIL
6. 用户: oxn daemon stop / restart / logs -f
```

## 4. PR 拆分（每个 ≤ 500 行）

### PR-1：清场（架构对齐）

**目标**：消除重复、死代码、架构违规；为 PR-2 腾出干净的画布。

| 改动 | 详情 |
|---|---|
| 删除 | `src/daemon/server.ts`（HTTP 死代码） |
| 合并 | `src/daemon/supervisor.ts` → `src/daemon/process.ts`（统一 `startDaemon/stopDaemon/restartDaemon/getStatus`） |
| 迁移 | `src/daemon/recovery.ts` → `src/daemon/trace/recovery.ts`；删 `import { getProjectBoundaryPath } from '../cli/project'`（P-11 修复） |
| 重导出 | `src/daemon/types/daemon-payload.ts` 中 Blueprint 改 `export type { Blueprint } from '../../kernel/index'` re-export |
| 新增 | `src/daemon/__tests__/process.test.ts`（start/stop/restart/health 行为） |
| 验证 | `bun scripts/validate-dependencies.ts` 0 违规；`bun run lint` 通过；`bun test src/daemon/__tests__/` 5 老 + 1 新全绿 |

**关键 diff 思路**：
```ts
// process.ts 合并后
export class DaemonProcess {
  start(serverPath): StartDaemonResult
  stop(timeoutMs?: number): { success: boolean; forcedKill?: boolean }
  restart(serverPath): StartDaemonResult
  getStatus(): DaemonStatus
}
export const daemonProcess = new DaemonProcess()
export function startDaemon / stopDaemon / restartDaemon (兼容旧 export)
```

### PR-2：handler 重写 + 真实 IAP 闭环

**目标**：让 `fs/execute` 真跑 Blueprint；统一 4 档错误出口；新增 `oxn step` CLI。

| 端点 | 行为（重写后） |
|---|---|
| `GET /api/v1/health` | `{ status, uptime, version, circuitState }` |
| `GET /api/v1/events/stream` | **修正事件名**：`part:*` / `task:*` / `probe:*`（与 `hall.ts` 一致） |
| `POST /api/v1/fs/execute` (EXECUTE_TASK) | **重写**：调 `executor.executeBlueprint`，每个 part 调 `infra.probes.*` + `kernel/evaluateProbe` 写真实 verdict |
| `POST /api/v1/fs/execute` (EXECUTE_STEP) | **重写**：单 part 真实执行（spawn `action.command` → 监听 manifest 写 → 跑 probes） |
| `POST /api/v1/fs/execute` (VERIFY_STEP) | **重写**：重跑 probes 重新判定 |

**7 个 `@deprecated` handler**（保留 200 空响应 + stderr warn）：
- `task/submit` `task/start` `task/stop` `task/status` `task/list` `task/next` `task/trace` `step/start` `step/verify` `recovery/rollback`
- 输出 `{ deprecated: true, useFsExecute: true, alternative: 'POST /api/v1/fs/execute' }`
- 等 P1 全部迁完后删除

**AI 完成信号链路**：
```
AI 工具(任何) ── shell ──▶ oxn step start <task> <part>
                              └─ CLI → socket /api/v1/step/start
                                  └─ daemon: writePartStart + hall.emitPartStarted
                                      + radarClock.startMonitor
AI 写代码
                              └─ shell ──▶ oxn step verify <task> <part> --passed
                                  └─ CLI → socket /api/v1/step/verify
                                      └─ daemon: 调 infra.probes.* 重判
                                          + hall.emitProbeResult
                                          + radarClock.stopMonitor
```

**新增 2 个 CLI 命令**（`src/cli/step.ts`）：
- `oxn step start <taskId> <partId>` → POST `/api/v1/step/start`
- `oxn step verify <taskId> <partId> --passed/--failed` → POST `/api/v1/step/verify`
- 修复 P-21：deprecate handler 但保留 200，CLI 端打 warn 引导用户改用 `oxn proof run` 一体化

**统一 4 档错误出口**：
```ts
// daemon/ipc/server.ts writeSocketResponse 改造
import { IAPError, OXNCrash } from '../../core/errors'
try {
  const response = await handleRequest(...)
  writeSocketResponse(socket, response.status, await response.json())
} catch (err) {
  if (err instanceof IAPError) writeSocketResponse(socket, 1, { ok: false, error: err.toJSON() })
  else if (err instanceof OXNCrash) writeSocketResponse(socket, 2, { ok: false, error: err.toJSON() })
  else writeSocketResponse(socket, 500, { ok: false, error: { code: 'OXN_INTERNAL_ERROR', ... } })
}
```

**新增文件**：
- `src/cli/step.ts`
- `src/daemon/ipc/handlers/__tests__/fs-execute-e2e.test.ts`（黑盒 E2E）

**验证**：
- 新 E2E：`bun test src/daemon/ipc/handlers/__tests__/fs-execute-e2e.test.ts`
- 旧 E2E：`bun test src/cli/__tests__/proof-run-e2e.test.ts` 跑通
- 旧 e2e 加一个 `step` 子命令的 case

### PR-3：CLI daemon 子命令补齐

**目标**：补全 daemon 生命周期命令（stop / restart / logs / kill）。

| 命令 | 行为 |
|---|---|
| `oxn daemon start` | 已有；加 `--foreground`（不 daemonize 方便调试） |
| `oxn daemon stop` | **实装**：SIGTERM → 等 5s → SIGKILL 兜底；删 TODO |
| `oxn daemon restart` | **新增**：`stopDaemon` + `startDaemon` 复合 |
| `oxn daemon status` | 已有；加 `--watch` 每 2s 刷新 |
| `oxn daemon logs` | **新增**：默认 tail -50；`-f` 持续跟踪 `~/.openxenon/daemon.log`（`fs.watchFile`） |
| `oxn daemon kill` | **新增**：硬杀 SIGKILL（用于 stop 卡死时） |

**新增文件**：
- `src/cli/daemon-stop.ts`（重写）
- `src/cli/daemon-restart.ts`
- `src/cli/daemon-logs.ts`
- `src/cli/daemon-kill.ts`
- `src/daemon/__tests__/process-stop-kill.test.ts`

**验证**：
- E2E：`bun test src/cli/__tests__/daemon-lifecycle-e2e.test.ts`（start → status → stop → PID 消失）

### PR-4：逃逸机制 + 监督联动

**目标**：实装 IAP §3.3 逃逸三步（预警+阻止+诊断）；让 Watcher 真联动。

| 改动 | 详情 |
|---|---|
| 逃逸实装 | `engine/executor.ts:198` verdict=FAIL 时：① 写 trace event `ESCAPE` 带 `action: 'BLOCK_DONE'`；② 调 `recoveryManager.createPoint`；③ `circuitBreaker.recordFailure`；④ `hall.emitTaskFailed`；⑤ **不**写 `frozen.json` |
| Watcher 联动 | `src/daemon/watcher.ts` 监听 `.openxenon/proofs/<name>/probe.yaml` 或 `frozen.json` 变更 → 触发 `revalidate`。`src/server.ts:60 handleFileChange` 真调 `recovery.revalidate` |
| Circuit 联动 | `fs/execute EXECUTE_TASK` 在 `circuitBreaker.isOpen()` 时直接拒（搬运 `task-submit.ts:15` 模式） |
| Trace 归档 | `src/daemon/trace/writer.ts` 加 `archiveIfLarge(tracePath, maxBytes=10MB)`，gzip 滚动到 `trace.jsonl.<ts>.gz` |

**新增文件**：
- `src/daemon/trace/archiver.ts`
- `src/daemon/__tests__/escape-mechanism.test.ts`
- `src/daemon/__tests__/watcher-revalidate.test.ts`

**验证**：
- E2E：构造必 fail 的 proof（用 `fs_match` 匹配肯定不存在的文件）跑 → 断言 `frozen.json` 不生成 + trace 含 `ESCAPE` event + circuit OPEN

## 5. 文件级影响清单（按 PR）

| 文件 | PR-1 | PR-2 | PR-3 | PR-4 |
|---|---|---|---|---|
| `src/daemon/server.ts` | 🗑️ | | | |
| `src/daemon/supervisor.ts` | 🗑️（→ process.ts） | | | |
| `src/daemon/process.ts` | ✏️ 合并 supervisor | | ✏️ +stopDaemon SIGKILL 兜底 | |
| `src/daemon/recovery.ts` | 🗑️ | | | |
| `src/daemon/trace/recovery.ts` | ✨ 新建 | | | |
| `src/daemon/types/daemon-payload.ts` | ✏️ re-export kernel | | | |
| `src/daemon/engine/executor.ts` | | ✏️ 真调 infra.probes | | ✏️ +ESCAPE 事件 |
| `src/daemon/ipc/handlers/fs-execute.ts` | | ✏️ 重写 | | ✏️ +escape 联动 |
| `src/daemon/ipc/handlers/event-stream.ts` | | ✏️ 修正事件名 | | |
| `src/daemon/ipc/handlers/task-*.ts` | | ✏️ @deprecated 壳 | | |
| `src/daemon/ipc/handlers/step-*.ts` | | ✏️ @deprecated 壳 | | |
| `src/cli/step.ts` | | ✨ 新建 | | |
| `src/cli/daemon-stop.ts` | | | ✏️ 实装 | |
| `src/cli/daemon-restart.ts` | | | ✨ 新建 | |
| `src/cli/daemon-logs.ts` | | | ✨ 新建 | |
| `src/cli/daemon-kill.ts` | | | ✨ 新建 | |
| `src/cli/daemon-status.ts` | | | ✏️ +--watch | |
| `src/cli/index.ts` | | ✏️ +step 子命令 | ✏️ +restart/logs/kill | |
| `src/daemon/watcher.ts` | | | | ✏️ 联动 revalidate |
| `src/server.ts` | | | | ✏️ handleFileChange 真调 |
| `src/daemon/trace/archiver.ts` | | | | ✨ 新建 |

## 6. 不在本次范围（v0.1 P0 边界外）

| 不做 | 原因 | 后续 PR |
|---|---|---|
| `oxn work run` 走 daemon | P1 Work 子命令尚未稳定（v1.1 work skill 还在迭代） | P1 PR |
| `oxn task submit/start/stop` 走 daemon | task 模型在 P0 仍是单层 `.openxenon/tasks/`，v0.1 双层 `works/<w>/tasks/<t>/` 待迁移 | v0.2 |
| Hall Web UI（HTTP + SSE） | 用户选择 v0.2 独立 PR | v0.2 |
| Work lock (planLock.hash) | horizon §3.1 远期；Work 命令还没稳定 | v0.2 |
| Damping 动态调整、OFDM | horizon §5 远期 | v0.3+ |
| `kernel/index` Blueprint schema 修订 | `daemon-payload.ts` re-export kernel 即可，先用现有 schema | 视需要 |

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 架构违规残留 | PR-1 第一步先 `bun scripts/validate-dependencies.ts` 跑一遍 0 违规基线；改完再跑 |
| handler 改动面广 | 12 → 5 真 + 7 @deprecated 兼容壳；CLI 优先切到新端点，老端点打 warn 留 1 minor 后删 |
| E2E 时长膨胀 | 复用现有 `proof-run-e2e` 框架；新 e2e 用 in-process socket（`bun:test` 自带），不加网络 |
| trace 双写（recovery + writer） | PR-1 合并 `recovery.ts` → `trace/recovery.ts`，统一用 JSONL 事件流 |
| Daemon 自己崩 supervisor 拉不起来 | PR-1 合并 supervisor + process，supervisor 失败时 fallback 到 `process.spawn` 直拉；`restartCount > 10` 给 SIGKILL |
| AI CLI 子命令是 P0 新增 | `.changes/0.1.5-ai-step-cli.md` + `docs/reference/cli-reference.md` 加 `oxn step` |

## 8. 实施 checklist（每个 PR 落地前必做）

- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过（无新增架构违规）
- [ ] `bun scripts/validate-dependencies.ts` 0 违规
- [ ] `bun test src/daemon/__tests__/` 全绿
- [ ] E2E `bun test src/cli/__tests__/daemon-lifecycle-e2e.test.ts` 全绿（如适用）
- [ ] E2E `bun test src/daemon/ipc/handlers/__tests__/fs-execute-e2e.test.ts` 全绿（如适用）
- [ ] `.changes/<version>-<slug>.md` 变更日志片段
- [ ] lefthook pre-commit（biome-check + eslint-arch + typecheck）通过

## 9. 待你最后确认

- PR-1 范围：删 `daemon/server.ts` + 合并 `supervisor` + 迁 `recovery` 三个动作是否一并合入？还是 PR-1.1 只删 server.ts、PR-1.2 再合并 supervisor？
- PR-2 兼容策略：7 个老 handler 标 `@deprecated` 留 1 minor 后删，是否可接受？
- PR-3 logs 命令：是否需要 `--since <duration>`、`--grep <pattern>` 高级过滤，还是只做 `-f` + tail？
- PR-4 逃逸测试：构造必 fail proof 用什么探针？建议用 `fs_match` 匹配一个肯定不存在的文件。