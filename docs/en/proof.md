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

### Verdict 三态 (3-state verdict, v0.2 Sprint 3b T5)

Since v0.2, `frozen.json` distinguishes three verdict states:

| Verdict | Meaning | Color (TTY) | Icon |
|---|---|---|---|
| `PASSED` | All probes passed | green | ✅ |
| `FAILED` | At least one probe failed | red | ❌ |
| `INCONCLUSIVE` | At least one probe hit a taint signal (sandbox violation, permission denied, cache path, ...) | yellow | ⚠️ |

Aggregation rule (per `src/cli/proof-frozen-writer.ts`):
- Any probe with `verdict === 'INCONCLUSIVE'` → overall `INCONCLUSIVE`
- Otherwise, all probes passed → `PASSED`
- Otherwise → `FAILED`
- Empty probe list → `FAILED` (no proof means no proof)

`interferenceFlags[]` is a YELLOW-tint record on the probe level; it does not
auto-fail the probe, but the overall verdict lifts to `INCONCLUSIVE`. Use
`oxn proof show <name>` to inspect flags and the human-readable verdict.

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

## v0.3 Proof Verdict Output Specification (canonical .md)

> **This section is the v0.3.0 canonical pure-MD form specification**. Complements `## Verdict 与逃逸机制` (上一节 zh-cn ref): that section covers **frozen.json** (machine kernel product), this section covers **.md canonical** (human-readable SSOT).

### 1️⃣ Core Structure (H1 + H2 + H3 + lists)

```markdown
---
entity: proof
version: 0.3.0
name: <proof-name>
---

# Proof: <proof-name>

> One-line description of what this Proof verifies

## Verdicts

### <verdict-name>
- type: pass | fail | inconclusive
- value: <human-readable description>

## Runtime

### snapshot
- observed_at: <ISO 8601>
- probes_run: <int>
- probes_passed: <int>
- probes_inconclusive: <int>
```

### 2️⃣ 3-State Verdict Semantics

| `type` value | Semantics | Triggered when |
|---|---|---|
| `pass` | Verification passed | All Probes match expected |
| `fail` | Verification failed | Any Probe missed expected |
| `inconclusive` | Signal pollution | ProbeVerdict received RED flag (e.g. fs probe read SIGINT path) |

### 3️⃣ Complete Example (3-state mix)

```markdown
---
entity: proof
version: 0.3.0
name: order-build-validity
---

# Proof: order-build-validity

> Verify place-order Work's build step produces executable + type + lint all pass

## Verdicts

### build-exists
- type: pass
- value: dist/oxn file exists with sha256 matching lock

### type-check
- type: pass
- value: bun run typecheck 0 error (0 warning)

### lint
- type: fail
- value: biome check 1 error in src/cli/proof.ts:88 — see frozen.json#probes[2].errorMessage

### network-reachable
- type: inconclusive
- value: http-responds probe returned RED flag: TLS handshake interrupted by signal

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 4
- probes_passed: 2
- probes_inconclusive: 1
```

### 4️⃣ Key Rules (Compiler Hard Constraints)

| Rule | Error code | Source |
|---|---|---|
| H2 must be `Verdicts` or `Runtime` | `E_MD_CATEGORY_UNKNOWN` | `proof-compiler.ts:203` |
| H3 unique within its H2 | `E_MD_DUPLICATE_H3` | `proof-compiler.ts:214` |
| `type` must be one of 3 states (other values silently degrade to `inconclusive`) | silent degrade | `proof-compiler.ts:243` |
| Missing `type` field | silent default `inconclusive` | `proof-compiler.ts:144` |
| `## Runtime` must contain **exactly one** H3 = `snapshot` (v0.3.0 Q3 decision) | `E_MD_INVALID_RUNTIME_BLOCK` | `proof-compiler.ts:251` |
| Runtime must NOT explicitly write `probes_failed` (v0.3.0 Q2 decision) | `E_MD_REDUNDANT_FIELD` | `proof-compiler.ts:286` |

### 5️⃣ Runtime Field Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `observed_at` | ISO 8601 string | No | Proof run timestamp |
| `probes_run` | int | No | Total Probes run |
| `probes_passed` | int | No | Passed count |
| `probes_inconclusive` | int | No | Polluted count |
| `probes_failed` | **derived** | **DO NOT write explicitly** | `run - passed - inconclusive` computed automatically |

> **Data redundancy is the root of all evil**: if a user (or AI) writes `probes_failed: 1` manually while `probes_passed + probes_inconclusive` already imply a different value, storage becomes inconsistent (`4 ≠ 2+1+1`). **Q2 decision**: `E_MD_REDUNDANT_FIELD` strict reject.

