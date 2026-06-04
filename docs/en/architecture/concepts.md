# 2. Core Concepts

> Starting with v0.1, OpenXenon introduces a **DDD dual-layer architecture**.
> Core concepts expand from the v0.0.x "three-tier assets" model to a "four-layer domain" model — Domain / Blueprint / Work / Task.
> See [v0.1 DDD Dual-Layer Architecture](./ddd-dual-layer.md) for the full picture.

## L0–L3 Four-Layer Architecture

OpenXenon enforces a strict four-layer architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│ L3: Runtime (Application Interaction)                            │
│ Responsibilities: System entry, human/AI interaction, daemon, UI  │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│ │    CLI    │ │   Daemon  │ │   Skill   │ │    Hall   │         │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│ L2: Domain (Domain Entities)                                    │
│ Responsibilities: Bounded contexts (DDD) + asset lifecycle + task exec │
│ ┌─────────────────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Arsenal (Asset Domain)  │ │ Domain       │ │ Work         │  │
│ │ Probe/Part/Blueprint   │ │ Bounded Ctx   │ │ Orchestration│  │
│ │ - Forge                │ │ - language    │ │ - Sandbox    │  │
│ │ - Promote              │ │ - rules       │ │ - Task DAG   │  │
│ └─────────────────────────┘ └──────────────┘ └──────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│ L1: Foundation                                                   │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐    │
│ │   OXN DSL                │ │     Infra                    │    │
│ │ - Grammar / Parser      │ │ - FsPort / PathPort / Probe  │    │
│ │ - Validator              │ │ - Side-effect containment    │    │
│ └─────────────────────────┘ └─────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│ L0: Kernel (Pure Logic)                                         │
│ ┌────────────┐ ┌────────────┐ ┌────────────────────────────┐    │
│ │   Schema   │ │  Contract  │ │        Processor            │    │
│ └────────────┘ └────────────┘ └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities**:
- **L0 Kernel**: Pure data contracts + pure logic, zero I/O
- **L1 Foundation**: OXN DSL parsing + infra adapters
- **L2 Domain**:
  - *Arsenal* — asset lifecycle (Probe/Part/Blueprint)
  - *Domain* — DDD bounded contexts (new in v0.1)
  - *Work* — task execution (Work/Task dual layer)
- **L3 Runtime**: CLI / Daemon / Skill / Hall

---

## Domain (new in v0.1)

A Domain is a DDD "bounded context" — a cohesive, well-bounded set of business concepts.

### Domain Structure

```oxn
domain "MemberContext" {
  description = "Member bounded context: registration, auth, levels"

  language {
    noun "Member" desc "Registered member entity"
    noun "Account" desc "Member's login credentials"
    verb "Register" desc "Submit registration form to create Member"
    verb "Authenticate" desc "Verify login credentials"
    ban = ["User", "Customer", "AccountHolder"]
  }

  domain_rules {
    rule "PasswordNeverPlaintext" desc "Passwords must never be stored in plaintext"
    rule "EmailMustBeUnique" desc "The same email cannot register twice in this context"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

### Domain Fields

| Field | Required | Meaning |
|------|----------|---------|
| `description` | no | One-line description of the bounded context |
| `language.nouns` | no | Domain nouns (AI must use) |
| `language.verbs` | no | Domain actions (AI must use) |
| `language.ban` | no | Banned words (AI must not use) |
| `domain_rules` | no | Business invariants (documented in v0.1, Probe-enforced in v0.2) |
| `context_map.imports` | no | Cross-context dependencies (anti-corruption layer) |

### Domain Physical Layout

```
.openxenon/domains/
├── member-context.oxn
├── order-context.oxn
└── marketing-context.oxn
```

- **File name** = kebab-case (e.g. `member-context.oxn`)
- **Domain name** = PascalCase (e.g. `MemberContext`)
- **Context Map alias** = short PascalCase (e.g. `Order`)

---

## Blueprint

A Blueprint is OpenXenon's "engineering drawing" — it defines a complete task structure.
Starting with v0.1, Blueprint serves only as a **technical pipeline template**; business semantics live in Domain.

### Blueprint Structure

```oxn
blueprint "dev-workflow" {
  version = 1
  description = "Development workflow"
  slot "develop" { }
  slot "test" { deps = ["develop"] }
}
```

### Blueprint vs Work/Task

| Relation | Description |
|----------|-------------|
| Blueprint is Intent | Static declaration of which stages a task must pass through |
| Task is Align | Dynamic instance: `blueprint "X"` in task.oxn binds to a Blueprint |

### Blueprint.type and Work.type must match

- `task` Blueprint ↔ `task` Work
- `plan` Blueprint ↔ `plan` Work
- `explore` Blueprint ↔ `explore` Work

---

## Part

A Part is a "component" in the Arsenal, with four fields: target / action / spec / probes.

### Part Structure

```oxn
part "develop-feature" {
  description = "Execute a development task and pass tests"
  prop "feature_desc" { type = string; required = true }
  prop "cwd" { type = string; default = "." }

  observe = ["ShellExec"]

  probe "build" ref "@oxn/probes/shell-exec" {
    params = { command = "pnpm build" }
  }
  probe "test" ref "@oxn/probes/shell-exec" {
    params = { command = "pnpm test" }
  }

  execution = [build, test]
}
```

### Part Four-Field Structure

| Field    | Visibility | Meaning |
|----------|------------|---------|
| `target` | Visible to AI | Scope constraint of execution |
| `action` | Visible to AI | Instruction sent to AI |
| `spec`   | Hidden from AI | Engineer's structural constraint |
| `probes` | Hidden from AI | Probe set to verify completion |

---

## Probe

A Probe is an "atomic check" at L1 — it observes physical reality and judges the result via pure functions.

### Built-in Probe Types

| Type | Capability | Judgment |
|------|-----------|----------|
| `fs_exists` | `glob()` filesystem scan | `found.length > 0` |
| `fs_not_exists` | `glob()` filesystem scan | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` command | `exitCode === 0` |

