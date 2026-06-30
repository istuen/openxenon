# /oxn-proof — OXN Proof-First 5-Command Loop (v0.1.2 catalog wrapper)

> **Let OXN verify, not humans.** This is the standalone operation of the **Proof** axis among the three IAP axes — skipping Domain/Blueprint assetization, declaring acceptance criteria with Probes.

## Goal

Enable AI to perform acceptance via a **semantic whitelist**:
1. AI calls `oxn proof probe list` to know which probes are available
2. AI calls `oxn proof probe describe <name>` to know what inputs each probe accepts
3. AI calls `oxn proof probe add <proof> <probe> --input-json '{...}'` to append a probe
4. AI works (write code / run commands)
5. AI calls `oxn proof run` to let OXN run physical observations → write frozen.json

**Encapsulation boundary**: AI only ever sees the **semantic layer** (probe name + description + input contract), **not** what OXN uses internally for ref / param / verdict logic. The CLI handles the translation.

## When to Use

| Scenario | Use proof or work? |
|---|---|
| "AI says it's done? Let OXN verify." | **Use `oxn proof`** ← this skill |
| Single acceptance scenario (dist artifact + run tests) | **Use `oxn proof`** |
| Multi-stage pipeline | Use `oxn work` + Blueprint |
| Cross-domain business | Use `oxn work` + Domain |

## 5 Commands (Whitelist)

| Subcommand | Purpose | What AI Sees |
|---|---|---|
| `oxn proof create <name>` | Create proof space | File path |
| `oxn proof probe list` | **List all probes** | `{name, description, requiredInputs[]}[]` |
| `oxn proof probe describe <name>` | **Detail probe input contract** | `{name, description, inputs[], examples[]}` |
| `oxn proof probe add <proof> <probe> --input-json '{...}'` | Append a probe | Translated internal storage (not directly shown) |
| `oxn proof run <name>` | Run OXN probes → write frozen.json | verdict + details + signature |
| `oxn proof list` | List all proofs | Name + verdict |
| `oxn proof show <name>` | Read frozen.json | Full verdict + signature |

## Standard Workflow (spec-first)

```
Step 1: AI first uses probe list / describe to know what OXN can verify
   oxn proof probe list
   oxn proof probe describe fs-exists

Step 2: AI creates proof.oxn (acceptance specification)
   oxn proof create check-deploy

Step 3: AI appends probes (per the contract from describe)
   oxn proof probe add check-deploy fs-exists --input-json '{"path":"./dist/index.js"}'
   oxn proof probe add check-deploy shell-exec --input-json '{"command":"bun test","timeout":60000}'

Step 4: AI works (write code / run commands) — does not call OXN
   → Note: AI sees the "acceptance specification", not how OXN determines PASS/FAIL

Step 5: AI calls proof run to let OXN verify
   oxn proof run check-deploy
   → Kernel validation + Infra physical observation + write frozen.json

Step 6: AI reads the verdict
   oxn proof show check-deploy
   → FAIL → AI fixes → re-run → PASS
```

## Physical Boundary

```
.openxenon/proofs/
└── check-deploy/
    ├── proof.oxn     ← Probe declarations (OXN-translated internal representation)
    └── frozen.json   ← Verdict document (chmod 0o444 + SHA-256, immutable)
```

## Immutability

| Layer | Mechanism | Bypass Cost |
|---|---|---|
| OS layer | chmod 0o444 (owner auto-elevates to 0o644 before overwrite → write → try/finally re-lock to 0o444) | Done internally by writer, transparent to AI / engineer |
| Content layer | `_xenon_meta.content_hash` = SHA-256 | Hash won't match if content is modified |

**AI Constraints** (CLI whitelist):
- ✅ Allowed: `oxn proof create / list / show / probe list / probe describe / probe add / run`
- ❌ Forbidden: directly `vim .openxenon/proofs/*/frozen.json` / `echo ... > frozen.json` / any direct writes

## IAP Paradigm Reference

