# Changelog

## [0.6.1-alpha.0] - 2026-07-02

> **主题**：v0.6.0 架构的调试驱动修复。5 个 Cycle（Asset / Skill / Work / Round / Proof）系统化测试，按问题分批修复 P0/P1 阻塞性问题。
> **测试结果**：1,890 → 1,884 pass（+0 回归）/ 6 fail（v0.6 Skill 极简版预期产物，归 backlog）
> **关键修复**：
> - P0: `oxn work finalize` 从零实现（之前完全缺失）
> - P0: 路径布局修正（`.openxenon/assets/domains-md/` v0.6 RFC 路径）
> - P0: `chmod 0o444` 落盘（planLock 守卫前提）
> - P0: Blueprint DAG 环检测（DFS + 灰/白/黑标记）
> - P0: builtin blueprint 模板与 grammar 一致
> - P1: domain sync-md 不再覆盖工程师 .oxn（data loss 修复）
> - P1: proof verify 加 frozen.json hash drift 检测


> OpenXenon changelog. Each entry corresponds to a git commit; for detailed PR list see `.openxenon/forges/sprints/EXECUTION-ORDER.md`.

## [0.3.0] - 2026-06-24

> **Theme**: MD-Native Grammar Reform — completely replace `:::intent{...}` with pure native Markdown hierarchy
> **Scope**: 3 serial sub-PRs (t18-t19-t20) + 5 follow-up commits (canonical form landed) + A1 fixture migration + A2 CLI implementation
> **Breaking change**: legacy `:::intent{...}` throws `E_MD_DEPRECATED_SYNTAX` at parse time; users must rerun `oxn domain compile` / `oxn blueprint compile` to generate new format

### Added

**v0.3.0 Reform Core (5 commits on `feat/v0.3-md-ssot`)**:

- **EntityCompiler interface + Registry**: `compile()` / `parse()` / `validate()` three-method abstraction; `EntityRegistry` Singleton routes 5 entity types (src/oxl/md-bridge/entity-compiler.ts + entity-registry.ts)
- **5 compiler implementations**: Domain / Blueprint / Work / Task / Proof (src/oxl/md-bridge/compilers/)
- **extract-headings + extract-list-fields**: H1/H2/H3 context stack + list-field tree recursive extraction (mdast native support, no fixed indentation)
- **`oxn domain compile <name>` CLI**: recompile `.oxn` to v0.3 canonical pure MD `.md` (output to `.openxenon/domains-md/`, triggers auto-rebuild slim index)
- **`oxn blueprint compile <name>` CLI**: same for blueprint
- **Canonical CI guard** (`scripts/check-md-canonical.ts`): 5 rules to prevent drift
  - `E_MD_CANONICAL_NAME_REDUNDANT` (H3 is canonical name, ban `- name: <H3>`)
  - `E_MD_CANONICAL_ITEMS_COMMA_STRING` (ban `items: A, B, C`, must use indented list)
  - `E_MD_CANONICAL_VALUES_INLINE_ARRAY` (ban `values: [a, b, c]`, must use indented list)
  - `E_MD_CANONICAL_SEMICOLON_INLINE` (structural fields ban `;`, natural-language fields exempt)
  - `E_MD_INVALID_SYNTAX` (md-bridge pipeline parse failure)

**Canonical Form 3 Principles**:
1. H3 = canonical name (no redundant `- name:`)
2. One `- key: value` per line (no `;` inline separator)
3. Arrays = indented lists (no comma strings or inline arrays)

**oxn-vscode Extension**:
- `oxn-intent.tmLanguage.json`: markdown injection highlighting 5 entity H1/H2
- `docs/.vitepress/theme/custom.css`: H2 category border + light background
- `scripts/check-intent-types-drift.ts`: CI guard for type whitelist consistency

**5 Canonical Entity Examples** (`src/oxl/examples-md/`):
- `order-domain.md` (e-commerce Order bounded context)
- `order-workflow-blueprint.md` (validate → charge → ship topology)
- `place-order-work.md` (3 task chain)
- `t1-validate-task.md` (Parts / Probes)
- `order-build-validity-proof.md` (Verdicts / Runtime)
- `README.md`: form overview + 13 E_MD_xxx + 5 canonical guard quick reference

**Docs Dual SSOT Sync**:
- `docs/zh-cn/intent.md` + `docs/en/intent.md`: added "v0.3 Unified MD Form" section (5 entity canonical form code examples + 5 anti-patterns + natural-language field exemption whitelist)

### Changed

- **Error codes extended**: 6 → 13 E_MD_xxx (added 7: DEPRECATED_SYNTAX / DUPLICATE_H3 / H1_MISSING / H1_MISMATCH / CATEGORY_UNKNOWN / LIST_FORMAT_INVALID / NESTED_LEVEL_OVERFLOW)
- **Decompiler outputs canonical form**: domain/blueprint/work/proof 4 compilers' `compile()` no longer emit redundant `- name:`, `items:` changed to indented list, wrapper H3 changed to `### primary` / `### snapshot`
- **A1 fixture migration**: 66 `:::intent` test fixtures all rewritten to H1/H2/H3 + list form; md-bridge 17 test files from 175/241 → 241/241 pass
- **Test isolation fix**: `entity-registry.test.ts` beforeEach explicitly restores 5 compilers (prevent parallel test pollution of global registry)

### Fixed

- **Test isolation**: mdast-to-kernel-native.test.ts beforeAll `_clearForTest` no longer affects oxl-md-decompiler.test.ts
- **CI canonical drift**: 22 `.md` files (6 examples + 14 domains-md + 2 intent.md) all pass canonical guard
- **typecheck**: md-bridge 4 files TS2339 / TS6133 fixed (unused import / missing deps field)

### Removed

- **Removed** `remark-directive` dependency (v0.3 PR-B breaking change)
- **Removed** `result.intents` field from legacy `parseDomainMd/parseBlueprintMd/parseWorkMd` return types (rewritten to canonical form)

### Migration Guide

**v0.2 → v0.3 Upgrade Steps**:

```bash
# 1. Upgrade package (package.json 0.3.0)
bun install --frozen-lockfile

# 2. Regenerate all .md (v0.3 PR-B breaking change)
bun scripts/migrate-domains-to-native-md.ts
bun scripts/migrate-blueprints-to-native-md.ts

# 3. Verify canonical form
bun scripts/check-md-canonical.ts src/oxl/examples-md docs/zh-cn/intent.md docs/en/intent.md .openxenon/domains-md

# 4. Verify tests
bun test  # should be 1700/1700 pass
```

**Breaking changes**:
- Legacy `:::intent{...}` blocks throw `E_MD_DEPRECATED_SYNTAX` at parse time (must rerun compile)
- Work / Task / Proof `.md` files still retain v0.2 format (pending v0.4 batch migration)

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
