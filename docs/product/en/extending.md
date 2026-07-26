---
title: Extending
---

# Extending

> Custom Probes, Parts, and DSL extension points. OpenXenon's extension system is structured in three layers.

## What — Three-layer extension system

| Layer | Extension point | Difficulty | When to use |
|---|---|---|---|
| Custom Probe | Add a new verification instrument | Low | Built-in Probes are not enough |
| Custom Part | Add a new execution component | Medium | Specific tool integration is needed |
| DSL extension | Modify OXL syntax | High | New asset type or syntactic structure is needed |

---

## Custom Probe

### Built-in Probe types

OpenXenon ships 11 built-in Probes covering the most common verification needs:

| Probe | Purpose |
|---|---|
| `fs-exists` | Check that a file exists |
| `fs-not-exists` | Check that a file does not exist |
| `fs-content-match` | Check that file content matches a regex |
| `fs-parseable` | Check that a file is parseable (JSON, etc.) |
| `shell-exec` | Execute a command and check the exit code |
| `test-pass` | Run `bun test` |
| `ts-compiles` | Run `tsc --noEmit` |
| `lint-check` | Run `biome check` |
| `deps-resolved` | Check dependency completeness |
| `http-responds` | HTTP endpoint check |
| `file-exports` | Check file exports |

See [Proof](./proof.md) for full parameters and verdict logic.

### Anatomy of a custom Probe

A Probe consists of two parts:

1. **Physical observation** (Infra layer): perform the actual IO operation
2. **Pure-function verdict** (Kernel layer): produce Pass/Fail from the observation result

```
Observation function (Infra)   →   Verdict function (Kernel)
fs.glob("dist/**/*.js")         →   found.length > 0 → PASS
```

### Inline Probe (recommended)

Declare Probes directly inside a Part, no registration required:

```oxn
part "build" {
  skill_context = "Implement the Member registration API"
  probe "api-exists" ref "@oxn/probes/fs-exists" {
    params = { path = "src/api/member.ts" }
  }
  probe "api-compiles" ref "@oxn/probes/ts-compiles" {
    params = { project = "tsconfig.json" }
  }
}
```

---

## Custom Part

Part is the execution unit of a Task. Built-in Part types:

| Part type | Description |
|---|---|
| `shell-exec` | Execute a shell command |
| `jest-runner` | Run Jest tests |

Custom Parts require code-level registration into the Part registry (see legacy doc `docs/guides/probe-development.md`).

---

## OXL DSL extension

OXL is implemented on top of Langium. The grammar is defined in `src/oxl/langium/oxn.langium`.

After modifying the grammar, regenerate:

```bash
bun run langium:generate
```

Generated files live in `src/oxl/generated/` and **must not be edited manually**.

### Extension scenarios

| Scenario | Method |
|---|---|
| Add a new DSL keyword | Modify `oxn.langium` grammar rules |
| Add a new asset type | Add a new grammar rule + corresponding validator |
| Add a new scope addressing | Add `@oxn/` or a custom scope |

---

## Private Builtin module

Package commonly used project-local Domain / Blueprint / Probe as built-in assets, placed under `src/builtin/`:

```
src/builtin/
├── blueprints/
│   └── git-workflow.md
├── domains/
│   └── ProgramContext.md
└── probes/
    └── custom-probe.ts
```

These assets are copied to `.openxenon/` on `oxn init`.

---

## Langium Retirement Schedule (v0.6.1 PR-4 + v0.7.0)

> **D-β c lock**: v0.6.1 does not uninstall Langium (kept as v0.6.x fallback); v0.7.0 cutover

| Phase | Time | Status |
|---|---|---|
| **v0.6.0+** | unified-native (default uses mdast + EntityCompiler) | ✅ done |
| **v0.6.1 PR-1** | `:::intent{...}` old syntax throws `E_MD_DEPRECATED_SYNTAX` | ✅ done |
| **v0.6.1 PR-4** | Langium driver marked `@deprecated`; `oxn <asset> validate --no-langium` introduced | ✅ current PR |
| **v0.6.1 PR-4** | CI guard: `bun run check:no-langium-usage` (blocks new Langium imports) | ✅ current PR |
| **v0.7.0 cutover** (8–12 weeks later) | `git rm packages/engine/src/oxl/langium-driver/` + `generated/` + uninstall `langium`/`langium-cli` npm deps | 🔲 pending |

**User behavior changes**:

1. **No new Langium imports** — go through mdast + EntityCompiler
2. **CLI defaults to mdast** — `oxn <asset> validate` does not touch Langium grammar by default
3. **Strict mode**: `oxn <asset> validate --no-langium` flag guarantees mdast-only (only legal form after v0.7.0)

**Migration guide (for v0.7.0 prep)**:

- Existing `.md` files need no migration (already canonical format)
- After conversion, user code no longer needs `import { URI } from 'langium'` — safe to delete
<!-- boundary:ignore -->
- See [md-native-grammar-rfc.md](https://github.com/istuen/openxenon/blob/main/.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md) D9

## → Reference

- Legacy doc: [Probe development guide](./guides/probe-development.md) (old SSOT)
- Legacy doc: [OXN DSL reference](./reference/oxn-dsl.md) (old SSOT)
- [Architecture](./architecture.md) — Where extension points live in the L0–L3 layering
