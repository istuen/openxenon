---
title: Work
---

# Work (E2 · Dynamic Collaboration Space)

> **Work is OXN's second structural entity (E2) — engineer ⇄ AI dynamic collaboration space**. Work follows IAP three-phase flow (Intent → Align → Proof), with multi-round Round loops until completion. v0.6 elevates Insight from Work Mode D to independent E4 emergence layer.

## IAP Three Phases

```
Work (one complete IAP cycle)
├── Intent phase (Engineer): create work + select Asset boundaries
├── Align phase (AI): multi-round alignment (Round × N → M Tasks per round)
├── Proof phase (Engine): run probes → verdict
└── (optional) Round loop: verdict fail → back to Intent → new Round
```

## 3 Work Modes

| Mode | Intent | Align | Proof |
|---|---|---|---|
| **Asset** | Select asset type | Fill + write | Syntax validate + planLock |
| **Develop** | Select boundary + goal | AI code (Round) | Run lint/test/build |
| **Proof** | Declare probes | Prepare env | Run probes + frozen.json |

## Round Multi-Round IAP Loop (v0.6 New)

```bash
oxn work run my-feature      # Round 1
oxn work next-round my-feature  # verdict fail → Round 2
oxn work finalize my-feature    # all rounds pass
```

Round is OXN's key differentiator from OpenSpec's single-pass `propose → apply → archive`.

See [Work (ZH-CN)](./work.md) for full detail. [Core Concepts](./core-concepts.md) · [Insight](./insight.md).
