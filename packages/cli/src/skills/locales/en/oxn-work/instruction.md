# /oxn-work — Drive Work v1.3 (RFC-0033 minimized)

## AI Agent Onboarding Premise

> ⚠️ This section declares your identity and boundary when joining OpenXenon; read it before `## Goal`.

### Who you are

You are assisting an OpenXenon engineer. OpenXenon is a collaboration tool where engineers define AI Agent collaboration boundaries; the core paradigm is IAP (Intent–Align–Proof), the core engine is OXN Engine.

**Three-party collaboration model**:
- **Engineer** (Asset management + decision review) — initiator
- **AI Agent** (you) — gain CLI capabilities via OXN Skill, work autonomously inside Work
- **OXN Engine** — passively responds to CLI, executes Probes + records trace; does not judge

**IAP simplified to three-phase alignment** (RFC-0032 + RFC-0033 convergence):
- **Intent axis** (engineer sovereignty): Domain locks business language, Blueprint locks tech topology
- **Align axis** (AI sovereignty): you — orchestrate Work/Task/Part within Blueprint slot boundaries
- *(Probe replaces the legacy "Proof axis" — 0.6.4-alpha.0+ no longer produces frozen.json / sovereign verification; Probe is an Engine tool capability, CLI checks artifacts, results recorded in Work trace.jsonl)*

**OXN channel boundary**: actions AI performs OUTSIDE the OXN channel (reading code, trying approaches, giving up) are NOT recorded; only in-channel artifacts (context.md / memory.md + trace.jsonl) are evidence.

### CLI Whitelist (v1.3 · RFC-0033 D1 minimized)

✅ Allowed:

```bash
# Work orchestration + execution (3-step lifecycle)
oxn work create <name> --blueprint <bp> --domain <d> [--stack <s>] --goal "<goal>"
oxn work run <name> [--validate-only]                # Start state machine OR validate-only
oxn work submit <name> --task <t>                    # Advance task (with hash fingerprint + DRIFT detection)
oxn work add-task <name> --task <t> --blueprint <bp> # Optional: AI can also edit work.md ## Tasks directly
oxn work status | list | show                        # Status queries

# Context injection (v1.3 · retained)
oxn work inject <name> --paths | --context | --memory
oxn work inject <name> --task <t> --paths | --context | --memory

# Probe verification (RFC-0032 D27: Engine tool capability)
oxn probe add | run | list | describe | fix | registry-store

# Asset / Blueprint / Domain (create/modify via oxn-asset Skill; commands here are query-only)
oxn blueprint list | show
oxn domain list | show

# Meta queries
oxn assetmap show <map> --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene>
oxn draft list | show
```

❌ Forbidden:
- Direct read/write of `.openxenon/works/*/state.json`, `.openxenon/works/*/tasks/*/trace.jsonl`
- Modifying Domain terms or Blueprint rules
- Using `--force` to bypass Work flow
- **Retired commands** (v1.3 RFC-0033): `oxn work validate` / `oxn work lock` / `oxn work unlock` — validation merged into `run --validate-only`, PlanLock entirely removed

### Output conventions

- **Code changes** referenced via `file_path:line_number`
- **Completion status** accompanied by `oxn work status --json` output
- **Unrecoverable errors** — report the specific error code (e.g. `OXN_INTENT_SCOPE_VIOLATION`) and pause for engineer intervention

### Failure handling (v1.3 RFC-0033 D4)

- `IAPError` → read error context + trace.jsonl events; COMPLETED → proceed, DEVIATED → fix and re-run, INCONCLUSIVE → report to engineer
- `OXN_INTENT_SCOPE_VIOLATION` → Task Artifact outside Blueprint Scope; fix `## Artifacts` (cannot modify Blueprint)
- `OXN_WORK_NOT_STARTED` → run not yet executed; run `oxn work run` first
- `ASSET_DRIFT` (trace event, observable not blocking) → workMd changed; if confirmed expected, continue submit
- Full error codes see `references/error-codes.md`

### Reading order

Your complete reading path (loading chain) lives at repo root `AGENTS.md` entry pointers → `dev/knowledge-loading.md` (v0.7+ single canonical doc).

---

## Goal
Create a **Work + ≥1 Task**, run through 3 phases (RFC-0033 D1): `create → run → submit` (`migrate?` optional)

