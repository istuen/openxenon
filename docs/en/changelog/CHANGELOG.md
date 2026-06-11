# OpenXenon Changelog (English)

All notable changes to OpenXenon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-06-11

### Added
- **i18n Phase B complete + Skills en translation**: en locale fully available (CLI messages + Skills instructions)
- **en.json**: created `src/i18n/en.json` (105 keys, full English mirror of zh-CN.json 1:1)
- **en skill instructions**: created 4 files under `src/skills/locales/en/` (oxn-cli / oxn-work / oxn-work/references/blueprint-format / oxn-proof), ~1200 lines of English translation
- **i18n tests**: `src/i18n/__tests__/` (12 tests: basic functionality, key completeness, en-zh parity)
- **Skills i18n tests**: `src/skills/__tests__/skill-i18n.test.ts` (7 guard tests)

### Changed
- `src/i18n/index.ts` now registers en resources
- `src/skills/loader.ts` refactored: en branch imports real en resources; `getSkillContent` throws for missing non-default locale (ADR-6)

### Removed
- `src/skills/locales/zh-CN/oxn-resume/instruction.md` (80 lines of dead assets, 0 consumers)

### Note
- Related forge: `forges/2026-06-11-i18n-version-drift.md` §5.3-5.4
- Semantic version jump 0.0.30 → 0.1.0 due to different verification requirements for Skills en translation (requires end-to-end LLM behavior validation)

## [0.0.29] - 2026-06-11

### Changed
- **i18n Phase B (consumption-side migration)**: migrated 30+ hardcoded Chinese strings to t() calls, closing the "consumption-side drift" introduced in v0.0.26
- Extended `src/i18n/zh-CN.json`: added 5 namespaces (errors / cache / gc / migrate / explore) with 50+ keys; extended daemon / init / config / work to 12-17 keys
- Modified 12 files: socket-client / daemon-status / daemon-start / work / blueprint / domain / config / cache / cache-stats / cache-clear / gc / oxn-migrate-cmd / explore-cmd

### Fixed
- Removed i18n dead code `getCurrentLocale()` (0 callers)
- `init.ts` now actually calls `setLocale`: makes `oxn init --locale <l>` truly switch the i18next language for the current process

### Note
- Related forge: `forges/2026-06-11-i18n-version-drift.md` §5.2
- Known leftovers: description fields not yet i18n'd (PR-3 scope); hall/oxn-unpack/oxn-validate/export/global-hall/oxn-compile (6 files, 15 occurrences) not yet t() (PR-2.5 or PR-3 scope)
- Next version (0.0.30) ships Phase B resources + tests

## [Unreleased] - 0.0.28+

### Fixed
- **task.deps field syntax tightened** to the only legal form `deps = ["t1", "t2"]` (grammar adds `'deps' '='` keyword to guide parser disambiguation)
- Rejected forms: bare array `["t1"]` / `deps ["t1"]` (no `=` sign) / duplicate deps fields
- Fixed grammar ↔ examples ↔ real-work three-way drift: previously 4 deps forms all failed at parser stage
- Migration: `.openxenon/works/poc-git-isolation/work.oxn` 3 lines `deps [...]` → `deps = [...]`
- **ts-compiles probe fix**: when `path` is passed with `tsconfig`/`--project` simultaneously, TSC throws `error TS5042: Option 'project' cannot be mixed with source files on a command line.`—fix uses Approach A: write temporary `.tsconfig.oxn-<hash>.json`, command degrades to `tsc --noEmit --project <tmp>`
- **i18n PR-1**: closed `bun run version:check` failure (missing `docs/zh-cn|en/changelog/CHANGELOG.md`) + fixed `src/cli/index.ts:147` hardcoded `'1.0.0'` → use `pkg.version`

### Added
- `src/oxl/__tests__/task-deps.test.ts` — 5 valid + 5 invalid task.deps end-to-end contract tests (10 testcases all green)
- `src/oxl/__tests__/examples-parsing.test.ts` upgraded from 4 existsSync smoke tests to real parse tests on real works (test.each 9 cases all green)
- `src/infra/probes/__tests__/ts-compiles.test.ts`: 8 unit tests covering 3 parameter combinations
- `docs/zh-cn/changelog/CHANGELOG.md` + `docs/en/changelog/CHANGELOG.md` (i18n PR-1)

### Note
- i18n Phase A drift memo (see `forges/2026-06-11-i18n-version-drift.md §5.1`):
  - 36 hardcoded Chinese strings not going through `t()` (9 OXN_NO_PROJECT + 7 daemon errors + 20 others)
  - en locale resources (CLI i18next + Skills prompt) missing
  - i18n module + Skills module 0 unit tests
  - Next version (0.0.29) ships Phase B

## [0.0.27] - 2026-06-11

### Added
- `oxn-validate` CLI command
- OXN DSL example files
- Work type shorthand syntax
- Part refs in slotBindings

### Removed
- `src/arsenals/builtin.ts` and `src/arsenals/` empty directory
- `src/kernel/probes/` → `src/kernel/verdicts/` (physical rename, closing naming ambiguity)

### Fixed
- grammar ↔ examples ↔ real-work three-way drift (task.deps syntax)

### Note
- i18n Phase A drift memo (see `forges/2026-06-11-i18n-version-drift.md §5.1`): see [Unreleased] section

## [0.0.26] - 2026-06-10

### Added
- i18n Phase A (`src/i18n/index.ts` + `zh-CN.json`, i18next ^26.2.0, 3 namespaces / 18 entries)
- OxnKernelAdapter migrated to oxn-dsl layer
- explore scan index mode
- Update skills to OXN DSL v3.1

### Note
- Known leftovers (PR-1 fixes / PR-2 follows up): i18n consumption-side drift, en resources missing, module 0 unit tests

## [Unreleased] - v0.1-final

### Major Changes
- i18n Phase B in preparation (PR split in `forges/2026-06-11-i18n-version-drift.md`)

### Added

### Changed

### Removed

### Deprecated

### Fixed
