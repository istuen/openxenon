# Asset Mode vs Work Mode Boundary

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when distinguishing the two Work modes.

## Two Skill Responsibility Boundaries

| Dimension | `oxn-asset` | `oxn-work` |
|---|---|---|
| Entry trigger | "create/modify/delete Asset" | "run work / orchestrate task" |
| Underlying CLI | `oxn work create --type asset --asset-kind X` | `oxn work create --type develop` |
| Main operations | CRUD Asset | Orchestration + Execution + Display Proof |
| State management | planLock + citations + DAG | 8 stages + Round + .work.planLock |
| references/ focus | AssetKind / creation / evolution / lifecycle | 8 stages / error codes / anti-patterns / git workspace |

## Internal CLI Mapping

```bash
# === Triggered by oxn-asset ===
oxn work create MyDomain --type asset --asset-kind domain
oxn work create evolve-MemberContext --type asset --asset-kind domain --evolve-from MemberContext
oxn work create w-archive-old --type asset --asset-kind domain --action archive

# === Triggered by oxn-work ===
oxn work create feat-x --type develop --asset domain=MemberContext --asset blueprint=dev-workflow
oxn work run --work-file feat-x/work.oxn
oxn work submit --work feat-x --task step1
```

## Concept Distinction

### Asset is "Boundary" (I)

- Domain: business boundary (DDD)
- Blueprint: technical boundary (slot DAG)
- Stack: environment boundary (runtime / linter / test)
- Library: knowledge boundary (documentation aggregation)
- External: external boundary (external resources)

### Work is "Orchestration" (A+P)

- Orchestration: declare which Assets are referenced (`--asset`)
- Execution: drive Round state machine (run / submit / status)
- Proof: after completion, generate Proof (frozen.json)

## Dual-Path Design

### Fast-Path CLI (v0.6.1-alpha.0)

```bash
oxn domain create MyDomain
oxn blueprint create dev-workflow --slots build,test,verify
```

- Bypasses IAP
- Writes to disk directly
- Suitable for quick prototyping

### Rigorous Path Work (v0.6.3+)

```bash
oxn work create MyDomain --type asset --asset-kind domain
```

- Goes through IAP closed loop
- planLock protection
- `oxn-asset` Skill recommends this path

## Anti-Patterns

- ❌ Call `oxn work run` when triggered by `oxn-asset` (that's `oxn-work`'s operation)
- ❌ Call `oxn asset create` within `oxn-work` (that's `oxn-asset`'s operation)
- ❌ Mix Asset mode and Develop mode (asset mode has no task DAG)