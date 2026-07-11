# v0.6.1 Phase A-D: Work Restructuring

> v0.6.1-alpha.5 → v0.6.1

## Breaking Changes

- **BC-1**: `oxn work lock` now runs validate internally (syntax + DAG + Asset refs). No need to run `validate` before `lock`.
- **BC-2**: `oxn work validate` is now a `lock --dry-run` alias (backward-compatible, validate still works independently).
- **BC-3**: `oxn work create --asset-kind <X>` no longer short-circuits; routes through standard Work flow with `asset-create` workflow.
- **BC-4**: `handleAssetModeCreate` function deleted; `oxn asset create` is now an alias for `oxn work create --asset-kind`.
- **BC-5**: Work refs converge to Blueprint-only; `domains.json` deleted; `per-work-domains-merger.ts` deleted.
- **BC-6**: `PlanLock` 3-component hash (removed `workDomainsHash`); `blueprintsHash` upgraded to composite.
- **BC-7**: `BirthCert` V2: removed `assets.domains[]` field.

## New Features

- **Phase A**: `maxIterations` hard limit enforced; `run` repeatable on Round 2+; `resetCurrentRoundTasks`.
- **Phase B**: Work refs converge to Blueprint-only; conditional 3-boundary validation.
- **Phase C**: Asset creation unified as standard Work flow (no more short-circuit).
- **Phase D**: 9 stages → 3 IAP phase entities (Intent / Align / Proof); lock absorbs validate.

## Internal

- File: `per-work-domains-merger.ts` deleted (merged into `per-work-blueprints-merger.ts`)
- File: `work-lock.ts` now imports `validateAndWriteArtifacts` for internal validate step
- CLI: `work.ts` lock subcommand accepts `--dry-run` flag

## Migration

- Existing works with `domains.json` or V1 `BirthCert` are auto-migrated on `validate`/`lock`
- No manual migration required for v0.6.1 upgrade
