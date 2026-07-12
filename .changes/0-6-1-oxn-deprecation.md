# v0.6.1 — Langium Retirement & .oxn Deprecation

## Breaking Changes

- **`.oxn` format fully removed**: `.md` is now the sole canonical format. `.oxn` files are no longer parsed or generated.
- **Langium dependencies removed**: `langium` and `langium-cli` npm packages removed from the project.
- **`langium:generate` build step removed**: Build pipeline no longer includes Langium code generation.
- **CLI subcommands removed**: `oxn domain compile`, `oxn domain sync`, `oxn domain sync-md`, `oxn blueprint compile`, `oxn blueprint sync`, `oxn blueprint sync-md`, `oxn work sync`, `oxn work sync-md` — all removed.
- **`--oxn-legacy` flag removed**: No longer possible to write `.oxn` files via CLI.
- **`check:md-fallback` script removed**: No longer needed since `.oxn` files are not tracked.

## Migration

- All existing `.oxn` assets should already have `.md` counterparts (created in v0.6.1).
- If you have hand-written `.oxn` files, convert them to `.md` format using the MD-native grammar (H1 entity / H2 category / H3 instance).
- Work files (`work.md`, `task.md`) are now the only format supported by `oxn work create`, `oxn work validate`, `oxn work lock`, and `oxn work run`.

## Internal

- 79 git-tracked `.oxn` files removed (`git rm`).
- `packages/engine/src/oxl/langium-driver/` directory deleted (8 files).
- CLI commands (`domain.ts`, `blueprint.ts`, `work.ts`, `proof.ts`, `dev.ts`) rewritten to use md-native parsers (`extractDomainIR`, `extractBlueprintIR`, `extractWorkIR`, `extractProofIR`).
- Engine modules (`Asset/validate.ts`, `Work/work-manager.ts`, `Work/task-filesystem.ts`) updated to reject `.oxn` input.
- 17 test files deleted, 8 mixed test files cleaned — test suite reduced from 1653 to 1487 tests (all removed tests were for intentionally-deleted functionality).
- Documentation updated: all `.oxn` references replaced with `.md` across 25+ doc files.
