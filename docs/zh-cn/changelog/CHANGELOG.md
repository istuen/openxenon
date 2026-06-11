# OpenXenon 更新日志（中文）

OpenXenon 的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

## [0.0.29] - 2026-06-11

### Changed
- **i18n Phase B（消费面迁移）**：把 30+ 处硬编码中文字符串迁移到 t() 调用，闭合 v0.0.26 引入的"消费面漂移"
- 扩展 `src/i18n/zh-CN.json`：新增 5 命名空间（errors / cache / gc / migrate / explore）共 50+ key；扩展 daemon / init / config / work 至 12-17 key
- 改 12 个文件：socket-client / daemon-status / daemon-start / work / blueprint / domain / config / cache / cache-stats / cache-clear / gc / oxn-migrate-cmd / explore-cmd

### Fixed
- 删除 i18n 死代码 `getCurrentLocale()`（0 调用方）
- `init.ts` 真接 `setLocale`：让 `oxn init --locale <l>` 真的切换本进程 i18next language

### Note
- 关联 forge：`forges/2026-06-11-i18n-version-drift.md` §5.2
- 已知遗留：description 字段未走 i18n（属 PR-3 范畴）；hall/oxn-unpack/oxn-validate/export/global-hall/oxn-compile 6 文件 15 处未走 t()（属 PR-2.5 或 PR-3 范畴）
- 下版本（0.0.30）推 Phase B 资源 + 测试

## [Unreleased] - 0.0.28+

### Fixed
- **task.deps 字段语法收紧**为唯一合法写法 `deps = ["t1", "t2"]`（grammar 加 `'deps' '='` 关键字引导 parser disambiguation）
- 拒绝写法：裸数组 `["t1"]` / `deps ["t1"]`（无 `=` 号） / 重复 deps 字段
- 修复 grammar ↔ examples ↔ 真实 work 三方漂移：之前 4 种 deps 写法在 parser 阶段全部 fail
- 迁移：`.openxenon/works/poc-git-isolation/work.oxn` 3 行 `deps [...]` → `deps = [...]`
- **ts-compiles probe 修复**：当 `path` 与 `tsconfig`/`--project` 同时传入时，TSC 抛出 `error TS5042: Option 'project' cannot be mixed with source files on a command line.`——修复采用方案 A：写临时 `.tsconfig.oxn-<hash>.json`，命令退化为 `tsc --noEmit --project <tmp>`
- **i18n PR-1**：闭合 `bun run version:check` 失败（`docs/zh-cn|en/changelog/CHANGELOG.md` 缺失）+ 修 `src/cli/index.ts:147` 写死 `'1.0.0'` → 改用 `pkg.version`

### Added
- `src/oxl/__tests__/task-deps.test.ts` — 5 合法 + 5 非法 task.deps 端到端契约测（10 个 testcase 全绿）
- `src/oxl/__tests__/examples-parsing.test.ts` 升级为对真实 work 的真 parse 测（test.each 9 个 case 全绿）
- `src/infra/probes/__tests__/ts-compiles.test.ts`：8 个单元测试覆盖三种参数组合
- `docs/zh-cn/changelog/CHANGELOG.md` + `docs/en/changelog/CHANGELOG.md`（i18n PR-1）

### Note
- i18n Phase A 漂移备忘（详见 `forges/2026-06-11-i18n-version-drift.md §5.1`）：
  - 36 处硬编码中文字符串未走 `t()`（9 处 OXN_NO_PROJECT + 7 处 daemon 错误 + 20 处其他）
  - en locale 资源（CLI i18next + Skills prompt）缺失
  - i18n 模块 + Skills 模块 0 单测
  - 下版本（0.0.29）推 Phase B

## [0.0.27] - 2026-06-11

### Added
- `oxn-validate` CLI 命令
- OXN DSL example files
- Work type shorthand syntax
- Part refs in slotBindings

### Removed
- `src/arsenals/builtin.ts` 及 `src/arsenals/` 空目录
- `src/kernel/probes/` → `src/kernel/verdicts/`（物理重命名，关闭命名歧义）

### Fixed
- grammar ↔ examples ↔ 真实 work 三方漂移（task.deps 语法）

### Note
- i18n Phase A 漂移备忘（详见 `forges/2026-06-11-i18n-version-drift.md §5.1`）：见 [Unreleased] 段

## [0.0.26] - 2026-06-10

### Added
- i18n Phase A（`src/i18n/index.ts` + `zh-CN.json`，i18next ^26.2.0，3 命名空间 / 18 条文案）
- OxnKernelAdapter migrated to oxn-dsl layer
- explore scan index mode
- Update skills to OXN DSL v3.1

### Note
- 已知遗留（PR-1 修复 / PR-2 跟进）：i18n 消费面漂移、en 资源缺失、模块 0 单测

## [Unreleased] - v0.1-final

### 重大变更
- i18n Phase B 准备中（PR 拆分见 `forges/2026-06-11-i18n-version-drift.md`）

### Added

### Changed

### Removed

### Deprecated

### Fixed