## Hard Rules
- **3-step order cannot skip**: create → run → submit
- work.md can be freely modified (submit auto-detects hash fingerprint + DRIFT, observable not blocking)
- Part/Probe inline in `task { part { probe {} } }`
- OXN does not commit/push

## Paradigm
D=Business Intent | B=Tech Intent | W=Align orchestration | T=Align execution
- **AI Agent in-channel tracking boundary**: actions AI performs OUTSIDE OXN channel (reading code, trying approaches, giving up) are NOT recorded by OXN — only in-channel artifacts (context.md / memory.md + state.json + trace.jsonl) are persisted (ADR-0084)

## Blueprint Selection
| Need | Template (.md with OXN blocks) → Blueprint |
|---|---|
| Explore / report | `assets/work-explore.md` → `dev-workflow` (slot: ts-implement) (🆕 v0.7.0 RFC-0027 PR-H: legacy `explore-analyze-report` Workflow deleted; use dev-workflow ts-implement slot) |
| Single-domain dev | `assets/work-develop.md` → `dev-workflow` |
| Bug fix | `assets/work-fix.md` → `fix-issue` |
| Cross-domain | `assets/work-onboarding.md` → `dev-workflow` (multi domain) |
| **MD authoring** (v0.7+ ADR-0089) | — → `md-author-blueprint` |

> v0.7+: Work no longer has mode (task/explore/edit); behavior differences carried by Blueprint slots/observe.
> v0.7+: MD authoring scenario uses `md-author-blueprint` (one of 5 starter Assets).

## Execution (v1.3 AssetMap-driven Asset selection)

1. **Prereq**: project initialized via `oxn init`; required Assets ready — to create/modify Assets, **invoke `oxn-asset` Skill**.
2. **First-time project onboarding (v0.7+ ADR-0089)**: when project hasn't bootstrapped 5 starter Assets, trigger `oxn onboard` flow:
   - Run `oxn onboard --detect --json` (detection, side-effect-free)
   - Parse detection result → list 3 option cards (`A` new project / `B1` existing-Definition-First / `B2` existing-bootstrap)
   - **Wait for engineer confirmation** (do not auto-decide)
   - Execute chosen `oxn onboard --new` / `--existing --proof-first` (rerouted to definition-first 5-min loop) / `--existing --bootstrap`
   - After bootstrap (`.openxenon/.bootstrap-done` marker exists), enter normal Work flow
3. **Query AssetMap for available Assets** (human/AI initiated, NOT auto-recommended):
   - `oxn assetmap show <map> --scene <scene>` — list Domain / Blueprint / Stack under scene (`<map>` defaults to `oxn-system`; project consumers can create `<project>-system`)
   - `oxn assetmap suggest --goal "<goal>" --scene <scene>` — jaccard keyword ranking candidates
4. **Human analysis, pick from suggest results**:
   - **Blueprint** — 1..N pipelines (typically 1; multiple blueprints for cross-phase different pipelines)
   - **Domain** — 1..N (Work-level declaration, provides global vocabulary; Task level picks exactly 1)
   - **Stack** — 0..N (Work-level tech-stack constraints; not injected into Task layer)
5. **Fork template + edit work.md** (or pass via `oxn work create`):
   ```bash
   oxn work create <name> \
     --blueprint <bp> \
     [--blueprint <bp2>] \
     --domain <d1> --domain <d2> \
     [--stack <s1>] \
     --goal "<goal>" \
     [--constraints "c1" "c2"]
   ```
   Or manually `fork assets/work-{explore,develop,fix,onboarding}.md → work.md` and edit `## Refs` + `## Context` by hand.
6. **Run 3 phases** (v1.3 RFC-0033):
   ```
   oxn work run <name> --validate-only   # Validate-only (replaces legacy oxn work validate)
   oxn work run <name>                   # Start state machine
   oxn work submit <name> --task <t>     # Advance + hash fingerprint + DRIFT detection
   ```
7. **Errors**: `references/error-codes.md`

## Context Injection (v0.7+ · Blueprint Context Template · 3-flag)

After Work starts, AI Agent must use `oxn work inject` to get full context. Design ref: `.openxenon/drafts/design-blueprint-context-template.md`.

> **Core**: injection uses `oxn work inject` subcommand (3-flag), NOT `oxn work show`. `show` is status query (returns full JSON/YAML structure); `inject` is context-only injection (Markdown content + lightweight path JSON).

