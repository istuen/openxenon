---
categories:
  - Fixed
  - Added
---

- **Fixed** `src/infra/probes/ts-compiles.ts`：当 `path` 与 `tsconfig`/`--project` 同时传入时，TSC 抛出 `error TS5042: Option 'project' cannot be mixed with source files on a command line.`——证明场景即 `oxn proof run` 跑 `ts-compiles` probe 同时圈定子集路径时。修复采用方案 A：写临时 `.tsconfig.oxn-<hash>.json`（inline 原 tsconfig 的 `compilerOptions` + `files: [<path>]`），命令退化为 `tsc --noEmit --project <tmp>`，**保留项目 compilerOptions（strict / paths alias 等）**的同时精确圈定编译范围。临时文件由 `try/finally` 写盘→spawn→清理，跨进程不持久化。
- **Added** `src/infra/probes/__tests__/ts-compiles.test.ts`：8 个单元测试覆盖三种参数组合（path+tsconfig / 只传 tsconfig / 只传 path）、并发执行不冲突、异常路径清理、`errorCount` 契约。
- **Added** `.tsconfig.oxn-*.json` 加入 `.gitignore`（运行时临时产物）。
- **Note** `Kernel 纯函数 verdict` 在整个修复过程中零改动——`tsCompilesStrategy` 始终如实把 Infra 的 `errorCount: N` 翻译成 verdict。Proof（`kernel-pure-logic`）路径同步从 `src/kernel/probes/` 更新到 `src/kernel/verdicts/`（v0.1.3 重命名），端到端 verdict `PASSED 4/4`。
- **Note** i18n Phase A 漂移备忘（详见 forges/2026-06-11-i18n-version-drift.md §5.1）：本 release 未推进 i18n；36 处硬编码中文、en 资源缺失、0 单测、version:check 失败 — 0.0.28 PR-1 修复
