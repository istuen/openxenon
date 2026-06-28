---
title: Core Concepts
---

# Core Concepts

> OXN is built from 4 structural entities (E1-E4) + L0-L3 engineering layers. E1-E4 define the philosophical boundaries; L0-L3 describe code dependency direction. Physical directories use their own names (`kernel/`, `oxl/`, `infra/`, `cli/`, `daemon/`, `src/service/<Domain>/`), and do not directly map to E or L.

## 1. E1-E4 Four Structural Entities (Philosophical Layer)

| Entity | Meaning | Ownership | Code Module (L2 Engine) |
|---|---|---|---|
| **E1 Asset** | Static hard constraint boundary | Engineer | `service/Asset/` |
| **E2 Work** | Dynamic collaboration (IAP + Round) | Engineer ↔ AI | `service/Intent/` + `service/Align/` |
| **E3 Engine** | Independent verification sovereignty | OXN | All L0-L2 |
| **E4 Insight** | Emergence layer (1+1>2) | AI reasoning | `service/Insight/` (v0.6 placeholder) |

**4 Core Principles**: Asset is boundary · Work is collaboration · Engine is notary · Insight is emergence.

## 2. L0-L3 Engineering Layers (Conceptual Layer)

```
L3 Tools (CLI+Skills+Daemon) → L2 Engine (E1-E4 business implementation)
  → L1 OXL+Infra (DSL+OS ops) → L0 Kernel (pure logic)
```

**Dependency**: L3 → L2 → L1 → L0 (unidirectional, no circular dependency).

## 3. Three Subjects Power Separation

| Subject | Dominant Entity | Core Power | Forbidden Zone |
|---|---|---|---|
| Engineer | E1 Asset + E2 Intent phase | Maintain asset library, create work, select boundaries | Cannot self-prove intent |
| AI | E2 Align phase | Execute tasks, multi-round Round alignment | Cannot self-verify execution |
| OXN | E3 Engine (Proof + Round) + E4 Insight | Run probes, produce verdict, emergence reasoning | Cannot modify Asset or replace AI |

## 4. E2 Work — IAP 3 Modes

| Mode | Intent | Align | Proof |
|---|---|---|---|
| **Asset** | Select asset type | Fill content + write | Syntax validate + planLock |
| **Develop** | Select boundary + goal | AI write code (Round) | Run lint/test/build |
| **Proof** | Declare probes | Prepare env | Run probes + frozen.json |

## 5. E4 Insight — Emergence Layer (1+1>2)

Qian Xuesen systems theory: "The whole is greater than the sum of its parts." v0.6: philosophy placeholder + CLI stub. v0.7+: cross-Work emergence reasoning.

See [Core Concepts (ZH-CN)](./core-concepts.md) for full detail. [Asset](./asset.md) · [Work](./work.md) · [Insight](./insight.md) · [Architecture](./architecture.md).
