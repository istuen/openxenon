---
entity: domain
version: 0.3.0
name: DaemonContext
oxn-source-sha: da22730fcf222638ddc5e700cc4abe1941dfae58fabdcdc65c2616314c5638de
synced-at: 2026-06-26T01:19:20.100Z
---

# Domain: DaemonContext

> Daemon 守护进程限界上下文: 进程生命周期 + Proof 驱动 step pipeline + escape 逃逸 + trace archiver

## Terms

### Daemon
- desc: OXN 全局 Core 守护进程, 负责文件监听 (watcher) + 监督器 (supervisor) + 状态机驱动

### Startup
- desc: 启动期 cold-load: 注册 4 builtin Provider + bootstrap registry.json + 收集 warnings (不抛错)

### StepPipeline
- desc: 增量式 Proof 驱动执行管线: createStepPipeline → runAll → rollback on failure

### Step
- desc: 管线中的单个步骤: execute() + rollback(), 失败时回退所有已执行步骤

### Escape
- desc: planLock 边界外逃逸阻断: requestEscape/allowEscape, operator override 强制通过

### TraceArchiver
- desc: trace.jsonl 归档器: 行数超过阈值 (10000) → 归档前半 → 保留后半

### Watcher
- desc: 文件监听器: 检测 .oxn 资产漂移 → 触发 validate+lock 守卫

### Supervisor
- desc: 监督器: 管理 Daemon 子进程生命周期 (健康检查 + 自动重启)

### CircuitBreaker
- desc: 熔断器: 记录连续失败次数, 超过阈值自动断开 (防止雪崩)

### PIDFile
- desc: Daemon 进程 ID 文件 (.openxenon/daemon/daemon.pid), CLI kill/stop 通过它发信号

### Log
- desc: Daemon 日志文件 (.openxenon/daemon/daemon.log), CLI logs 通过它 tail 输出

### DaemonStop
- desc: oxn daemon stop: 通过 socket 或 PID 文件发 SIGTERM

### DaemonRestart
- desc: oxn daemon restart: stop → start 原子操作

### DaemonLogs
- desc: oxn daemon logs --lines N: tail 最近 N 行 daemon.log

### DaemonKill
- desc: oxn daemon kill: 通过 PID 文件发 SIGKILL 强制终止

## Bans

### forbidden-constructs
- items:
  - CrashLoop
  - ForkDaemon
  - SystemdUnit
  - LaunchD
- desc: CrashLoop, ForkDaemon, SystemdUnit, LaunchD

## Invariants

### inv-1
- value: Daemon 不能 import CLI (它们通过 socket / JSON payload 通信)

### inv-2
- value: Daemon 不能直接 import 'fs' / 'node:fs' (必须通过 L1-Infra filesystem.ts 收口)

### inv-3
- value: daemonStartup 启动期只读 + 不触网 (v2 核心倒置: CORRUPTED 不阻断 Daemon)

### inv-4
- value: Proof step pipeline 失败 → rollback 所有已执行步骤 (保持原子性)

### inv-5
- value: escape 请求默认拒绝 (allowed=false), operator override 严格模式

### inv-6
- value: trace archiver 阈值 10000 行: 归档前半 → 保留后半 → 防止日志爆炸
