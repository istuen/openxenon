# 0.2.x — v0.2 Proof Engine 路线图占位

> **状态**：Roadmap 草案 — 拆分自 `.openxenon/forges/sprints/EXECUTION-ORDER.md`。
> 本片段**不**包含任何代码/配置变更；仅在 `dev` 拉出 `feat/v0.2-proof-engine` 主分支时随包发布说明同步。
>
> 完整执行顺序、风险闸门、严格前置条件见：
> - `.openxenon/forges/sprints/EXECUTION-ORDER.md` — 总索引 + 拓扑排序
> - 15 份 sprint 子文档（sprint-1 至 sprint-7，含 sprint-3a/b/c/d 与 sprint-5a/b/c/d）

## 主线

| Sprint | 周次 | 任务 | 子分支 |
|---|---|---|---|
| 1 | W1 | infra-io-layer-reorg phase 2-6 + daemon PR-1 清理 | `feat/v0.2-t1-infra-io-phase2-6` / `feat/v0.2-t2-daemon-pr1-cleanup` |
| 2 | W2 | soft-gaps (grammar `task.deps` + merger AST) | `feat/v0.2-t3-soft-gaps` |
| 3a-d | W3-W4 | probe-signal-taint v2 PR-1 至 PR-4（v2 核心 PR-4 ⚠） | `feat/v0.2-t4..t7-taint-pr*` |
| 4 | W4 | intent-pool v3 minimal（forges/ WARN 开关埋设） | `feat/v0.2-t8-pool-minimal-research` |
| 5a-d | W5 | probe-signal-taint PR-5/6 + three-layer PR-1/2 | `feat/v0.2-t9..t12-...` |
| 6 | W6-W7 | intent-pool v3 full + forges/ WARN flip | `feat/v0.2-t13-pool-full-forges-warn` |
| 7 | W8 | daemon PR-2/3/4 闭环 + probe-taint PR-7 spike | `feat/v0.2-t14..t15-...` |

## v0.2 release 风险底线

- **必达**：Sprint 1 + 2 + 3a-d + 4 + 5a-d（共 11 个 PR，约 10-10.5 周）
- **可选**：Sprint 6 (intent-pool full) + Sprint 7 (daemon 闭环)
- **不强制**：Three-Layer PR-2 finalize（可推迟到 v0.3）
- **不进入 main**：T15 probe-taint PR-7 spike（仅产出 README 决策）

## 主分支策略

- 主分支 `feat/v0.2-proof-engine` 从 `dev` 拉出（不基于 `main`）
- 所有子分支从主分支派生
- 串行约束：T10 → T11（OXL grammar 两次 `langium:generate` 分两次 PR）
- 并行机会：T7 + T8 同周启动（节省 0.5-1 周）

## 风险闸门

- **T7.0 Bun `vm.SourceTextModule` PoC** — 不通过降级到方案 B（Worker）/ C（spawn 子进程）/ D（推迟 PR-4）
- **T10 → T11 串行** — grammar 改动绝对禁止并行 PR

## 范围外（v0.3 议题）

- PR-7：14 probe 收敛到 3 IO 原语
- Three-Layer PR-3/4/5：`oxn proof audit` / calibration UI / 强制 `domain_impact`
- Phase 2/3 生态：社区仓库 + 企业私有源
- Provider hot-reload（开发态）
- WAF 头黑名单扩展

## 分支操作记录

- 2026-06-15：从 `dev` (19f407b) 创建主分支 `feat/v0.2-proof-engine`
- 2026-06-15：创建子分支 `feat/v0.2-t1-infra-io-phase2-6`（占位）
- 待 sprint-1 开工时按需创建其余 14 份子分支
