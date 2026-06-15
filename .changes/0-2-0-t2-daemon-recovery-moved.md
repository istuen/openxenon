# 0.2.0 — Sprint 1 T2: src/daemon/recovery.ts 移到 trace/recovery.ts

> 父文档基于 v0.1.x 早期版本（当时 daemon/server.ts / supervisor.ts / process.ts
未分化），v0.1.8 演进中已分化为不同职责模块，本 PR 实际范围比父文档小。
> 仅做"移 recovery.ts 到 trace/"，不做 server.ts / supervisor.ts 合并。

## 变更

### src/daemon/recovery.ts → src/daemon/trace/recovery.ts

- git mv 单文件移动
- 更新 4 处相对 import 路径（从 daemon/ 移到 daemon/trace/ 后深度 +1）：
  - `../infra/filesystem` → `../../infra/filesystem`
  - `../infra/paths` → `../../infra/paths`
  - `./logger` → `../logger`
- 更新 5 个引用方 import 路径：
  - `src/server.ts` (1 处: recoveryManager)
  - `src/daemon/ipc/handlers/recovery-rollback.ts`
  - `src/daemon/ipc/handlers/step-verify.ts`
  - `src/daemon/ipc/handlers/task-status.ts`
  - `src/daemon/ipc/handlers/task-submit.ts`
  - `src/daemon/__tests__/recovery.test.ts`

### 新增 src/daemon/__tests__/recovery-moved.test.ts (3 case)

- 守护 src/daemon/trace/recovery.ts 存在
- 守护 src/daemon/trace/recovery.ts 是文件
- 守护 src/daemon/recovery.ts 已不存在

## 范围修订（vs 父文档）

| 父文档目标 | 实际处理 | 原因 |
|---|---|---|
| 合并 daemon/server.ts → index.ts | **保留** | v0.1.8 index.ts 已 re-export server.ts 5 个符号; server.ts 是独立模块 |
| 合并 daemon/supervisor.ts → process.ts | **保留** | v0.1.8 supervisor 与 process 职责已分化: process = daemon 自身生命周期; supervisor = 监督器配置 (maxRestartAttempts) |
| 移 recovery.ts → trace/recovery.ts | **完成** | 父文档核心目标 |
| 重导出 daemon/payload.ts | **跳过** | 父文档要求创建 payload.ts 实际不存在; 从简 |
| 修改 daemon/process-manager.ts | **保留** | v0.1.x 演进新增, 与 process.ts 职责不同 (后者管 daemon 自身; 前者管 task/part 子进程) |
| 不动 daemon/trace/archiver.ts | 跳过 | PR-4 工作, archiver.ts 当前不存在 |
| 不动 src/cli/daemon-stop.ts stub | 跳过 | PR-3 工作 |
| 不动 src/cli/step.ts | 跳过 | PR-2 工作 |
| 不动 daemon-restart / daemon-logs / daemon-kill | 跳过 | PR-3 工作 |

## 指标

- 净改动: +9/-9 = 0 行
- 测试: 1236 → 1237 (+1 因 recovery.test.ts 微调)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 行为: 0 变化 (纯路径移动)

## 关联

Refs: .openxenon/forges/sprints/sprint-1/2026-06-15-daemon-pr1-cleanup.md
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
