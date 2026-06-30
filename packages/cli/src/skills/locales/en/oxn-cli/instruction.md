# /oxn-cli — OpenXenon CLI Entry Point

> This skill teaches you how to use the OpenXenon `oxn` command-line tool (v0.1 hard-switch, 8 top-level commands).

## When to Use

When you need to:
- Initialize a project (`oxn init`)
- Validate .oxn files
- Get AI work context (`oxn work context`)
- Query project status
- **Create Intent (Domain / Blueprint skeleton)** — See "Intent Authoring Best Practices" at the end of this skill

## Global Options

All commands support:
- `-j, --json` — JSON output
- `-v, --verbose` — Verbose output
- `--help` — Help

## Common Commands

### Project Initialization

```bash
oxn init                 # Create .openxenon/ boundary
oxn config show          # View project configuration
```

### Domain Management

```bash
oxn domain create <DomainName>          # Generate Domain skeleton
oxn domain validate <DomainName>        # Validate Domain
oxn domain list                                 # List all Domains
```

### Blueprint Management

```bash
oxn blueprint create <name> [--slots a,b,c]   # Generate Blueprint skeleton
oxn blueprint validate <name>                 # Validate Blueprint
oxn blueprint list                            # List all Blueprints
```

### Work / Task Lifecycle

```bash
oxn work create <w> --blueprint <bp> # Generate work skeleton (with task blocks) from Blueprint
oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]
oxn work list-tasks --work <w>
oxn work task-status --work <w> --task <t>
oxn work run --work-file <work.oxn>            # Start state machine
oxn work submit --work-name <w> --task <t>     # Advance task
oxn work status --work-name <w>                # Query progress
```

### Get AI Context (**Full Isolation**)

```bash
# Task-level: only sees the task's injected domain
oxn work context --work <w> --task <t> --json

# Work-level: sees the full work resource pool (no isolation)
oxn work context --work <w> --json
```

### Dev Tools (DSL Internals)

```bash
oxn dev compile <file.oxn>             # OXL → AssemblyIR
oxn dev validate                        # Validate .oxn syntax
oxn dev migrate-yaml <file>             # YAML → OXL
```

## Anti-Patterns

- Do not run `oxn init` inside the AI assistant software (already initialized)
- Do not directly edit `.openxenon/works/<w>/state.json` (Core exclusive)
- Do not reference assets inside a Domain (breaks Asset Independence)
- Do not write Blueprints in YAML/JSON (v0.1 onward, OXL is the single source of truth)
- Do not call `oxn task *` / `oxn arsenal *` / `oxn leader *` / `oxn get-context` / `oxn add-probe` — **all permanently removed**
- Do not call `oxn work new` — use `oxn work create` instead
- Do not call `oxn work task *` — use `oxn work add-task` / `list-tasks` / `task-status` / `task-edit` / `task-delete` instead
- **Do not attempt `oxn part new` / `oxn probe new`** — Part / Probe are **not standalone assets** (by design), they are written **inline** in `work.oxn` / `task.oxn` inside `task { part { ... } }` / `part { probe { ... } }` blocks after `work create`
- **Do not use `--name <X>` named parameters** — Domain/Blueprint/Work create and validate all use **positional `<name>`** (OXL-to-CLI 1:1 mapping)
- **Do not design `oxn domain append-term` / `oxn blueprint add-prop`** — Intent assets are edited with `$EDITOR`; the CLI only provides scaffolding (see "Intent-Align CLI Philosophy")

---

## Intent Authoring Best Practices

> **The CLI only generates "empty skeletons"** — the actual Intent content (DDD vocabulary, slot topology, prop schema, skill_context text) is filled in by AI. This section is the filling guide.

### 1. Domain Authoring (Business Intent)

The skeleton (produced by `oxn domain create`) contains only TODO placeholders. **Good Domain writing** (see `.openxenon/domains/work-context.oxn`):

```oxn
domain "MemberContext" {
  description = "Member bounded context: manages registration, authentication, membership levels"

  term {                              // ✅ Required ≥3 core entities
    "Member":     "Registered member entity"
    "Account":    "Member login credentials"
    "Membership": "Membership level and benefits record"
  }

  ban { "User", "Customer", "AccountHolder" }  // ✅ Required ≥2 banned terms

  invariant {                              // ✅ Required ≥1 invariant. See "invariant Writing Decision Tree" below
    "Passwords must never be stored in plaintext"
    "The same email must not be registered twice in the same context"
  }
}
```

