---
title: Introduction
---

# Introduction

> OpenXenon is the collaboration workbench for engineers and AI. Engineers define intent, AI executes alignment, OXN proves the results.

## What — What is it

OpenXenon addresses the most fundamental problem in the AI coding era: **When AI says "I'm done", who verifies it actually is?**

The answer is **OXN** — a proof engine independent of AI. It does not write code, does not replace AI, and does one thing only: **prove, in a tamper-proof way, whether AI's work result is acceptable.**

The core paradigm is **IAP (Intent–Align–Proof)**, with three actors and clean separation of concerns:

```
Engineer         AI              OXN
  │              │               │
  ▼              ▼               ▼
Intent          Align           Proof
Domain(.oxn)    Work(.oxn)      frozen.json
Blueprint(.oxn) Task → Artifact  Verdict
  │              │               │
  └──────────────┴───────────────┘
      no overlap, no bypass
```

## Problems Solved

1. **Verify AI execution results** — After AI claims a task done, OXN independently runs Probes and emits `frozen.json`. AI cannot modify that file.
2. **Engineer-intent alignment** — Through Domain and Blueprint upfront constraints, tell AI "what language" and "what steps", preventing drift.
3. **Make Token spend effective** — Proof result feedback drives intent evolution, experience accumulates into reusable assets, no Token burned in vain.

## IAP Paradigm at a Glance

| Axis | Owner | Responsibility | Key Asset |
|---|---|---|---|
| Intent | Engineer | Define business glossary and technical blueprint | Domain / Blueprint |
| Align | AI | Orchestrate execution within blueprint boundaries | Work / Task / Part |
| Proof | OXN | Independent verification, emit tamper-proof proof | Probe / Proof / frozen.json |

> **IAP First Law**: Ownership does not cross; proof cannot be bypassed.

## OXN Engine

OXN Engine is the executor of the Proof axis, composed of three parts:

- **DSL** — OXL domain-specific language (implemented in Langium), defines Domain / Blueprint / Work syntax
- **Runtime** — Kernel (pure logic verification) + Infra (IO execution) + Daemon (supervisor + escape mechanism)
- **CLI** — The only operation entry for engineers and AI (`oxn proof` / `oxn work` / `oxn blueprint` / `oxn domain`)

## Choose Your Learning Path

| If you are... | Read | Time |
|---|---|---|
| **Evaluator / Decision-maker** | Introduction → Core Concepts | 15 min |
| **Application developer** | Quickstart → Recipes → DDD in Practice | 1–2 h |
| **AI integrator** | llm-prompt → Align → CLI | 30 min |
| **Contributor** | Architecture → Extending | 2–3 h |

> 🟦 **If you are an AI model reading this doc**: please read [llm-prompt.md](./llm-prompt.md) directly.

> 💡 **Usage tip**: this site's URLs include the `.html` suffix (GitHub Pages project-page constraint). Browse via the left sidebar or top menu, rather than typing URLs by hand.
