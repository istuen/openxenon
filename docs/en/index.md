---
title: Introduction
---

# Introduction

> **OpenXenon — engineers define intent, AI Agents run alignment, OXN Engine emits proof.**
>
> Engineers trust AI Agents' execution results within boundaries.

## What — What is it

OpenXenon is a **lightweight human–AI collaboration tool**. Its OXN Engine, built on the IAP (Intent–Align–Proof) paradigm, drives the "Engineer ↔ AI Agent ↔ OXN Engine" collaboration pipeline.

**Core proposition**: when an AI Agent says "I'm done", who lets the engineer **trust** that it really happened? — Not the AI's self-claim, but the tamper-proof record independently notarized by OXN Engine.

```
Engineer              AI Agent              OXN Engine
  │                      │                       │
  ▼                      ▼                       ▼
Define Intent        Run Alignment         Emit Proof
  │                      │                       │
  │  Domain/Blueprint   │  Work/Task/Part   │  frozen.json + verdict.md
  │                      │                       │
  └────── collaboration pipeline ──────┴────── trust base ──────┘
```

**In one line**: **Engineers define intent, AI Agents run alignment, OXN Engine emits proof.**

## Problems Solved

1. **Verify AI execution results** — After AI Agent claims a task done, OXN Engine independently runs Probes and emits `frozen.json` + `verdict.md`. AI Agent cannot modify these files.
2. **Engineer-intent alignment** — Through Domain / Blueprint / Stack upfront boundaries, tell AI Agent what is allowed, what is forbidden, what language to use, and what steps to follow.
3. **Make Token spend effective** — Proof result feedback drives intent evolution; experience accumulates into reusable assets, no Token burned in vain.

## IAP Paradigm at a Glance

| Stage | Actor | Behavior | Key Output |
|---|---|---|---|
| **Intent (define)** | Engineer | Define business glossary and technical blueprint | Domain / Blueprint / Stack |
| **Align (run)** | AI Agent | Orchestrate Work/Task/Part within boundaries | Work / Task / landed artifacts |
| **Proof (emit)** | OXN Engine | Run Probes, record objective facts, output tamper-proof evidence | frozen.json + verdict.md |

> **Trust comes from objective notarization, not from AI's self-claim.** OXN Engine is a **notary, not a judge** — it records "what happened" (script exit codes, test coverage, file paths, etc., as objective facts) and does not judge whether the work is "acceptable". The "acceptability" judgment belongs to the engineer, based on comparing Asset against Proof.

## OXN Engine

OXN Engine is the executor of the IAP paradigm — a **control structure, not an execution environment**. It has four layers:

- **L0 Kernel** — Pure logic, zero IO (Schema / Contract / Verdict / Processor). Strictly forbids probabilistic mathematical models.
- **L1 OXL + Infra** — OXL domain-specific language (Langium implementation) + filesystem / socket / frozen unified side-effect entry points
- **L2 Engine** — Asset / Intent / Align / Proof / Insight / Pool six business modules (DDD-modularized)
- **L3 Tools** — CLI (`oxn` entry, thin composition layer) + Skills (`/oxn-work` is the only skill) + Daemon (supervisor + escape mechanism)

> **OXN Engine does not provide a code-execution environment.** Sandbox, CI/CD, and tests are invoked through libraries; their results are gathered as evidence by Probes. The engine does not care how execution happens — only whether the results are objectively recorded.

## Choose Your Learning Path

| If you are... | Read | Time |
|---|---|---|
| **Evaluator / Decision-maker** | Introduction → Core Concepts | 15 min |
| **Application developer** | Quickstart → Recipes → DDD in Practice | 1–2 h |
| **AI integrator** | llm-prompt → Align → CLI | 30 min |
| **Contributor** | Architecture → Extending | 2–3 h |

> 🟦 **If you are an AI model reading this doc**: please read [llm-prompt.md](./llm-prompt.md) directly.

> 💡 **Usage tip**: this site's URLs include the `.html` suffix (GitHub Pages project-page constraint). Browse via the left sidebar or top menu, rather than typing URLs by hand.