**Anti-Patterns**:
- ❌ term only has 1 word (too coarse)
- ❌ ban list is empty (no constraint power)
- ❌ description says "TODO: describe business boundary" (CLI placeholder, must be replaced)

**Mnemonic**: term lists entities, ban lists forbidden terms, invariant lists hard rules; follow the 3-step self-questioning in the "invariant Writing Decision Tree" below (1 rule → single block single rule / same topic → single block multiple rules / different topics → multiple blocks), IR equivalent.

#### invariant Writing Decision Tree

> All three forms are equivalent after IR flattening (`OxnDomainIR.invariant: OxnInvariantDecl[]`).
> When AI writes a new Domain, **ask yourself 3 steps first**, don't blindly split into multiple blocks.

**Self-questioning (3 steps)**:
1. Only 1 invariant? → Use **single block, single rule**: `invariant { "r1" }`
2. Do multiple invariants need `// ── <topic> ──` comment grouping (≥2 different topics)? → Use **multiple blocks** (Case A)
3. Otherwise? → Use **single block, multiple rules** (Case B, IR equivalent, compact preferred)

**Case A — Multiple blocks (grouped by topic)**:

```oxn
// ───── Dictionary convergence hard constraints ─────
invariant { "IAPError dictionary v1.0.2 converges to 5" }
invariant { "OXNCrash dictionary v1.0.2 converges to 3" }

// ───── Channel and process contract ─────
invariant { "IAPError goes through stdout JSON channel" }
invariant { "OXNCrash goes through stderr stack channel" }
```

**Case B — Single block, multiple rules (compact same-topic)**:

```oxn
invariant {
  "Work runtime type must strongly match Blueprint.type"
  "frozen.json is immutable after generation"
  "work-trace.jsonl is append-only"
  "The same part can only be submitted once"
  "Artifact paths must fall within the Work sandbox"
}
```

**Edge cases**:
- 1 very long rule (>100 chars) → single block single rule exclusively, don't mix
- >5 rules without topic → single block multiple rules (avoid visual noise)
- git diff needs individual rule visibility → multiple blocks

**Anti-Patterns**:
- ❌ Only 1 rule yet split into multiple blocks (`invariant {} invariant {}`) — pure noise
- ❌ 5+ rules without topic crammed into multiple blocks (reader finds no grouping clues)
- ❌ Mixing single-block-multiple-rules and multiple-block styles in the same file without clear reason (breaks visual consistency)

### 2. Blueprint Authoring (Technical Intent)

The skeleton (`oxn blueprint create --slots`) generates a **linear slot DAG** by default: `a → b → c`.

**4 slot DAG patterns**:

| Pattern | Use Case | Syntax |
|---|---|---|
| **linear pipeline** | Sequential execution | `a → b → c` (CLI default) |
| **fan-out** | One start, parallel N | `split → { a, b }` |
| **fan-in** | N converge to one | `{ a, b } → merge` |
| **parallel + final** | General purpose | `build → { test, lint } → release` |

Fan-out example:
```oxn
slot "split" { deps = [] }
slot "a"     { deps = ["split"] }
slot "b"     { deps = ["split"] }
slot "merge" { deps = ["a", "b"] }
```

**prop design patterns** (blueprint-level parameters, injected into all parts):

```oxn
blueprint "dev-workflow" {
  prop "env"      { type = string; default = "dev" }
  prop "timeout"  { type = number; default = 30000 }
  prop "branches" { type = list<string>; required = true }

  slot "develop" { deps = []; observe = ["lint-check", "type-check"] }
  slot "test"    { deps = ["develop"]; observe = ["test-runner"] }
  slot "verify"  { deps = ["test"] }
}
```

**observe references builtin probes** (`@oxn/...` namespace):

| Builtin Name | Purpose |
|---|---|
| `@oxn/probes/shell_exec` | Run shell command (returns exit_code/stdout/stderr) |
| `@oxn/probes/fs_exists` | Check if file/directory exists |
| `@oxn/probes/lint-check` | Run linter |
| `@oxn/probes/test-runner` | Run test suite |
| `@oxn/probes/type-check` | Run type checker |

**Anti-Patterns**:
- ❌ Always linear chain (even when branching makes more sense) — CLI default trap
- ❌ Slot names in PascalCase — must be kebab-case
- ❌ Cycle in deps — `oxn blueprint validate` will reject

### 3. Part Inline Authoring (inside task block / work block)

