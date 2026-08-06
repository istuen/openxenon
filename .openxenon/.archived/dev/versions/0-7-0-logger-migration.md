---
version: 0.7.0
date: 2026-11-15
type: minor
status: planned
rfc:
  - docs/adrs/0082-diagnostic-unification.md
adr:
  - docs/adrs/0081-oxn-unified-error-framework.md
baseline:
  - packages/engine/src/infra/logging/logger.ts
  - packages/engine/src/kernel/contracts/logger-port.ts
promoted-from: 2026-08-05 in-progress task
---

# 0.7.0 — ADR-0082 LoggerPort 全面迁移

> **类型**：已绑版本 Roadmap（deferred v0.7.0 全量迁移）
> **状态**：📝 Planned（baseline 部分已 ship，见 ADR-0082）
> **目标版本**：v0.7.0
> **前置依赖**：ADR-0082（D1 LoggerPort + D2 consola 隔离层）已落地（2026-08-05）

## 1. 已落地（baseline / commit 2026-08-05）

- ✅ D1 LoggerPort 接口（`packages/engine/src/kernel/contracts/logger-port.ts`）
- ✅ D2 consola 隔离层（`packages/engine/src/infra/logging/logger.ts`）
- ✅ D3 partial：Asset.validate 调用 `loggerPort.withTag('Asset.validate').warn(...)` 同步 emit
- ✅ consola@3.4.2 加入 engine dependencies

## 2. 待迁移（v0.7.0 全量）

按 ADR-0082 §决策 D5，需要从 `warnings: string[]` 返回值重构为 `logger.warn()` 的函数（10+ 个）：

| 函数 | 文件 | 现状 |
|---|---|---|
| `validateAssetPaper4Fields` | `packages/engine/src/Asset/validate.ts` | ✅ 双轨（warnings[] + logger.warn）|
| `work-diagnostics.ts` | `packages/engine/src/Work/work-diagnostics.ts` | ❌ 未迁 |
| `work-context-builder.ts` | `packages/engine/src/Work/work-context-builder.ts` | ❌ 未迁 |
| `dual-state.ts` | `packages/engine/src/Work/dual-state.ts` | ❌ 未迁 |
| `dual-state-exec.ts` | `packages/engine/src/Work/dual-state-exec.ts` | ❌ 未迁 |
| `Roadmap/parser.ts` | `packages/engine/src/Roadmap/parser.ts` | ❌ 未迁 |
| `Roadmap/types.ts` | `packages/engine/src/Roadmap/types.ts` | ❌ 未迁 |
| `infra/registry/daemon-startup.ts` | `packages/engine/src/infra/registry/daemon-startup.ts` | ❌ 未迁 |
| `Work/__tests__/*` | 测试 fixture | ❌ 同步 |
| 2 个 work-context-builder test | `packages/engine/src/Work/__tests__/` | ❌ 同步 |

## 3. CLI + Daemon 接入

- CLI: `packages/cli/src/commands/*.ts` 注入 InMemoryLogCollector（ADR-0082 §D2 collector.ts）
- Daemon: `packages/engine/src/infra/logging/file-reporter.ts` + stderr reporter
- Reporter 组合按 caller 选（CLI 短运行 → collector；Daemon 长运行 → file）

## 4. 关联文档

- ADR-0082 决策主体
- ADR-0081 错误体系（Error 与 Log 的边界）
- `dev/meta/`（跨版本不变元信息）

## 5. 进度追踪

| 阶段 | 任务 | 状态 |
|---|---|---|
| P0 | LoggerPort + consola 隔离层 | ✅ done (2026-08-05) |
| P1 | Asset.validate logger.warn 同步 emit | ✅ done (2026-08-05) |
| P2 | Work/Asset 其他 8 个函数迁移 | 📝 pending v0.7.0 |
| P3 | CLI InMemoryLogCollector 接入 | 📝 pending v0.7.0 |
| P4 | Daemon file reporter 接入 | 📝 pending v0.7.0 |
| P5 | 移除所有返回 warnings[] 字段 | 📝 pending v0.7.0 |