```
Proof-First Entry = Independent operation of the Proof axis in IAP
├─ Intent axis is skipped (no Domain / Blueprint)
├─ Align axis is simplified (no Work / Task / Part DAG)
└─ Proof axis is activated (probe declaration → physical observation → pure-function verdict → frozen.json)
```

**Core value**: Let engineers feel OXN's core value within 5 minutes — **AI may fake completeness, but OXN does not fool itself.**

## Completion Criteria

- `oxn proof probe list` returns available probes (semantic name + description + required inputs)
- `oxn proof probe describe <name>` returns input contract + examples
- `oxn proof probe add <proof> <name> --input-json '{...}'` succeeds
- `oxn proof run` returns verdict + readOnly: true
- `oxn proof show` returns full frozen.json (including signature)

Give the `frozenPath` to the engineer for review. **Do not** modify frozen.json.

---

## AI Error Handling: Read the `error.action` Field

When an `oxn proof *` command fails, the CLI outputs JSON containing an `error.action` field. **AI reads this field to decide the next step**, do not parse the `message` string.

### How to Read Verdict: FAIL?

```bash
oxn proof show check-deploy
```
Read the `frozen.json.verdict` field:
- `verdict === 'PASSED'` → Task passed, AI may proceed
- `verdict === 'FAILED'` → Task failed (**normal business result, not an exception**), AI fixes code and re-runs

### How to Read Business Exceptions (IAPError)?

```json
{
  "ok": false,
  "error": {
    "code": "IAP_PROOF_INFRA_FAIL",
    "axis": "PROOF",
    "action": "YIELD_TO_HUMAN",
    "message": "Probe cannot access target resource",
    "context": { "path": "./dist", "systemError": "EACCES" }
  }
}
```

**AI Decision Table** (by `action` field):

| `action` value | AI next action |
|---|---|
| `AUTONOMOUS_RETRY` | AI fixes code/parameters and retries (does not modify proof) |
| `YIELD_TO_HUMAN` | AI stops current task, lets human fix (environment/requirement issues AI cannot fix) |

**Other fields beyond the two `action` values** (AI does not need to care about, but should know they exist):
- `code` — Error full name (`IAP_<AXIS>_<CODE>`)
- `axis` — Which IAP axis (INTENT/ALIGN/PROOF)
- `message` — Human-readable description
- `context` — Machine-readable fields (for test/debug)

### Engine Crashes (OXNCrash) Are Invisible to AI

`OXN_CRASH_*` errors go through the stderr channel and are not received by the AI Skill. **If your command mysteriously exits with code 2 and no output, the engine has crashed. AI should stop working and notify the engineer.**

### Practical Example

```bash
# 1. AI runs proof
$ oxn proof run check-deploy
{
  "ok": false,
  "error": {
    "code": "IAP_PROOF_INFRA_FAIL",
    "axis": "PROOF",
    "action": "YIELD_TO_HUMAN",
    "message": "Cannot access ./dist/index.js",
    "context": { "path": "./dist/index.js", "systemError": "EACCES" }
  }
}

# 2. AI reads action = YIELD_TO_HUMAN → knows it cannot fix
# 3. AI notifies user: "dist/index.js has no read permission, please run chmod +r ./dist/index.js"
# 4. User fixes, AI re-runs
```

```bash
# 1. AI runs proof
$ oxn proof run check-deploy
{
  "ok": false,
  "error": {
    "code": "IAP_ALIGN_CHECKLIST_MISSING",
    "axis": "ALIGN",
    "action": "YIELD_TO_HUMAN",
    "message": "Part 'scaffold' of task 'scaffold' is missing the required intent_checklist field",
    "context": { "taskName": "scaffold", "partName": "scaffold", "missingField": "intent_checklist" }
  }
}

# 2. AI reads action = YIELD_TO_HUMAN → knows it cannot fix
# 3. AI notifies user: "part.scaffold is missing intent_checklist, please add the pre-work 4-question alignment in task.oxn"
# 4. User adds it, AI re-runs
```

**Do not**:
- ❌ Parse the `message` string with regex
- ❌ Assume `code: 'IAP_*'` means YIELD_TO_HUMAN
- ✅ Always read the `action` field first
