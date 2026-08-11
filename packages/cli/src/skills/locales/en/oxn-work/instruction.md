# /oxn-work — Drive Work v0.7+

## AI Agent Onboarding Premise

> ⚠️ This section declares your identity and boundary when joining OpenXenon; read it before `## Goal`.

### Who you are

You are assisting an OpenXenon engineer. OpenXenon is a collaboration tool where engineers define AI Agent collaboration boundaries; the core paradigm is IAP (Intent–Align–Proof), the core engine is OXN Engine.

**Three-party collaboration model**:
- **Engineer** (Asset management + Proof review) — initiator
- **AI Agent** (you) — gain CLI capabilities via OXN Skill, work autonomously inside Work
- **OXN Engine** — passively responds to CLI, verifies ProbeOutcome + records Proof; does not judge

**IAP three phases**:
- **Intent axis** (engineer sovereignty): Domain locks business language, Blueprint locks tech topology
- **Align axis** (AI sovereignty): you — orchestrate Work/Task/Part within Blueprint slot boundaries
- **Proof axis** (OXN sovereignty): independently emit tamper-proof `frozen.json` + `trace.jsonl` + `state.json`

**OXN channel boundary**: actions AI performs OUTSIDE the OXN channel (reading code, trying approaches, giving up) are NOT recorded; only in-channel artifacts (context.md / memory.md + frozen.json) are evidence.

### CLI whitelist

✅ Allowed (v0.7+):

```bash
# Work orchestration + execution
oxn work create <name> --blueprint <bp> --domain <d> [--stack <s>] --goal "<goal>"
oxn work add-task <name> --task <t> --blueprint <bp>
oxn work inject <name> --paths | --context | --memory      # context injection (v0.7+)
oxn work inject <name> --task <t> --paths | --context | --memory
oxn work validate | lock | unlock | run | submit | finalize | status | list | show

# Proof verification
oxn proof create | probe add | run | list | show

# Asset / Blueprint / Domain (create/modify via oxn-asset Skill; commands here are query-only)
oxn blueprint list | show
oxn domain list | show

# Meta queries
oxn assetmap show <map> --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene>
oxn draft list | show
```

❌ Forbidden:
- Direct read/write of `.openxenon/proofs/*/frozen.json`, `.openxenon/works/*/state.json`, `.openxenon/works/*/tasks/*/frozen.json`
- Modifying Domain terms or Blueprint rules
- Using `--force` to bypass Proof / Lock
- Modifying any `.md` asset after lock (triggers `IAP_ALIGN_LOCK_HASH_MISMATCH`)
- Skipping `validate → lock` and going straight to `run`

### Output conventions

- **Code changes** referenced via `file_path:line_number`
- **Completion status** accompanied by `oxn work status --json` output
- **Unrecoverable errors** — report the specific error code (e.g. `OXN_INTENT_SCOPE_VIOLATION`) and pause for engineer intervention

### Failure handling

- `IAPError` → read expected/actual in `frozen.json`; COMPLETED → proceed, DEVIATED → fix and re-run, INCONCLUSIVE → report to engineer
- `OXN_INTENT_SCOPE_VIOLATION` → Task Artifact outside Blueprint Scope; fix `## Artifacts` (cannot modify Blueprint)
- `OXN_INTENT_CONTEXT_MISSING` → context.md missing at lock time; write it first, then lock
- `IAP_ALIGN_LOCK_HASH_MISMATCH` → asset drift after lock; `oxn work unlock` → confirm changes → re-lock
- Full error codes see `references/error-codes.md`

### Reading order

Your complete reading path (loading chain) lives at repo root `AGENTS.md` entry pointers → `dev/knowledge-loading.md` (v0.7+ single canonical doc).

---

## Goal
Create a **Work + ≥1 Task**, run through 8 phases: `create → add-task → validate → lock → run → submit → finalize` (`migrate?` optional)

## Hard Rules
- `validate`→`lock`→`run` is strict; no `--force`
- Drift after lock = `HASH_MISMATCH`; OXN does not commit/push
- Part/Probe inline in `task { part { probe {} } }`
- **v0.7+ PlanLock 5-hash**: before lock, AI Agent must write `works/<w>/context.md` and `tasks/<t>/context.md` (inv-33)

## Paradigm
D=Business Intent | B=Tech Intent | W=Align orchestration | T=Align execution
- **AI Agent in-channel tracking boundary**: actions AI performs OUTSIDE OXN channel (reading code, trying approaches, giving up) are NOT recorded by OXN — only in-channel artifacts (context.md / memory.md + state.json + trace.jsonl + frozen.json) are persisted (ADR-0084)

## Blueprint Selection
| Need | Template (.md with OXN blocks) → Blueprint |
|---|---|
| Explore / report | `assets/work-explore.md` → `explore-analyze-report` |
| Single-domain dev | `assets/work-develop.md` → `dev-workflow` |
| Bug fix | `assets/work-fix.md` → `fix-issue` |
| Cross-domain | `assets/work-onboarding.md` → `dev-workflow` (multi domain) |
| **MD authoring** (v0.7+ ADR-0089) | — → `md-author-blueprint` |

