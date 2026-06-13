---
title: Glossary
---

# Glossary

> A Chinese–English glossary of OpenXenon key terms. Definitions in this chapter are authoritative.

## Product and engine

| Term | Abbrev | Definition |
|---|---|---|
| OpenXenon | — | The workbench — engineer + AI collaboration workbench (product brand) |
| OXN Engine | OXN | The run engine — the workbench's runtime, the entity that proves results |
| OXN Runtime | Runtime | The execution core of OXN (Kernel + Infra + Daemon) |
| IAP | IAP | The IAP paradigm — Intent–Align–Proof three-axis model |

## IAP three-axis entities

### Intent axis

| Term | Definition |
|---|---|
| Domain | Intent's glossary, ban, and invariant |
| Blueprint | Technical pipeline template (slot topology + Probe standards) |
| Program Domain | OXN's built-in programming concept glossary, usable without DDD |
| term | A core word in a Domain, AI must use |
| ban | A banned word in a Domain, AI must not use |
| invariant | A business invariant in a Domain |

### Align axis

| Term | Definition |
|---|---|
| Work | AI's complete job space aligned with a Blueprint |
| Task | An execution step within Work, aligned with 1 Blueprint |
| Part | An execution unit within Task, aligned with 1 Blueprint slot |
| Artifact | The file or state persisted after Task execution |
| skill_context | Execution instruction visible to AI inside a Part |
| slot | A topology node inside a Blueprint |
| deps | Execution-order dependencies between Tasks or Slots |

### Proof axis

| Term | Definition |
|---|---|
| Probe | Acceptance-criteria declaration (Intent side) and execution (Proof side) |
| Proof | The tamper-proof verdict record OXN emits |
| Verdict | The final PASS or FAIL conclusion |
| frozen.json | Frozen proof — the physical form of a Proof, tamper-proof |

## Runtime architecture

| Term | Definition |
|---|---|
| Kernel | Pure logic verification, zero IO |
| Infra | Side-effect execution, only answers facts, makes no verdicts |
| Daemon | Lifecycle management + escape mechanism |
| Escape Mechanism | Forced intervention on Verdict = FAIL (notify + block + diagnose) |

## Addressing

| Term | Format | Meaning |
|---|---|---|
| @oxn | `@oxn/<type>/<name>` | Built-in assets (shipped with OpenXenon) |
| @prj | `@prj/<type>/<name>` | In-project assets (`.openxenon/<type>/<name>.oxn`) |

## Files and directories

| Path | Meaning |
|---|---|
| `.openxenon/` | Project OXN workbench root |
| `.openxenon/domains/<kebab>.oxn` | Domain asset |
| `.openxenon/blueprints/<name>.oxn` | Blueprint asset |
| `.openxenon/works/<w>/work.oxn` | Work orchestration file |
| `.openxenon/works/<w>/tasks/<t>/task.oxn` | Task orchestration file |
| `.openxenon/works/<w>/.work` | Static gate card |
| `.openxenon/proofs/<name>/frozen.json` | Proof-First mode proof result |
| `.openxenon/works/<w>/tasks/<t>/frozen.json` | Full IAP mode proof result |
| `.openxenon/works/<w>/.run/` | v1.1 runtime state directory |

## Deprecated terms

| Deprecated term | Reason | Replacement |
|---|---|---|
| Core Engine | Vague; implies monolith | OXN Engine / OXN Runtime |
| @glo | Conflict with the Git collaboration model | @prj + @oxn |
| Arsenal | v0.0.x zombie module | Builtin / @oxn |
| noun / verb | Renamed | term |
| domain_rules | Renamed | invariant |
| expectation / rule | Removed | Carried by Probe |
| stage | Removed | slot |
| oxn work new | Removed | oxn work create |
| oxn leader * | Removed | Merged into oxn work |
| oxn part new / oxn probe new | Part/Probe are not standalone assets | Inline in the task block |
