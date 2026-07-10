---
entity: roadmap
version: 1
name: oxn-system
abstract: |
  OpenXenon scene-based routing: 6 builtin scenes (doc / dev / debug / test / release / onboard) map goals to Domain + Workflow + Stack + Blueprint (composition). AI Agent reads this Roadmap + calls oxn roadmap suggest --goal --scene to locate relevant Assets.
oxn-source-sha: pending
synced-at: 2026-07-09
---

# Roadmap: oxn-system

> 6 builtin scenes. Use `oxn roadmap show oxn-system --scene <scene>` to view one scene.
> AI Agent: `oxn roadmap suggest --goal "<goal>" --scene <scene>` for ranked matches.
> After Asset create/edit: `oxn roadmap sync oxn-system --scene <scene> --dry-run` (manual hint, NOT auto-sync).

## Scenes

### scene: doc
> Scenario: write/read documentation, ask what OXN is, find chapters.

| kind | name | description |
|---|---|---|
| domain | DocEngineeringContext | Three-layer doc rules, ADR append-only, promote via Work |
| domain | VitePressContext | Doc site build constraints (i18n prefix, sidebar, .html suffix) |
| workflow | doc-publish | Doc site build + GitHub Pages deploy |
| workflow | doc-promote | Promote pools/drafts to ADR/RFC (gather/author/validate/promote) |

### scene: dev
> Scenario: modify code, add CLI subcommand, evolve Asset.

| kind | name | description |
|---|---|---|
| domain | WorkOrchestrationContext | 8 stages + 6 workType + PlanLock |
| domain | AssetModeContext | 6 AssetKind (incl. roadmap) + lifecycle + references DAG |
| domain | AssetLifecycleContext | Asset lifecycle create/evolve/archive vocabulary for oxn-asset Skill |
| domain | intent-domain | Intent axis: CLI entry / OXL / Program |
| domain | align-domain | Align axis: Work sandbox + Skill + Slot/Part/Probe |
| domain | proof-domain | Proof axis: Builtin + frozen.json |
| workflow | dev-workflow | Generic development (build/develop/test/verify) |
| workflow | asset-create | Asset creation pipeline (choose-kind/fork-template/fill-content/validate-commit) |
| workflow | asset-evolve | Asset evolve pipeline (read-current/plan-changes/apply-evolve) |
| workflow | asset-archive | Asset archive pipeline (check-references/confirm/move-to-archived) |
| workflow | add-cli-subcommand | Add new oxn CLI subcommand |
| workflow | dsl-evolve | OXL grammar evolution |
| workflow | refactor-safe | Safe refactor with L0-L3 guard |
| workflow | git-workflow | Git worktree branch workflow |

### scene: debug
> Scenario: frozen.json anomaly, Probe fail, hash mismatch, regression.

| kind | name | description |
|---|---|---|
| domain | iap-error-context | IAPError 8 + OXNCrash 3 codes, exit code contract |
| domain | TaintContext | Probe signal taint 12 items + 3 IO primitives |
| domain | L0L3Context | L0-L3 architecture boundaries (prevent Kernel IO) |
| workflow | fix-issue | Bug reproduction + locate + fix + verify |

### scene: test
> Scenario: write tests, run test suite, analyze coverage.

| kind | name | description |
|---|---|---|
| domain | WorkOrchestrationContext | 8 stages run/submit logic |
| domain | CodeQualityContext | Cross-platform consistency, naming, pattern application |
| workflow | dev-workflow | Reuses dev-workflow, stage-2 includes test |

### scene: release
> Scenario: version migration, release cut, changelog.

| kind | name | description |
|---|---|---|
| domain | MonorepoContext | packages/cli + packages/engine dual-package |
| domain | I18nContext | zh-CN/en bilingual + t() |
| workflow | migrate-version | Migrate between versions |
| workflow | release-cut | Cut a release + changelog |

### scene: onboard
> Scenario: new contributor first day, full project overview.

| kind | name | description |
|---|---|---|
| domain | L0L3Context | L0-L3 architecture core vocabulary |
| domain | MonorepoContext | Dual-package Monorepo |
| domain | DocEngineeringContext | Three-layer doc rules |
| domain | AssetLifecycleContext | Asset create/evolve/archive vocabulary for engineers |
| workflow | dev-workflow | First workflow to run |

---

## Usage

```bash
# List all Roadmaps
oxn roadmap list

# View full Roadmap
oxn roadmap show oxn-system

# View single scene
oxn roadmap show oxn-system --scene dev

# AI Agent: suggest in a scene
oxn roadmap suggest --goal "Add new CLI subcommand" --scene dev --top 3

# After Asset change: detect dangling links (manual, dry-run by default)
oxn roadmap sync oxn-system --scene doc --dry-run
oxn roadmap sync oxn-system --scene doc --apply   # actually modify
```

## Scene quick-reference

| Goal keywords | scene |
|---|---|
| write / read / doc / chapter / manual / guide | `doc` |
| code / cli / subcommand / implement / refactor / evolve / asset / git / branch | `dev` |
| bug / error / fail / frozen / mismatch / regression / hash / taint | `debug` |
| test / coverage / assertion | `test` |
| version / release / cut / changelog / migrate | `release` |
| new / start / overview / project / architecture | `onboard` |