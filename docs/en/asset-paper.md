---
title: Asset Paper Schema
---

# Asset Paper Schema (Asset-as-Paper · v0.6.3+)

> **Asset is a "micro paper"** — fixed structure, self-consistent logic, citable, verifiable. Upgrading from "rule pile" to "logical dependency network" is the key step from OpenXenon "tool" to "knowledge engineering system".
>
> **Core motivation**: Asset value is quantified by "citation count" (paper structure); citation chain = dependency network (DAG); foundation vs application = refactor vs business change.

## 1. Academic Paper ↔ Asset Mapping

| Academic concept | OpenXenon Asset mapping | Engineering meaning |
|---|---|---|
| **Paper title/ID** | `Asset ID` | Unique identifier, global addressing |
| **Abstract** | `abstract` | Why engineer set this boundary? Background? |
| **Body/theorem** | `Invariant / Rules / Spec` | Core rules, constraints, definitions |
| **References** | `references[]` | **Reference other Assets** (e.g., "based on `stack-nodejs` spec...") |
| **Citation count** | `citations` | **Importance/impact radius** (auto-computed) |
| **Revision history** | `auditTrail[]` | Version evolution (who, when, what) |

## 2. Asset Paper Complete Template

```markdown
<!-- assets/domain/payment-core.md -->
---
type: domain
id: payment-core
version: 1.2.0
status: stable

# 🆕 Paper structure (v0.6.3 introduction)
abstract: |
  This document defines the boundary of the payment core domain.
  Aims to ensure all payment operations are idempotent, traceable,
  and compliant with PCI-DSS basic requirements.
references:                          # Reference other Assets (DAG outbound edges)
  - asset: stack-nodejs
  - asset: api-rest-standard
citations: 3                         # Auto-maintained: referenced by 3 Assets
auditTrail:                          # Version history
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: Added §3.4 idempotency constraint
---

# 1. Axioms (Definitions)
- **Term `Payment`**: Any operation involving fund flow or state change
- **Term `IdempotencyKey`**: Unique request identifier for deduplication

# 2. Theorems (Invariants)
1. Must: Accept IdempotencyKey as input
2. Ban: Prohibit direct access to user password hash
3. Ensure: Write TraceID to unified log

# 3. References (Dependencies)
See [stack-nodejs](../stack/nodejs.md) §3
Constrained by [api-rest-standard](../blueprint/api-rest.md) error codes
```

## 3. Schema Field Details (v0.6.3 extension)

### 3.1 abstract (Paper Abstract)

```yaml
abstract: |
  This document defines the boundary of the payment core domain.
  Aims to ensure all payment operations are idempotent, traceable.
```

**Required** (empty string for v0.6.x legacy Assets). **Use**: When AI context is injected as "title-level summary" to save tokens.

### 3.2 references[] (Reference other Assets)

```yaml
references:
  - asset: stack-nodejs
  - asset: api-rest-standard
```

**Element type**: Asset ID string. **Validation**:
- Each ID must exist (else `OXN_ASSET_ORPHAN_REFERENCE`)
- Cannot form cycle (A → B → A → `OXN_ASSET_CIRCULAR_DEPENDENCY`)

**Functions**:
- Stable Prefix injection order (topological sort)
- DAG computation (dependency network)
- Impact radius analysis

### 3.3 citations (Cited Count)

```yaml
citations: 3
```

**Auto-maintained**. **Algorithm**:
```typescript
function computeCitations(assets: Asset[]): void {
  const refCount = new Map<string, number>()
  for (const a of assets) {
    for (const ref of a.references ?? []) {
      refCount.set(ref, (refCount.get(ref) ?? 0) + 1)
    }
  }
  for (const a of assets) {
    a.citations = refCount.get(a.id) ?? 0
  }
}
```

**Triggers**:
- `oxn asset validate` (static scan)
- Asset add/modify/delete (incremental)
- `oxn asset validate --rebuild-citations` (force)

### 3.4 auditTrail[] (Version History)

```yaml
auditTrail:
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: Added §3.4 idempotency constraint
  - version: 1.1.0
    date: 2026-08-01
    author: engineer-Y
    changes: Split §2 validation rules
```

**Structure**: Each entry has version / date / author / changes quartet. **Relation with git log**: Not duplicated (git log is file-level, auditTrail is semantic-level).

## 4. Citation Count Algorithm Details

### 4.1 Static Scan (v0.6.3 initial)

