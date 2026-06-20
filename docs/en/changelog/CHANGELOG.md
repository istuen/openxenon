# Changelog

> OpenXenon changelog. Each entry corresponds to a git commit; for detailed PR list see `.openxenon/forges/sprints/EXECUTION-ORDER.md`.

## [0.2.0] - 2026-06-XX

> **Theme**: Proof Engine mainline + Token Ingest
> **Scope**: 15 T-series PRs + 1 Sprint 9 work
> **T15 spike is NOT in v0.2.0** (deferred to v0.3)

### Added

**Sprint 1 (W1) — Infrastructure Refactor**:
Consolidated fs direct-imports from 22 `src/cli/` files + 28 non-cli `src/` files into `src/infra/filesystem/filesystem-async.ts`; removed 3 dead Ports. Relocated `src/daemon/recovery.ts` to `src/infra/trace/recovery.ts` for L1-Infra architectural compliance.

**Sprint 2 (W2) — Soft Gaps**:
Added multi-grammar compatibility to OXL (multiple `task.deps` syntaxes); migrated merger from regex to Langium AST parsing (3 sync functions became async).

**Sprint 3 (W3-W4) — Probe Taint Protection**:
Introduced IO Primitive + 12 InterferenceFlags + TRUST_BASELINE + 3-state ProbeVerdict (PASS/FAIL/INCONCLUSIVE); upgraded frozen.json schema to 3-state; added ProviderRegistry with 4 built-in providers (FileProvider/HttpProvider/ShellProvider/GitProvider); added probe-sandbox (Bun `vm.SourceTextModule` PoC + 7 FORBIDDEN_GLOBALS + 10 FORBIDDEN_MODULES); added probe-registry-store (registry.json v1 schema); added `oxn probe add/list/fix` CLI commands. Released Intent Pool v3 minimal slice: research pool + Hall scan migration + forges/ deprecation warning.

**Sprint 4-5 (W5-W6) — Daemon Closure + OXL 1.3**:
Migrated `daemonStartup` physical path from `src/daemon/` to `src/infra/registry/`; workPrecheck for precise work blocking (v2 core inversion). Added OXL 1.3 grammar `scheme` field + migrated 15 builtin probe templates. Added 3 optional InvariantDecl fields (script/manual/scope, compatible with old value=STRING); added WorkDeclaration `domainProofs+=DomProofRef` syntax. Added 2-phase atomic write to work finalize (temp dir + validation + atomic rename) + domain-proof-evaluator.

**Sprint 6-7 (W7-W8) — Full Enablement**:
Enabled all 5 Intent Pool types (research/design/issue/audit/journal); added `oxn pool list/create` CLI. Daemon PR-2/3/4 closure: step.ts (Proof-driven incremental steps) + daemon restart/logs/kill CLI + trace archiver.

**Sprint 9 — Token Ingest**:
oxn token ingest minimum loop.

### Changed

- Multiple L0–L3 architectural compliance fixes (see T1a/T1b/T6/T7/T9/T11/T12 PRs for details)
- ESLint `no-restricted-imports` rule strengthening (kernel↔infra, daemon↔cli boundaries)
- Langium grammar incremental changes (T3/T10/T11 three `bun run langium:generate` runs)
- 14 builtin probes upgraded (3-state / Provider-ization / grammar upgrade)

### Fixed

- Various 5-10 case test fixes (average +5 cases per PR, 11 PRs totaling 100+ new tests)
- T1 cross-platform require → ESM import (14 CJS residue fixes)
- T1b path resolution regression (`resolveForgeRoot` fix)
- T4 ReDoS protection (safe-regex interception)
- T5 reader hash critical bug fix (raw hash independent of zod key order)

### Removed

- `src/daemon/recovery.ts` (relocated to `src/infra/trace/recovery.ts`, T2)
- 3 dead Ports (T1b)

## [0.1.8] - 2026-06-15

### Added

- Documentation site i18n (VitePress bilingual structure)
- Full English translation (16 chapters + 4 examples)
- Quick Start switched to npm/pnpm/bun global install

### Fixed

- Fixed root locale nav/sidebar link paths
- Added docs/zh-cn/index.md to fix /zh-cn/ 404
- Lowercased locale key to 'zh-cn' to fix zh-cn page missing sidebar/i18n switcher