> Part has **no separate file**; it is **inlined** inside `task "..." { part "..." { ... } }`.

**Part field semantics**:

| Field | Required | AI Perspective |
|---|---|---|
| `lifecycle` | Optional | `code` / `test` / `design` / `refactor` (default `code`) |
| `objective` / `skill_context` | ✅ Required | **What to do** (first thing AI reads) |
| `acceptance` | ✅ Required | **Verifiable deliverable** (AI self-checks after writing) |
| `guidance` | Optional | **Extra hints** (pitfalls / constraints / references) |

**Inline example**:

```oxn
task "register-member" {
  blueprint "dev-workflow"
  domain "MemberContext"

  part "develop" {                          // Name aligns with blueprint slot
    skill_context = "Implement Member registration API; passwords must be hashed"  // objective
    acceptance = [
      "POST /api/members accepts {username, email, password}",
      "Password is hashed with bcrypt (cost≥12) before storage",
      "OpenAPI schema written"
    ]
    guidance = "Refer to the ban list in .openxenon/domains/member-context.oxn"
  }

  part "test" {
    skill_context = "Write unit tests for Member registration"
    acceptance = ["≥80% line coverage", "Edge cases: weak password / duplicate email / injection"]
  }
}
```

**Anti-Patterns**:
- ❌ skill_context only says "implement" (too abstract, AI doesn't know what's needed)
- ❌ acceptance uses vague terms ("good"/"done") — must be machine-verifiable
- ❌ Part name doesn't align with blueprint slot

### 4. Probe Inline Authoring (inside part block)

> Probe has **no separate file**; it is **inlined** inside `part "..." { probe "..." { ... } }`.

**Scenario A: Reference builtin probes** (recommended):

```oxn
slot "verify" {
  deps = ["test"]
  observe = ["shell-exec", "fs-exists"]   // Reference builtin name
}
```

**Scenario B: Inline custom probe** (when builtin is insufficient):

```oxn
part "verify" {
  skill_context = "Check password strength"

  probe "check-password-strength" {        // Inlined inside part block
    prop "password"   { type = string; required = true }
    prop "min-length" { type = number; default = 8 }
    output { ok = boolean; score = number }
  }
}
```

**Probe field semantics**:

| Field | Required | Meaning |
|---|---|---|
| `description` | Recommended | What the probe does |
| `prop "<name>"` | As needed | Input parameters: `type` required; can add `required` / `default` |
| `output` | Required | Output fields: `name = type` form |

**Anti-Patterns**:
- ❌ Building your own probe when a builtin would suffice
- ❌ Probe has no `output` (kernel doesn't know how to determine pass/fail)
- ❌ prop missing `type` (syntax error)

### 5. work.oxn Complete Fill-in Example

`oxn work create my-feature --blueprint dev-workflow` generates:

```oxn
work "my-feature" {
  context { goal = "TODO"; constraints = ["TODO"]; loop_policy { max_iterations = 3 } }
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "develop" {
    blueprint "dev-workflow"
    part "slot-name" { skill_context = "TODO" }
  }
}
```

**AI fill-in**:

```oxn
work "my-feature" {
  context {
    goal = "Implement new member registration feature"
    constraints = [
      "Must use MemberContext.term.Member, not User/Customer",
      "Password must be hashed before storage"
    ]
    loop_policy { max_iterations = 5 }
  }
  blueprint "dev-workprint" ref "@prj/blueprints/dev-workflow";

  task "develop" {
    blueprint "dev-workflow"
    domain "MemberContext"
    part "develop" {                  // ← Changed to align with blueprint slot
      skill_context = "Implement Member registration API, password hashed with bcrypt"
      acceptance = [
        "POST /api/members endpoint is functional",
        "Passwords are hashed, no plaintext storage"
      ]
    }
  }
}
```

### 6. Validation Flow

After writing any Intent, **always run these three steps**:

```bash
oxn domain validate <name>
oxn blueprint validate <name>
oxn work validate --path <work.oxn>
```

**Detailed reference**: `src/oxl/examples/works/` contains 4 complete examples (explore-dsl / develop-member / fix-issue / onboarding) that can be used as templates for direct imitation.

## Detailed References

- [CLI Command Reference](../../../docs/reference/cli-reference.md)
- [OXL Reference](../../../docs/reference/oxl.md)
- [Blueprint Format Reference (including 4 slot DAG patterns)](../../../docs/reference/blueprint-format.md)
- [work.oxn 4 Patterns](../../../docs/architecture/work-and-task.md)
