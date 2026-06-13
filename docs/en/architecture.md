---
title: Architecture
---

# Architecture

> OXN Engine = DSL + Runtime + CLI. Runtime is composed of three modules (Kernel / Infra / Daemon), organized across four layers (L0–L3).

## What — The three layers of OXN Engine

| Layer | Role |
|---|---|
| **DSL** | OXL domain-specific language (implemented in Langium), defines Domain / Blueprint / Work syntax and parsing |
| **Runtime** | Execution core: Kernel (pure logic) + Infra (IO) + Daemon (supervisor) |
| **CLI** | Unified operation entry for engineers and AI (`oxn proof` / `oxn work` / `oxn blueprint` / `oxn domain`) |

---

## Runtime three modules

OXN Runtime is the executor of the Proof axis, composed of three modules with strict purity constraints:

| Module | Responsibility | Constraint |
|---|---|---|
| Kernel | Pure logic verification (Blueprint legality, Task–Slot matching, Probe declarations) | Zero IO, no side effects |
| Infra | Side-effect / IO execution (fs-exists, http-responds, etc.) | Only answer facts; no PASS/FAIL verdict |
| Daemon | Lifecycle management + escape mechanism | Must not modify Kernel rules |

> **Purity First Law**:
> - Infra must not bypass Daemon and self-declare done
> - Daemon must not modify Kernel rules
> - Kernel must not directly execute Task

---

## L0–L3 four-layer architecture

By analogy with CPU L0–L3 cache design, **inner layers do not depend on outer layers**:

```
┌──────────────────────────────────────────┐
│ L3: Runtime (CLI / Daemon / Skill / Hall)│
├──────────────────────────────────────────┤
│ L2: Module (Builtin + Domain + Work)     │
├──────────────────────────────────────────┤
│ L1: Foundation (OXN DSL + Infra / Port)  │
├──────────────────────────────────────────┤
│ L0: Kernel (Schema / Contract / Processor)│
└──────────────────────────────────────────┘
```

| Layer | Core constraint | Corresponding OXN module |
|---|---|---|
| L0 Kernel | Pure functions, zero IO, zero state | Kernel (pure logic verification) |
| L1 Foundation | DSL parsing + physical IO gateway | Infra (get facts) + OXL DSL |
| L2 Module | Business and engineering modules self-governing | Domain / Blueprint / Work / Task |
| L3 Runtime | Entry and external interaction | CLI / Daemon / Skill |

**Dependency rule**: L0 does not import L1+; L1 does not import L2/L3; L2 does not import L3.

---

## Purity constraints

OXN's three-module boundaries are derived directly from their responsibilities:

- **Kernel**: pure functions; banned: `fs` / `net` / `child_process` / `process.env` / `EventEmitter`
- **Infra**: side effects allowed, but can **only answer facts**; cannot make a "pass/fail" verdict
- **Daemon**: manages the state machine; triggers the escape mechanism on Verdict = FAIL

**Why such strict boundaries**: if Infra could itself judge PASS, AI could bypass Daemon; if Daemon could change Kernel rules, the engineer's acceptance criteria would be hollow.

---

## Information-hiding principle

OpenXenon's adversarial design assumes AI may try to bypass verification:

| Information | AI visible? | Reason |
|---|---|---|
| Domain term / ban | ✅ visible | AI must use the shared language |
| Blueprint slot | ✅ visible | AI must know the steps |
| Probe config inside Part | ❌ not visible | Prevent targeted optimization |
| frozen.json | ❌ not writable | Verdict is OXN's exclusive |
| state.json internal status | ❌ not writable | State is OXN's exclusive |

This is why `oxn work context` only returns `skill_context` and `allowedLanguage`, not the Probe verification standard.

---

## Two asset classes and two-layer architecture

```
┌─────────── Asset layer (declarative) ───────────┐
│  [Engineer assets]    Domain / Blueprint        │
│  [OXN work assets]    Work / Task / Proof       │
└──────────────────────────────────────────────────┘
              │ read / executed / proven
              ▼
┌─────────── Runtime layer (executional) ─────────┐
│  Kernel + Infra + Daemon                         │
└──────────────────────────────────────────────────┘
```

| Entity | Created by | Used by | OXN's role |
|---|---|---|---|
| Domain | Engineer | AI / OXN | Read + verify |
| Blueprint | Engineer | AI / OXN | Read + verify |
| Work | OXN + Engineer | AI / OXN | Create + manage |
| Proof | OXN | Engineer / AI | Emit + freeze |

## → Reference

- [Core Concepts](./core-concepts.md) — IAP paradigm and three-module concepts
- Legacy doc: [L0–L3 Constitution](./architecture/l0-l3-constitution.md) (full layering definition and dependency rules)
