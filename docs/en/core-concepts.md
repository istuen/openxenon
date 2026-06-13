---
title: Core Concepts
---

# Core Concepts

> IAP three-axis diagram + three-actor separation of powers + IAP First Law.
> This chapter is the foundation for understanding everything else in OpenXenon.

## What — IAP three-axis diagram

IAP (Intent–Align–Proof) is the architectural soul of OpenXenon. It is not a top-down imposed paradigm, but grows bottom-up from the requirements of the Proof axis.

```
        Intent axis                Align axis
     Domain(.oxn)                 Work(.oxn)
          │                            │
          ▼                            ▼
     Blueprint(.oxn)              Task → Artifact
          │   Probe standard       │  Artifact fact
          └────────────┬───────────────┘
                       │
                       ▼
                   Proof axis
                Proof(Verdict)
                 OXN Engine
                       │
                       │  feedback (P → I)
                       │  Verdict drives Intent evolution
                       └──────────▶ Intent evolution
```

**Forward derivation**: Engineer defines Intent → AI executes Align → OXN gives Proof
**Feedback loop**: Proof's Verdict feedback drives Intent evolution (precision-ize / business-ize / asset-ize)

The three axes form an I → A → P → I closed loop, where each round's Intent is more precise than the previous one.

## Three actors — Separation of powers

The core of the IAP paradigm is the separation of three axes and non-overlapping ownership. On the workbench, there are three behavioral subjects with independent sovereignty:

| Subject | Owned axis | Core power | Absolute forbidden zone |
|---|---|---|---|
| Engineer | Intent | Author Domain and Blueprint | Cannot self-prove intent is correct |
| AI | Align | Orchestrate Work, choose Parts | Cannot self-verify execution is compliant |
| OXN | Proof | Emit tamper-proof Proof | Cannot modify intent or replace AI's execution |

Each subject has sovereignty only within its own axis; no other subject may encroach.

## IAP First Law

> **Ownership does not cross; proof cannot be bypassed.**

- AI must not cross Blueprint slot boundaries (alignment power is bound by intent power)
- Engineer must not declare done before Probe checks (intent power is bound by proof power)
- OXN must not modify Domain terms or Blueprint rules (proof power must not usurp)

## IAP three-axis entities

### Intent axis (Engineer sovereignty)

| Entity | Definition | Physical form |
|---|---|---|
| Domain | Business glossary (term), ban, invariant | `.openxenon/domains/<name>.oxn` |
| Blueprint | Technical pipeline template, defines slot topology + Probe standards | `.openxenon/blueprints/<name>.oxn` |
| Program Domain | OXN built-in programming concept glossary, Blueprint usable without DDD | `@oxn/domains/ProgramContext` |

### Align axis (AI sovereignty)

| Entity | Definition | Physical form |
|---|---|---|
| Work | AI's complete job space aligned with Blueprint | `.openxenon/works/<name>/work.oxn` |
| Task | An execution step within Work, aligned with one Blueprint slot | `.openxenon/works/<w>/tasks/<t>/` |
| Part | A specific tool for executing a Task, inlined in the task block | `part { skill_context = "..." }` |
| Artifact | The file or state persisted after Task execution | Actual files in the project filesystem |

### Proof axis (OXN sovereignty)

| Entity | Definition | Physical form |
|---|---|---|
| Probe | Acceptance-criteria declaration (Intent side) and execution (Proof side) | `@oxn/probes/*` or inline |
| Proof | OXN's complete verdict record after running Probes on Work/Task | `frozen.json` |
| Verdict | Proof's final conclusion: PASS or FAIL | `verdict` field in `frozen.json` |

**Proof physical paths**:
- Standalone P mode (Proof-First): `.openxenon/proofs/<name>/frozen.json`
- Full IAP mode: `.openxenon/works/<w>/tasks/<t>/frozen.json`

Both modes use the same filename `frozen.json`; the difference is only in the parent directory and lifecycle.

## OXN Engine

OXN Engine is the executor of the Proof axis: [Intent](./intent.md) declares standards, [Align](./align.md) emits facts, OXN reconciles the two and gives [Proof](./proof.md).

OXN Engine = **DSL + Runtime + CLI**:

| Component | Role |
|---|---|
| DSL (OXL) | Syntax definition and parsing for Domain / Blueprint / Work |
| Runtime | Kernel (pure logic) + Infra (IO) + Daemon (supervisor) |
| CLI | The unified operation entry for engineers and AI |

## Runtime three-module purity constraints

| Module | Responsibility | Constraint |
|---|---|---|
| Kernel | Pure logic verification, zero IO | Must not execute any side effects (e.g. `fs.existsSync`) |
| Infra | Side-effect / IO execution, get facts | Only answers facts, must not make PASS/FAIL verdicts |
| Daemon | Lifecycle management + escape mechanism | When Probe FAILs, prevent Work from entering done |

> **Purity First Law**:
> - Infra must not bypass Daemon and self-declare done
> - Daemon must not modify Kernel rules
> - Kernel must not directly execute Task

## Information-hiding principle

> **AI sees only "what to do", not "what to satisfy"** — this is OpenXenon's adversarial design, preventing AI from targeted Probe-bypass.

| Information | Who can see |
|---|---|
| Domain term / ban | AI visible (needs shared vocabulary) |
| Blueprint slot | AI visible (needs to know steps) |
| Probe verification standard | AI **NOT visible** |
| frozen.json | AI **NOT writable** |
| state.json | AI **NOT writable** |

## Two asset classes and two-layer architecture

| Entity | Created by | Used by | OXN's role |
|---|---|---|---|
| Domain | Engineer | AI / OXN | Read + verify |
| Blueprint | Engineer | AI / OXN | Read + verify |
| Work | OXN + Engineer | AI / OXN | Create + manage |
| Proof | OXN | Engineer / AI | Emit + freeze |

## → Reference

- Full glossary: [Glossary](./glossary.md)
- Code architecture layering: [Architecture](./architecture.md)
- Design notes: [Intent](./intent.md) / [Align](./align.md) / [Proof](./proof.md)
