---
title: Proof axis
---

# Proof axis

> The Proof axis is OXN's sovereignty. Probes declare acceptance criteria; OXN emits tamper-proof `frozen.json`; Verdict decides Pass or Fail.

## What — Three-layer structure of the Proof axis

| Entity | Responsibility |
|---|---|
| Probe | Acceptance-criteria declaration and execution. Engineers declare the standard; OXN runs the check |
| Proof | The complete verdict record OXN produces after running Probes (`frozen.json`) |
| Verdict | The final conclusion of a Proof: PASS or FAIL |

Flow:

```
Intent axis                Align axis
Blueprint(.oxn)             Task → Artifact
    │   Probe standard          │   Artifact fact
    └────────────┬───────────────┘
                 │
                 ▼
              Proof axis
           Proof(Verdict)
      OXN (Kernel + Infra + Daemon)
                 │
                 │  Verdict = FAIL
                 ▼
            Escape mechanism
        notify + block + diagnose
```

---

## Probe: declaration and execution of acceptance criteria

### Built-in Probe types

| Probe | Physical observation | Verdict logic |
|---|---|---|
| `fs-exists` | Filesystem glob scan | `found.length > 0` |
| `fs-not-exists` | Filesystem glob scan | `found.length === 0` |
| `fs-content-match` | readFile + RegExp | `matched === true` |
| `fs-parseable` | readFile + JSON.parse | `parsed === true` |
| `shell-exec` | spawn command | `exitCode === 0` |
| `test-pass` | `bun test` | `exitCode === 0` |
| `deps-resolved` | Parse lock file | `missing.length === 0` |
| `ts-compiles` | `tsc --noEmit` | `exitCode === 0` |
| `lint-check` | `biome check` | `exitCode === 0` |
| `http-responds` | HTTP fetch | `status === expectedStatus` |
| `file-exports` | Child-process import to extract exports | `exports.length > 0` |

### Proof-First mode: direct CLI use

```bash
oxn proof create check-deploy
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add http-responds --url http://localhost:3000/health --status 200
oxn proof run check-deploy
```

### Full IAP mode: inline in Part

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

**Information hiding**: the Probe block inside a Part is not visible to AI. AI only sees `skill_context`.

---

## Proof: the frozen.json contract

After OXN runs Probes, it emits `frozen.json` — the tamper-proof proof record:

```json
{
  "proofName": "check-deploy",
  "frozenAt": "2026-06-12T10:00:00Z",
  "verdict": "PASS",
  "probes": [
    { "name": "fs-exists", "status": "PASSED", "actual": "found", "expected": "found" },
    { "name": "http-responds", "status": "PASSED", "actual": "200", "expected": "200" }
  ]
}
```

### Tamper-proof nature of frozen.json

- AI **cannot write** `frozen.json` — the verdict is OXN's exclusive
- Engineers **cannot edit** `frozen.json` — read-only
- If AI could bypass Probes and modify the verdict directly, the entire Proof axis would be a name in name only

### Physical paths

| Mode | Path |
|---|---|
| Proof-First (P standalone) | `.openxenon/proofs/<name>/frozen.json` |
| Full IAP mode | `.openxenon/works/<w>/tasks/<t>/frozen.json` |

Both modes use the same filename `frozen.json`; the difference is only in parent directory and lifecycle.

---

## Verdict and the escape mechanism

### Verdict

- **PASS**: all Probes pass → Work / Task may continue
- **FAIL**: any Probe fails → **escape mechanism triggers**

### Escape mechanism

When the Kernel determines Verdict = FAIL, the Daemon triggers forced intervention, preventing AI's "false done":

1. **notify** — inform engineer and AI that "execution result did not meet expectations"
2. **block** — Work stays in `running` state; may not enter `done`
3. **diagnose** — provide a complete Intent → Align → Proof chain snapshot

```json
{
  "work": "trial-deploy",
  "task": "deploy-prod",
  "proof": {
    "verdict": "FAIL",
    "probe": "@oxn/probes/fs-exists",
    "expected": "found",
    "actual": "not_found",
    "escape_action": "BLOCK_DONE"
  }
}
```

**No `--force` bypass.** This is the ultimate line of defense in the IAP paradigm — if proof can be bypassed, IAP is a name in name only.

---

## How — How to use

### Proof-First mode (quick validation)

```bash
# Proof axis
oxn proof create check-deploy

# Proof axis
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add file-exports --target ./dist/index.js --export handler
oxn proof probe add http-responds --url http://localhost:3000/health --status 200

# Proof axis
oxn proof run check-deploy
# Proof axis
# Proof axis
# Proof axis

# Proof axis
oxn proof run check-deploy
# Proof axis
```

### Managing Proofs

```bash
oxn proof list                  # list all Proofs
oxn proof show check-deploy     # show details of a specific Proof
```

### Full IAP mode (Blueprint-driven)

In the Work flow of [Align](./align.md), every call to `oxn work submit` automatically triggers Probe execution and emits `frozen.json`.

---

## Runtime three-module collaboration

Execution of the Proof axis depends on the strict division of labor among the three Runtime modules:

| Module | Responsibility | Constraint |
|---|---|---|
| Kernel | Pure logic — validate Probe declaration legality | Zero IO, no side effects |
| Infra | Execute Probes (fs / http / shell, etc.) | Only answer facts, no PASS/FAIL verdict |
| Daemon | Manage state machine + trigger escape on Verdict FAIL | Must not modify Kernel rules |

> **Purity First Law**: Infra must not bypass Daemon and self-declare done → Daemon must not modify Kernel rules → Kernel must not directly execute Task

## → Reference

- [Intent](./intent.md) — Probe standards come from Blueprint's `observe` field
- [Align](./align.md) — How Probes are inlined in Task + Part
- [Quickstart](./quickstart.md) — Full demo of Proof-First mode
- Legacy doc: [Full Probe type reference](./reference/probe-types.md) (old SSOT)
