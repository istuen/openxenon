---
title: Quickstart
---

# Quickstart

> Run Proof-First in 5 minutes: install `oxn` → create a Proof → add Probes → run verification → understand `frozen.json`.
> No need to learn Domain or Blueprint first.

## What — What is Proof-First

Proof-First is the **standalone operation mode of the Proof axis** in the IAP paradigm — engineers skip Intent/Align asset-ization and directly use Probes to declare acceptance criteria, letting OXN verify AI's work result.

This is the OpenXenon first-time experience. The goal is to let you **see for yourself how OXN proves results** in the shortest possible time.

## Why — Why designed this way

Proof-First solves the IAP cold-start problem: it doesn't require convincing you to learn Domain + Blueprint first — you only need one Probe catching a false "done" claim from AI, and the value is established. Repeated pain points naturally drive you to upgrade to full IAP.

See [Core Concepts](./core-concepts.md) for the full IAP paradigm design rationale.

## How — How to use it

### Step 1: Environment requirements and install

- **Node.js** >= 18 (any of npm / pnpm / bun is fine)
- Some Probes (`ts-compiles` / `lint-check` / `test-pass`) require the corresponding toolchain in your project (`typescript` / `biome` / `bun test`)

Install via npm:

```bash
npm install -g @istuen/openxenon
```

Install via pnpm:

```bash
pnpm install -g @istuen/openxenon
```

Install via bun:

```bash
bun install -g @istuen/openxenon
```

### Step 2: Initialize the workbench

```bash
oxn init

# Quickstart
oxn init --ai opencode   # OpenCode
oxn init --ai cursor     # Cursor
oxn init --ai codex      # Codex
```

Output:
```
Project initialized: my-project (locale: zh-CN)
✓ Created .openxenon/
✓ Created .openxenon/config.json
```

### Step 3: Create your first Proof

```bash
# Quickstart
oxn proof create check-deploy
# Quickstart
```

### Step 4: Add Probes (acceptance criteria)

```bash
# Quickstart
oxn proof probe add fs-exists --target ./dist/index.js

# Quickstart
oxn proof probe add http-responds --url http://localhost:3000/health --status 200
```

### Step 5: Run the proof

```bash
oxn proof run check-deploy
```

Output (PASS):
```
Kernel: validating Probe declarations... OK
Infra:  executing 2 Probes...
  ✅ fs-exists: ./dist/index.js found
  ✅ http-responds: 200 OK
Verdict: PASS (2/2)
Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

Output (FAIL):
```
Kernel: validating Probe declarations... OK
Infra:  executing 2 Probes...
  ✅ fs-exists: ./dist/index.js found
  ❌ http-responds: connection refused (expected 200)
Verdict: FAIL (1/2)
Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

### Step 6: Inspect frozen.json

```bash
cat .openxenon/proofs/check-deploy/frozen.json
```

```json
{
  "proofName": "check-deploy",
  "frozenAt": "2026-06-12T10:00:00Z",
  "verdict": "PASS",
  "probes": [
    { "name": "fs-exists", "status": "PASSED", "actual": "found" },
    { "name": "http-responds", "status": "PASSED", "actual": "200" }
  ]
}
```

### Step 7: AI-driven run (optional)

In Cursor / OpenCode / Codex, type:

```
/oxn-work verify that dist/index.js exists and exports handler
```

AI calls the CLI through the Skill, results flow back into `frozen.json`.

## Tamper-proof nature of frozen.json

`frozen.json` is the inspection report issued by the OXN Engine. Both AI and engineers can **only read, not modify** it. If AI could bypass the Probe and directly modify the verdict in `frozen.json`, the entire Proof axis would be a name in name only.

## More Proof commands

```bash
# Quickstart
oxn proof list

# Quickstart
oxn proof show check-deploy
```

## → Next step

Once Proof runs through, repeated Probe use naturally drives you to upgrade to full IAP:

→ **[Intent](./intent.md)** — use Domain and Blueprint to crystallize acceptance criteria into reusable assets