```bash
$ oxn asset validate
# 1. Scan .openxenon/assets/**.md
# 2. Parse each Asset's references[]
# 3. Build reverse reference map
# 4. Write each target Asset's citations
# 5. Detect circular dependencies (DAG validation)
```

### 4.2 Incremental Computation (v0.7.0 optimization)

```typescript
class CitationCache {
  private cache = new Map<string, number>()
  
  // Triggered on Asset add/modify/delete
  invalidate(assetId: string): void {
    // 1. Find all Assets referencing this assetId
    // 2. Only recompute these Assets' citations
    // 3. Other Assets hit cache
  }
}
```

### 4.3 Dynamic Listening (v0.7.1 plan)

```typescript
// Listen to filesystem, auto-trigger recompute
chokidar.watch('.openxenon/assets/')
  .on('change', path => invalidateCitationsFor(path))
```

## 5. DAG Validation & Circular Dependency Detection

### 5.1 Algorithm

```typescript
function validateDag(assets: Asset[]): DagResult {
  const visited = new Set<string>()
  const stack = new Set<string>()
  const cycles: string[][] = []
  
  function dfs(asset: Asset, path: string[]): void {
    if (stack.has(asset.id)) {
      cycles.push([...path, asset.id])
      return
    }
    if (visited.has(asset.id)) return
    visited.add(asset.id)
    stack.add(asset.id)
    
    for (const ref of asset.references ?? []) {
      const target = assets.find(a => a.id === ref)
      if (!target) {
        throw new IAPError('INFRA', 'INFRA_FAIL', YIELD_TO_HUMAN,
          `Asset ${asset.id} references non-existent ${ref}`,
          { assetId: asset.id, missingRef: ref })
      }
      dfs(target, [...path, asset.id])
    }
    
    stack.delete(asset.id)
  }
  
  for (const a of assets) {
    if (!visited.has(a.id)) dfs(a, [])
  }
  
  return { valid: cycles.length === 0, cycles }
}
```

### 5.2 Error codes

| Error code | Trigger | Handling |
|---|---|---|
| `OXN_ASSET_ORPHAN_REFERENCE` | references[] points to non-existent Asset | Report which reference is orphan |
| `OXN_ASSET_CIRCULAR_DEPENDENCY` | Reference chain forms cycle | Report full cycle path |

## 6. Impact Radius Analysis (Foundation vs Application)

### 6.1 Citation Count → Impact Radius Mapping

```typescript
function impactRadius(asset: Asset): 'low' | 'medium' | 'high' | 'critical' {
  const citations = asset.citations ?? 0
  if (citations >= 10) return 'critical'  // Refactor level
  if (citations >= 5) return 'high'      // Major change
  if (citations >= 1) return 'medium'    // Business level
  return 'low'                            // Local
}
```

### 6.2 Real Cases

| Asset | citations | Impact radius | Change strategy |
|---|---|---|---|
| `stack-nodejs` | 50 | critical | Trigger planLock recompute + full test |
| `api-rest-standard` | 30 | critical | Trigger planLock recompute + full test |
| `domain-payment-core` | 15 | high | Trigger related module test |
| `domain-promotion-coupon` | 2 | medium | Only related business test |
| `blueprint-coupon-flow` | 1 | medium | Only 1 downstream validation |
| `domain-experimental-x` | 0 | low | No validation (island Asset) |

### 6.3 Foundation vs Application Engineering Meaning

**Foundation layer Asset** (high citations):
- Large change impact
- Mandatory planLock validation
- Suitable as Stable Prefix priority injection

**Application layer Asset** (low citations):
- Limited change impact
- Can evolve independently
- Suitable for delayed injection (on-demand)

## 7. library/ + external/ Subdirectories

### 7.1 Physical Layout

```
.openxenon/assets/
├── domain/                          # Original
├── blueprint/                       # Original
├── stack/                           # Original
├── library/                         # 🆕 External info aggregation (Work output)
│   ├── axios-docs.md              # Axios official docs aggregation
│   └── terraform-aws.md
└── external/                        # 🆕 External reference pointers (no content)
    ├── npm-deps.md                # URL + hash + ttl
    └── github-issues.md
```

### 7.2 `library/` vs `external/` Key Difference

| Dimension | library/ | external/ |
|---|---|---|
| Content storage | AI-parsed then write to .md | Reference pointers only |
| Use case | Frequently reused external knowledge | Temporary references |
| Invalid detection | Engine validation | TTL expiry triggers fetch |
| Size limit | < 50KB | No limit (pointer) |

