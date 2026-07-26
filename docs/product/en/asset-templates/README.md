# Asset Templates (v0.6.1-alpha.1+)

<!-- boundary:ignore -->

> **This directory contains 4 Asset Paper Schema templates**, released with [v0.6.1-alpha.1](../../.openxenon/pools/sprints/v0.6.1-alpha.1/) branch.
> **v0.6.1-alpha.1 goal**: Upgrade Asset from "rule pile" to "paper-style structure + citation mechanism".

## 4 Templates

| Template | Path | Purpose | AssetKind |
|---|---|---|---|
| **Domain** | [`domain.md`](./domain.md) | Business bounded context (term / ban / invariant) | `domain` |
| **Workflow** | [`workflow.md`](./workflow.md) | Technical workflow (slot DAG) | `workflow` (**renamed in v0.6.1-alpha.1**, was `blueprint`) |
| **Stack** | [`stack.md`](./stack.md) | Tech stack constraints (runtime / linter / test) | `stack` |
| **Roadmap** | [`roadmap.md`](./roadmap.md) | Asset navigation map (core / on-demand / recent changes) | `roadmap` (**new in v0.6.1-alpha.1**) |

## 4-field Asset Paper Schema

Each template contains 4 **Asset Paper fields** (introduced in v0.6.1-alpha.1):

| Field | Purpose | Roadmap special |
|---|---|---|
| `abstract` | Paper abstract (human-readable) | ✅ Required |
| `references[]` | Dependent Asset ID list (DAG validation) | ❌ **Empty** (no DAG) |
| `citations` | Citation count (Engine auto-maintained) | ✅ Still maintained |
| `auditTrail[]` | Version history (paper revision log) | ✅ Required |

**Roadmap special design** (per user's latest instruction):
- ❌ `references[]` **empty** (avoid cyclic DAG validation)
- 📌 body contains Asset paths/links (manually maintained or future parser)
- 📌 Only Roadmap type uses this rule (Domain/Workflow/Stack still go through full references[])

## Usage

### 1. Copy template
```bash
cp docs/en/asset-templates/domain.md .openxenon/assets/domain/MyDomain.md
```

### 2. Replace placeholders
```markdown
# Replace:
- id: <name>          → id: MyDomain
- version: 0.1.0      → version: 1.0.0
- author: <engineer>  → author: issac
- date: <YYYY-MM-DD>  → date: 2026-07-08

# Fill abstract
abstract: |
  Replace with your project description
```

### 3. Validate + lock
```bash
oxn domain validate MyDomain
oxn work lock my-work
```

## Future Work Plan

| Phase | Task | Version |
|---|---|---|
| ✅ Batch 1 | 4 templates (skeleton + 1 example) | v0.6.1-alpha.1 |
| 🔜 Batch 2 | AssetKind extension + OXL grammar + Asset Paper 4-field schema | v0.6.1-alpha.1 |
| 🔜 Batch 3 | Workflow rename migration script (blueprint → workflow) | v0.6.1-alpha.1 |
| 🔜 Batch 4 | Citation count algorithm + DAG validation | v0.6.1-alpha.1 |
| 🔜 Batch 5 | CLI extensions (`oxn asset graph` etc.) | v0.6.1-alpha.1 |
| 🔜 Batch 6 | Tests + docs | v0.6.1-alpha.1 |

## 参考

<!-- boundary:ignore -->
- [Asset Paper Schema · Paper structure](../asset-paper.md) — Complete paper structure
- [v0.6.3 Asset Paper Schema RFC](../../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [ADR-0048 library/external subdirectory scheme](../../../.openxenon/forges/splits/archive/docs-tmp-era/decisions/0048-asset-library-external-scheme.md)
- [ADR-0051 Asset-as-Paper paper structure + citation + DAG](../../../.openxenon/forges/splits/archive/docs-tmp-era/decisions/0051-asset-paper-citation-network.md)