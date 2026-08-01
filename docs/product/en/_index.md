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
  │  Domain/Blueprint   │  Work/Task/Part   │  frozen.json + outcome.md
  │                      │                       │
  └────── collaboration pipeline ──────┴────── trust base ──────┘
```

**In one line**: **Engineers define intent, AI Agents run alignment, OXN Engine emits proof.**

## Problems Solved

1. **Verify AI execution results** — After AI Agent claims a task done, OXN Engine independently runs Probes and emits `frozen.json` + `outcome.md`. AI Agent cannot modify these files.
2. **Engineer-intent alignment** — Through Domain / Blueprint / Stack upfront boundaries, tell AI Agent what is allowed, what is forbidden, what language to use, and what steps to follow.
3. **Make Token spend effective** — Proof result feedback drives intent evolution; experience accumulates into reusable assets, no Token burned in vain.

## Why OpenXenon — Three Pains

> _(ADR-0014 · slogan-readme-2)_

It's 2 AM. An engineer is babysitting the AI — staring at the terminal, repeatedly asking: "Did you really finish? Did you really fix it? Did you really run the tests?" This is not an isolated case. This is the daily life of every engineer using AI to write code after 2025.

### Pain 1 · Drift

The AI drifts from the goal mid-execution:

> "Add an index to the user table" → AI modifies the user table → adds the index → also modifies the orders table (unnecessary side effect)

The engineer's original ask was just "add an index", but the AI wanders further and further, finally delivering "a refactored user module." **Drift is the hardest bug to find — by the time you see the code, it's already formed.**

### Pain 2 · Hallucination

The AI confidently outputs errors:

> "Fixed, tests pass" → Reality: the wrong file was modified → tests were never run

The AI's "confidence" is its most difficult property — it never hesitates, never says "I'm not sure", never self-checks before delivering. **Hallucination is not an AI defect; it is the AI's nature.**

### Pain 3 · Hallucinatory Self-Confirmation

The AI treats "unchecked" as "no problem" and iterates itself deeper into delusion:

> Round 1: AI says "fixed" → tests actually never ran
> Round 2: AI says "added tests" → tests don't cover the bug
> Round 3: AI says "tests pass" → because assertions are reversed
> Round 4: AI says "fix complete" → because it trusted Round 3's conclusion

> **This is the deepest trap of AI collaboration**: the AI is not "unable to do it", but "did it without knowing it didn't", and then **convinced itself it did**.

### OXN's Response

OXN breaks the hallucination self-confirmation loop with three non-negotiable mechanisms:

| Mechanism | Which Hallucination Link It Breaks |
|---|---|
| **frozen.json** (OS layer + content layer + exclusive write) | AI cannot modify "facts" |
| **E3 Engine independent notarization** (Engine ≠ AI) | Verification is not AI self-check |
| **3-state verdict** (PASSED / FAILED / INCONCLUSIVE) | INCONCLUSIVE forces human review |

> OpenXenon is a work in progress, but we sincerely hope it can help those engineers who are still babysitting AI late at night.

## IAP Paradigm at a Glance

| Stage | Actor | Behavior | Key Output |
|---|---|---|---|
| **Intent (define)** | Engineer | Define business glossary and technical blueprint | Domain / Blueprint / Stack |
| **Align (run)** | AI Agent | Orchestrate Work/Task/Part within boundaries | Work / Task / landed artifacts |
| **Proof (emit)** | OXN Engine | Run Probes, record objective facts, output tamper-proof evidence | frozen.json + outcome.md |

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