> v0.7+: Work no longer has mode (task/explore/edit); behavior differences carried by Blueprint slots/observe.
> v0.7+: MD authoring scenario uses `md-author-blueprint` (one of 5 starter Assets).

## Execution (v0.7+ AssetMap-driven Asset selection)

1. **Prereq**: project initialized via `oxn init`; required Assets ready — to create/modify Assets, **invoke `oxn-asset` Skill**.
2. **First-time project onboarding (v0.7+ ADR-0089)**: when project hasn't bootstrapped 5 starter Assets, trigger `oxn onboard` flow:
   - Run `oxn onboard --detect --json` (detection, side-effect-free)
   - Parse detection result → list 3 option cards (`A` new project / `B1` existing-Proof-First / `B2` existing-bootstrap)
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
6. **Run 8 phases**: `references/8-phase-detail.md`
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
   → AI Agent gets WorkContext (PlanLock-locked static structure skeleton)
   → File missing → OXN_INTENT_CONTEXT_MISSING (prompts AI to write before lock)

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
   → AI Agent gets TaskContext (PlanLock-locked Per-Slot subset)

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

### Task ## Artifacts Declaration (inv-35 · Scope validation at lock)

Task.md writes `## Artifacts` section declaring expected artifact paths; at lock, Engine validates ⊆ Blueprint `## Scope.allow`:

```yaml
## Artifacts
  - path: packages/engine/src/Work/plan-hash.ts
    type: code
  - path: packages/engine/src/Work/birth-cert.ts
    type: code
  - path: packages/engine/src/__tests__/plan-hash-5hash.test.ts
    type: test
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

### Writing context.md Flow (Intent Phase)

```
Step 1: oxn work create <name> --blueprint <bp>
        → Generate work.md (Use + Tasks structure + Intent goal)

Step 2: oxn work add-task <name> --task <t> --blueprint <bp>
        → Generate tasks/<t>/task.md (with Parts + Refs + 🆕 ## Artifacts)

Step 3: AI Agent reads Blueprint ## Context Template + ## Use refs
        → Self-determines which Terms/Invariants to take from referenced Domain
        → Write works/<name>/context.md (Work Context)
        → Split by Blueprint ## Boundaries → write tasks/<t>/context.md (Task Context)

Step 4: oxn work validate <name>
        → Validates Blueprint refs resolution + Task ## Artifacts ⊆ Blueprint ## Scope.allow
        → Fails → check error code (OXN_WORK_REFS_UNRESOLVED / OXN_INTENT_SCOPE_VIOLATION) to fix

Step 5: oxn work lock <name>
        → PlanLock 5-hash:
          workMdHash + workContextHash + blueprintsHash + tasksHash + taskContextsHash → allHash
        → context.md missing → OXN_INTENT_CONTEXT_MISSING (must write first)
        → Validation passes → write planLock to .work
```

### Modifying context.md Flow

```
Step 1: oxn work unlock <name>
        → Clear planLock → hint "can edit work.md / context.md / tasks/<t>/task.md / tasks/<t>/context.md"

Step 2: Edit context.md / task context.md

Step 3: oxn work validate <name>
        → Re-validate + refresh blueprints.json / .work

Step 4: oxn work lock <name>
        → Re-compute 5-hash + write planLock
```

### PlanLock 5-hash Guarantee

- N Works from same Blueprint have consistent WorkContext structure (except Goal)
- Cross-Work hash equality ⇒ structural skeleton consistency
- Post-lock drift → `IAP_ALIGN_LOCK_HASH_MISMATCH` (component='workContext' | 'taskContexts')
- Old 3-hash `.work` files still readable (backward compatible)

### Error Response Cheatsheet

| Error code | Trigger | AI Response |
|---|---|---|
| `OXN_INTENT_CONTEXT_MISSING` | lock with context.md missing | Write `works/<name>/context.md` first, then lock |
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact out-of-bounds Scope | Fix Task `## Artifacts` section (don't modify Blueprint Scope) |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | post-lock context.md / tasks/<t>/context.md drift | Run `oxn work unlock` → confirm change → re-lock |
| `OXN_CLI_INPUT_ERROR` | `oxn work inject <name>` with no flag | Add `--paths` / `--context` / `--memory` and retry |

## Multiple Assets and Tasks relationship

- **Work-level `## Refs`**: declare `domain[]` + `blueprint[] + `stack[]` ref pool (N items)
- **Task-level**: each task picks **single** 1 blueprint + 1 domain in `task.oxn` (subset of Work-level ref pool)
- **add-task validation**: task's chosen blueprint/domain **must** exist in Work-level ref pool (`add-task` errors with `not declared in work`)
- **planLock impact**: Work-level multi-refs cause `domains.json` / `blueprints.json` slim index to contain N entries; hash algorithm unchanged (hash the whole .json file)

## Errors
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## Prohibitions
Skip validate+lock; modify `.oxn` after lock; legacy syntax (`align|noun|verb|new`).

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