---

## Arsenal

Arsenal is OpenXenon's "asset library" — the storage for all standard assets.

### Asset Types

| Type | Layer | Description |
|------|-------|-------------|
| **Domain** | L2 (new v0.1) | DDD bounded context with business language and rules |
| **Blueprint** | L2 | Technical pipeline template, orchestrates slot topology |
| **Part** | L2 | Component with target/action/spec/probes |
| **Probe** | L1 | Atomic check |

### Arsenal Physical Layout

```
.openxenon/
├── arsenals/                ← Standard assets (v0.0.x legacy layout)
├── blueprints/              ← v0.1 recommended: technical pipeline templates
│   ├── dev-workflow.oxn
│   ├── fix-issue.oxn
│   └── explore-analyze-report.oxn
└── domains/                 🌟 NEW in v0.1: DDD bounded contexts
    ├── member-context.oxn
    ├── order-context.oxn
    └── marketing-context.oxn
```

### Lifecycle

Standard Arsenal assets go through a two-state lifecycle (v0.0.x compatible):

```
Draft ──[oxn arsenal promote]──▶ Formal
```

Domain assets skip this lifecycle (drop directly into `domains/`, reviewed by engineer).

---

## Work (v0.1 refactor)

Starting with v0.1, **Work = Workspace Orchestrator** — it no longer binds to a single Blueprint. It declares used Domain + Blueprint + Task DAG.

### Work Types

| Type | Description | Blueprint.type |
|------|-------------|-----------------|
| **Task** | Task execution | `task` |
| **Plan** | Plan orchestration | `plan` |
| **Explore** | Exploration | `explore` |

### Work Structure (v0.1)

```oxn
work "Onboarding" {
  context {
    goal = "Complete new-member registration"
    constraints = ["Cannot read order database directly"]
    loop_policy { max_iterations = 5 }
  }

  use_domain "MemberContext"
  use_domain "MarketingContext"
  use_blueprint "dev-workflow"

  task "RegisterMember" align "MemberContext.Register" {
    deps = []
    prop "username" = "new_user_123"
  }
  task "GrantWelcomeBonus" align "MarketingContext.GrantWelcomeBonus" {
    deps = ["RegisterMember"]
    prop "targetMemberId" = "RegisterMember.outputs.memberId"
  }
}
```

### Work Physical Layout

```
.openxenon/works/<work-name>/
├── work.oxn              ← Orchestrator
├── state.json            ← Workspace-level state
├── work-trace.jsonl      ← Workspace-level trace
├── CONTEXT.md            ← AI context summary (auto-generated)
└── tasks/
    ├── <task-name>/
    │   ├── task.oxn     ← Bound 1 Blueprint + inject N Domain
    │   ├── state.json
    │   ├── work-trace.jsonl
    │   └── frozen.json   ← Generated after verification
    └── ...
```

### Work Lifecycle

1. **CREATED** — Work created, task.oxn pending
2. **IN_PROGRESS** — Work is being executed (advancing along task DAG)
3. **PASSED** — All tasks passed
4. **FAILED** — Some task's probe failed

