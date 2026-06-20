# Changelog

> OpenXenon 变更日志。每条变更对应一个 git commit；详细 PR 列表见 `.openxenon/forges/sprints/EXECUTION-ORDER.md`。

## [0.2.0] - 2026-06-XX

> **主题**：Proof Engine 主线 + Token Ingest
> **范围**：15 个 T-series PR + 1 个 Sprint 9 work
> **T15 spike 不入 v0.2.0**（推迟 v0.3）

### Added

**Sprint 1 (W1) — 基础设施重构**：
将 `src/cli/` 22 个文件 + `src/` 内 28 个非 cli 文件的 fs 直引收口至 `src/infra/filesystem/filesystem-async.ts`，删 3 个真死 Port。`src/daemon/recovery.ts` 移位至 `src/infra/trace/recovery.ts` 满足 L1-Infra 架构合规。

**Sprint 2 (W2) — 软缺口**：
OXL grammar 加多语法兼容（task.deps 多种写法）；merger 从 regex 改 Langium AST 解析（3 个 sync 函数改 async）。

**Sprint 3 (W3-W4) — Probe 污染防护**：
引入 IO Primitive + InterferenceFlag 12 项 + TRUST_BASELINE + ProbeVerdict 三态（PASS/FAIL/INCONCLUSIVE）；frozen.json schema 升级至三态；新增 ProviderRegistry + 4 内置 Provider（FileProvider/HttpProvider/ShellProvider/GitProvider）；probe-sandbox（Bun vm.SourceTextModule PoC + FORBIDDEN_GLOBALS 7 项 + FORBIDDEN_MODULES 10 项）；probe-registry-store（registry.json v1 schema）；`oxn probe add/list/fix` CLI 三个新命令。Intent Pool v3 最小切片上线：research 池 + Hall 扫描迁移 + forges/ 退役预警。

**Sprint 4-5 (W5-W6) — Daemon 闭环与 OXL 1.3**：
`daemonStartup` 物理路径从 `src/daemon/` 迁至 `src/infra/registry/`；workPrecheck 精准阻断该 Work（v2 核心倒置）。OXL 1.3 grammar 加 scheme 字段 + 15 builtin probe 模板迁移。InvariantDecl 加 script/manual/scope 三个可选字段（兼容老 value=STRING）；WorkDeclaration 加 domainProofs+=DomProofRef 语法。work finalize 二阶段原子写入（临时目录 + 验证 + 原子 rename）+ domain-proof-evaluator。

**Sprint 6-7 (W7-W8) — 全量启用**：
Intent Pool 5 池（research/design/issue/audit/journal）全启用；`oxn pool list/create` CLI。Daemon PR-2/3/4 闭环：step.ts（Proof-driven incremental steps）+ daemon restart/logs/kill CLI + trace archiver。

**Sprint 9 — Token Ingest**：
oxn token ingest 最小闭环。

### Changed

- 多次 L0–L3 架构合规修复（详见 T1a/T1b/T6/T7/T9/T11/T12 各 PR）
- ESLint `no-restricted-imports` 规则强化（kernel↔infra、daemon↔cli 边界）
- Langium grammar 增量改动（T3/T10/T11 三次 `bun run langium:generate`）
- 14 builtin probe 升级（三态/Provider 化/grammar 升级）

### Fixed

- 各类 5–10 case 测试修复（每 PR 平均 +5 case，11 PR 合计 100+ 新测试）
- T1 跨平台 require → ESM import（CJS 残留 14 处修复）
- T1b 路径解析回归（`resolveForgeRoot` 修复）
- T4 ReDoS 防护（safe-regex 拦截）
- T5 reader hash 关键 bug 修复（raw hash 不依赖 zod key 顺序）

### Removed

- `src/daemon/recovery.ts`（移至 `src/infra/trace/recovery.ts`，T2）
- 3 个真死 Port（T1b）

## [0.1.8] - 2026-06-15

### Added

- 文档站点 i18n 化（VitePress 双语结构）
- 英文全量翻译（16 个章节 + 4 个 examples）
- Quick Start 改用 npm/pnpm/bun 全局安装

### Fixed

- root locale 的 nav/sidebar 链接路径修正
- 补 docs/zh-cn/index.md 修 /zh-cn/ 404
- locale key 改小写 'zh-cn' 修 zh-cn 页面缺 sidebar/i18n 切换器