### 6️⃣ Dual-layer Verdict Mapping (.md ⇄ frozen.json)

```
┌─────────────────────────┐         ┌────────────────────────────┐
│ .md (canonical SSOT)    │         │ frozen.json (Kernel output) │
├─────────────────────────┤         ├────────────────────────────┤
│ ### build-exists         │         │ { verdict: "PASSED",      │
│ - type: pass            │ ◀────▶  │   probes: [                │
│ - value: dist/oxn ...   │ (Proof  │     { probeName: "build..", │
│                         │   run)  │       passed: true },      │
│ ### type-check           │         │     ...                    │
│ - type: fail            │         │   ],                       │
│ - value: biome ...      │         │   totalCount: 2,           │
│                         │         │   passedCount: 1 }        │
└─────────────────────────┘         └────────────────────────────┘
```

**3-state naming discrepancy** (Q1 decision: keep status quo, don't modify Kernel Schema for form uniformity):

| Layer | Value space |
|---|---|
| `.md` canonical (ProofCompiler) | `pass` / `fail` / `inconclusive` ← lowercase |
| `frozen.json` (FrozenProofSchema) | `PASSED` / `FAILED` / `INCONCLUSIVE` ← uppercase + `-ED` |
| Kernel `ProbeVerdict` | `PASS` / `FAIL` / `INCONCLUSIVE` ← uppercase no `-ED` |

**Mapping boundary**: `src/cli/proof-frozen-writer.ts` does `PASS → PASSED` mapping when writing frozen.json. `src/oxl/md-bridge/compilers/proof-compiler.ts:parse()` does reverse — uppercase values silently degrade to `inconclusive` (avoid case ambiguity).

### 7️⃣ 5 Anti-patterns (Avoid These)

```markdown
❌ 1. Writing type in uppercase (frozen.json style) → silently degrades to inconclusive!
- type: PASS

❌ 2. Using :::intent{...} containers (post-v0.3 throws E_MD_DEPRECATED_SYNTAX)
```
: : :intent{#v1 type="verdict"}    ← Split opening ::: to avoid triggering canonical CI
  type: pass
: : :
```

❌ 3. Multiple Verdicts sharing same H3 text (throws E_MD_DUPLICATE_H3)
### build
- type: pass
### build          ← Same H2 name conflict → error
- type: fail

❌ 4. Writing H2 not in whitelist (throws E_MD_CATEGORY_UNKNOWN)
## Probes          ← Must be Verdicts or Runtime

❌ 5. Explicitly writing derived field (throws E_MD_REDUNDANT_FIELD)
## Runtime
### snapshot
- probes_failed: 1   ← Derived from probes_run - probes_passed - probes_inconclusive
```

### 8️⃣ End-to-End Workflow (v0.3.0)

```bash
# 1. Write .oxn (Langium grammar)
cat > .openxenon/proofs/my-proof/proof.oxn <<'EOF'
proof "my-proof" {
  description = "..."
  probe "p1" { ref "@oxn/probes/fs-exists" params { pattern = "./dist/oxn" } }
  probe "p2" { ref "@oxn/probes/shell-exec" params { command = "bun test" } }
}
EOF

# 2. Compile to v0.3 canonical .md (new in v0.3.0)
oxn proof compile my-proof
# → Writes .openxenon/proofs-md/my-proof.md (with ## Verdicts / ## Runtime)

# 3. Run proof (auto-generates frozen.json)
oxn proof run my-proof
# → Writes .openxenon/proofs/my-proof/frozen.json (with probes[] + verdict)

# 4. (Optional) AI reads .md to see verdict
cat .openxenon/proofs-md/my-proof.md
```

### 9️⃣ Real Example (in repo)

`src/oxl/examples-md/order-build-validity-proof.md` (3 pass verdicts + Runtime snapshot):

```markdown
---
entity: proof
version: 0.3.0
name: order-build-validity
---

# Proof: order-build-validity

> Verify place-order Work's build step produces executable + type + lint all pass

## Verdicts

### build-exists
- type: pass
- value: dist/oxn file exists with sha256 matching lock

### type-check
- type: pass
- value: bun run typecheck 0 error (0 warning)

### lint
- type: pass
- value: bun run lint 0 error (pre-existing 1 warning not counted)

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 3
- probes_passed: 3
- probes_inconclusive: 0
```

---

## → Reference

- [Intent](./intent.md) — Probe standards come from Blueprint's `observe` field
- [Align](./align.md) — How Probes are inlined in Task + Part
- [Quickstart](./quickstart.md) — Full demo of Proof-First mode
- Legacy doc: [Full Probe type reference](./reference/probe-types.md) (old SSOT)