## 8. Complete CLI List

```bash
# Validation (with DAG validation + citations recompute)
$ oxn asset validate
$ oxn asset validate --check-dag        # DAG validation only
$ oxn asset validate --rebuild-citations  # Force recompute

# List (with citations sorting)
$ oxn asset list
$ oxn asset list --sort citations        # Default: citations desc
$ oxn asset list --impact critical       # Only critical
$ oxn asset list --type domain

# Detail
$ oxn asset show payment-core

# Citation Graph (v0.7.0 new)
$ oxn asset graph payment-core
$ oxn asset graph payment-core --format dot
$ oxn asset graph payment-core --format mermaid
$ oxn asset graph payment-core --depth 3   # Indirect dependency depth

# Impact Radius
$ oxn asset impact payment-core
# impact: high
# citations: 3
# referencedBy: [order-checkout, refund-flow, payment-gateway]

# library Validation
$ oxn library validate axios-docs        # size < 50KB check
```

## 9. Error Code Extensions

```typescript
ExecErrorCode = {
  // ... v0.6.2 existing
  OXN_ASSET_ORPHAN_REFERENCE: 'OXN_ASSET_ORPHAN_REFERENCE',
  OXN_ASSET_CIRCULAR_DEPENDENCY: 'OXN_ASSET_CIRCULAR_DEPENDENCY',
  OXN_ASSET_CITATION_MISMATCH: 'OXN_ASSET_CITATION_MISMATCH',
  OXN_ASSET_LIBRARY_SCHEMA_INVALID: 'OXN_ASSET_LIBRARY_SCHEMA_INVALID',
  OXN_ASSET_EXTERNAL_FETCH_FAILED: 'OXN_ASSET_EXTERNAL_FETCH_FAILED',
  OXN_ASSET_GRAPH_CYCLE: 'OXN_ASSET_GRAPH_CYCLE',
  OXN_ASSET_GRAPH_TOO_LARGE: 'OXN_ASSET_GRAPH_TOO_LARGE',
}
```

## 10. Anti-patterns

- ❌ Asset without `abstract` (lacks paper abstract, AI injection must read full)
- ❌ `references[]` points to non-existent Asset (orphan reference)
- ❌ Circular reference A → B → A (too high coupling)
- ❌ `citations` doesn't match actual reference count (data desync)
- ❌ Manually edit `citations` field (must be auto-maintained by Engine)
- ❌ library/ contains full PDF (breaks Stable Prefix)
- ❌ Skip Work and write library/ directly (loses IAP closed loop)

## 11. Philosophical Anchors

| Theory | Embodiment |
|---|---|
| **Systems Theory** | Asset is system node, references are edges, DAG is system structure |
| **Information Theory** | citations quantify node influence (information entropy view) |
| **Cybernetics** | Impact radius guides change control (feedback loop) |
| **Synergetics** | Foundation vs application Asset synergy levels (emergence base) |

## 12. Key Code Path Index

| File | Role |
|---|---|
| `packages/engine/src/Asset/schemas/asset-paper-schema.ts` | Asset Paper schema (4 new fields) |
| `packages/engine/src/Asset/citation-cache.ts` | Incremental citations cache |
| `packages/engine/src/Asset/graph-builder.ts` | buildAssetGraph → DOT/Mermaid |
| `packages/engine/src/Asset/dag-validator.ts` | Circular dependency detection |
| `packages/engine/src/Asset/impact-radius.ts` | Impact radius calculation |
| `packages/cli/src/commands/asset-graph.ts` | `oxn asset graph` CLI |
| `packages/engine/src/Asset/__tests__/paper-schema.test.ts` | 4 field schema parsing |
| `packages/engine/src/Asset/__tests__/dag-validator.test.ts` | Cycle detection |
| `packages/engine/src/Asset/__tests__/citation-cache.test.ts` | Incremental computation |
| `packages/engine/src/Asset/__tests__/impact-radius.test.ts` | Radius mapping |

---

## → Reference

- [Core Concepts](./core-concepts.md) §11 Asset paper structure
- [Asset · E1 Hard boundary](./asset.md) §14 Asset paper structure
- [Work · E2 IAP core](./work.md) §12 Work context.md design
- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [ADR-0048 ~ 0051 series](../../.openxenon/forges/splits/archive/docs-tmp-era/decisions/)
- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) ✅ Approved