### Injection Command Cheatsheet

```bash
# Work-level (three-piece set)
oxn work inject <name> --paths      # Path metadata (JSON)
oxn work inject <name> --context    # context.md content (Markdown)
oxn work inject <name> --memory     # memory.md content (Phase 2 returns null)

# Task-level (add --task to scope)
oxn work inject <name> --task <t> --paths
oxn work inject <name> --task <t> --context
oxn work inject <name> --task <t> --memory

# At least one flag required; missing → OXN_CLI_INPUT_ERROR
```

### Work-Level Context Injection (4 steps)

```
1. oxn work inject <name> --paths
   → Returns JSON:
     {
       work_md:    ".openxenon/works/<name>/work.md",
       context_md: ".openxenon/works/<name>/context.md",
       memory_md:  ".openxenon/works/<name>/memory.md",
       tasks: [
         { name: "dev", task_md: "...", context_md: "...", memory_md: "..." },
         { name: "doc", task_md: "...", context_md: "...", memory_md: "..." },
       ]
     }
   → AI Agent gets three-piece paths, can selectively read files

2. oxn work inject <name> --context
   → Outputs works/<name>/context.md content (Markdown, not JSON)
   → AI Agent gets WorkContext (runtime-read, no longer PlanLock-locked)
   → File missing → OXN_INTENT_CONTEXT_MISSING (prompts AI to write)

3. AI Agent reads Blueprint ## Use-referenced all Domain/Workflow/Stack files
   → Self-determines which Terms/Invariants are relevant to this Work Goal
   → Don't duplicate content (Blueprint stays clean, see inv-26)

4. AI Agent reads Blueprint ## Boundaries + ## Scope + ## Context Template
   → Understands Slot topology + file boundaries + assembly instructions
```

### Task-Level Context Injection (2 steps)

```
When switching tasks:
5. oxn work inject <name> --task <t> --context
   → Outputs works/<name>/tasks/<t>/context.md content (Markdown)
   → AI Agent gets TaskContext

6. oxn work inject <name> --task <t> --memory
   → Outputs works/<name>/tasks/<t>/memory.md content
   → Phase 2 returns null + hint "(memory.md not yet implemented — Phase 2)"
```

### Key Principles

- **Semantic content uses Markdown** (context.md is LLM-native format, zero parse overhead)
- **Metadata uses JSON** (`--paths` returns lightweight JSON; keys use snake_case: work_md / context_md / memory_md / task_md)
- **3-flag injection**: `--paths` / `--context` / `--memory`, not `--with-context` all-return
- **Don't return full Work structure** (avoid token bloat + LLM JSON parse overhead)
- **At least 1 flag**: no-flag call → `OXN_CLI_INPUT_ERROR` hinting `--paths` or `--context`

### Task ## Artifacts Declaration (inv-35 · Scope validation at run)

Task.md writes `## Artifacts` section declaring expected artifact paths; at run, Engine validates ⊆ Blueprint `## Scope.allow`:

```yaml
## Artifacts
  - path: packages/engine/src/Work/plan-hash.ts
    type: code
  - path: packages/engine/src/Work/birth-cert.ts
    type: code
```

**type values**: `code` | `config` | `document` | `test` (from `enums.ts`).

**Validation rules**:
- Each Artifact path ⊆ Blueprint ## Scope.allow glob list
- Each Artifact path ∩ Blueprint ## Scope.forbid glob list = ∅
- Default Scope (allow=[]) → allows any path (backward compatible)

**Validation fails** → `OXN_INTENT_SCOPE_VIOLATION` (YIELD_TO_HUMAN), lists violating paths + Scope section. AI Agent should:
1. Fix Task ## Artifacts section (delete out-of-bounds path or adjust path)
2. **Don't modify Blueprint ## Scope to bypass** (Scope is Blueprint author's boundary declaration)
3. If genuinely needs cross-boundary → use `oxn asset evolve` to derive new Blueprint version

### Writing context.md Flow (Intent Phase · v1.3)