### Work Execution Flow

1. AI creates task via `oxn work task new`
2. AI fetches context via `oxn get-context --work X --task Y` (full isolation)
3. AI executes the task (writes code, runs commands)
4. AI advances part via `oxn leader submit --work-name X`
5. Kernel uses Probes to verify the Artifact and pass/fail
6. On pass, `frozen.json` snapshot is generated

---

## Task (new in v0.1)

A Task is a **single execution unit** inside a Work, bound to one Blueprint + injecting N Domain.
Cross-domain handling: split into N tasks, each pure on one domain.

### Task Structure

```oxn
task "register-member" blueprint "dev-workflow" {
  inject "MemberContext"

  context {
    objective = "Implement member registration, obey MemberContext's ubiquitous language"
    constraints = [
      "Must use noun.Member for class names",
      "Forbidden to use banned words (User/Customer)"
    ]
  }

  slot "develop" { deps = [] }
  slot "test" { deps = ["develop"] }
}
```

### Task Fields

| Field | Required | Meaning |
|------|----------|---------|
| `blueprint` | yes | Bound Blueprint name (must appear in work.oxn's use_blueprint list) |
| `inject` | no | Domain list to inject (must appear in work.oxn's use_domain list) |
| `context.objective` | no | Task goal |
| `context.constraints` | no | Task hard constraints |
| `slot` | multiple OK | Slot references, must correspond to Blueprint slots |

---

## Full Isolation (v0.1 key capability)

The core design of `oxn get-context` is **full isolation** — AI can only see the domains that the current task itself injects, **not the other domains declared in work.oxn**.

```
work.oxn declares:  use_domain [A, B, C]
task.oxn injects:   inject "A"
get-context output: only A's language/domain_rules; B and C are invisible
```

Consequences:
- AI is not distracted by unrelated domain terminology
- Cross-domain operations must be explicitly declared (inject → must align to that domain's capability)
- Domain boundaries are enforced from AI's perspective

---

## Hall (Studio)

Hall is OpenXenon's "studio" — a web console for engineers to view project state.

### Features

- View Work list and status
- View Draft/Formal assets
- View execution trace and verdicts

### CLI Command

```bash
oxn hall              # Open the studio
oxn hall --open       # Open in browser
```

---

## Terminology

### System Roles

| Term | Definition |
|------|------------|
| **Engineer** | Provides high-level intent and constraints; does not write code directly |
| **AI Assistant** | Parses engineer's intent, generates Blueprint and code |
| **oxn CLI** | Command-line entry; core features work without Daemon |

### L0–L3 Architecture

| Layer | Components | Responsibility |
|-------|-----------|----------------|
| **L0** | Schema / Contract / Processor | Data contracts + pure logic |
| **L1** | OXN DSL + Infra | Parsing + host adaptation |
| **L2** | Arsenal + Domain + Work | Assets + DDD + execution |
| **L3** | CLI / Daemon / Skill / Hall | External interaction |

### Core Concepts (v0.1)

| Term | Definition |
|------|------------|
| **Domain** | DDD bounded context carrying business language and rules |
| **Blueprint** | Technical pipeline template defining slot topology |
| **Probe** | Atomic check (fs_exists, shell_exec, etc.) |
| **Work** | Engineer's intent workspace sandbox (v0.1: orchestrator) |
| **Task** | Execution unit inside Work; binds 1 Blueprint + injects N Domain |
| **State** | Two-layer state.json (workspace + task) |
| **Hall** | Studio for project state visualization |

---

## Concept Relationship Diagram (v0.1)

```
L3 Runtime
  └── CLI / Daemon / Skill / Hall
        ↓ invokes

L2 Domain
  ├── Arsenal ──────► Blueprint / Part / Probe
  ├── Domain  ──────► language / domain_rules / context_map  🌟 v0.1
  └── Work
        ├── workspace-level state
        │     └── task DAG (use_domain + use_blueprint + task blocks)
        └── Task (×N)
              ├── bound 1 Blueprint
              ├── inject N Domain
              └── isolated CONTEXT.md

L1 Foundation
  ├── OXN DSL ──► Grammar / Parser / Validator
  └── Infra ──────► FsPort / PathPort / ProbePort

L0 Kernel
  └── Schema / Contract / Processor
```

---

## Next Chapter

Next: [v0.1 DDD Dual-Layer Architecture Details](./ddd-dual-layer.md) and [CLI Command Reference](../guides/cli-reference.md).