```
Step 1: oxn work create <name> --blueprint <bp>
        → Generate work.md (Use + Tasks structure + Intent goal)

Step 2: oxn work add-task <name> --task <t> --blueprint <bp>
        → Generate tasks/<t>/task.md (with Parts + Refs + 🆕 ## Artifacts)

Step 3: AI Agent reads Blueprint ## Context Template + ## Use refs
        → Self-determines which Terms/Invariants to take from referenced Domain
        → Write works/<name>/context.md (Work Context)
        → Split by Blueprint ## Boundaries → write tasks/<t>/context.md (Task Context)
        (v1.3: context.md can be written at any phase, no need to lock first)

Step 4: oxn work run <name> --validate-only
        → Validates Blueprint refs resolution + Task ## Artifacts ⊆ Blueprint ## Scope.allow
        → Fails → check error code (OXN_WORK_REFS_UNRESOLVED / OXN_INTENT_SCOPE_VIOLATION) to fix
        (v1.3: legacy validate subcommand deleted, merged into run --validate-only)
```

### Modifying work.md / context.md Flow (v1.3)

```
Step 1: Directly edit work.md / context.md / tasks/<t>/task.md / tasks/<t>/context.md
        (v1.3: no unlock needed; work.md is freely modifiable)

Step 2: oxn work submit <name> --task <t>
        → At submit, Engine computes workMdHash → compares with previous SUBMIT
        → Mismatch → append ASSET_DRIFT event to trace.jsonl (does not block submit)
        → Append SUBMIT event (with workMdHash + probeResult)
        (Multiple DRIFTs = Blueprint or AI encountering issues, observable without hardcoded judgment)
```

### Hash Semantics (v1.3 · HashAsSubmitFingerprint)

- **Does NOT protect work.md from modification**: work.md freely modifiable (drift-prevention lock deleted)
- **Submit-time hash of work.md**: recorded as completion fingerprint in trace.jsonl SUBMIT event
- **Modified work.md does NOT block submit**: only appends ASSET_DRIFT event (observable)
- 1 normal Task = 1 SUBMIT event; modified work.md + submit = 1 ASSET_DRIFT + 1 new SUBMIT

### Error Response Cheatsheet (v1.3)

| Error code | Trigger | AI Response |
|---|---|---|
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact out-of-bounds Scope | Fix Task `## Artifacts` section (don't modify Blueprint Scope) |
| `OXN_WORK_NOT_STARTED` | submit before run | Run `oxn work run <name>` first |
| `OXN_WORK_NOT_FOUND` | work doesn't exist | `oxn work create <name>` |
| `OXN_CLI_INPUT_ERROR` | `oxn work inject <name>` with no flag | Add `--paths` / `--context` / `--memory` and retry |

## Multiple Assets and Tasks relationship

- **Work-level `## Refs`**: declare `domain[]` + `blueprint[] + `stack[]` ref pool (N items)
- **Task-level**: each task picks **single** 1 blueprint + 1 domain in `task.oxn` (subset of Work-level ref pool)
- **add-task validation**: task's chosen blueprint/domain **must** exist in Work-level ref pool (`add-task` errors with `not declared in work`)

## Errors
`WORK_NOT_STARTED` → run first | `TASK_OXN_MISSING` → `add-task` | `SCOPE_VIOLATION` → fix Artifacts section

## Prohibitions
Skip run and go directly to submit; legacy syntax (`align|noun|verb|new`); **retired commands** (`oxn work validate` / `lock` / `unlock`).

> Note: `inject` is a v0.7+ LEGAL subcommand (`oxn work inject`) for 3-flag context injection.

## v0.7+ Onboarding Trigger Rules (ADR-0089 D6)

**Trigger conditions**: when user input contains any of these keywords, run onboard first before deciding next step:
- "use OXN to onboard me", "onboard me with OXN", "set up OXN", "add OXN"
- "quickstart", "getting started", "5-minute setup"
- "use OXN in my project", "integrate OXN"

**Skill internal execution flow**:
```
1. Call `oxn onboard --detect --json` (detection, no side effects)
2. Parse returned data:
   - projectType: 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed'
   - recommendation.path: 'A' | 'B1' | 'B2'
3. List 3 option cards in UI + current recommendation
4. **Must wait for engineer confirmation** (do not auto-decide)
5. Execute engineer-chosen subcommand:
   - 'A' → `oxn onboard --new`
   - 'B1' → `oxn onboard --existing --proof-first` (rerouted to definition-first 5-min loop; experience full closed loop: define → lock → collaborate → finalize)
   - 'B2' → `oxn onboard --existing --bootstrap`
6. After bootstrap completion, enter normal Work flow
```

**Prohibited**: skip detect and directly choose path; make engineer's decisions autonomously.