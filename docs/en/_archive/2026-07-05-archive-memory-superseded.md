---
title: Memory
---

# Memory (Project-internal aggregation layer)

> **Memory is OpenXenon's project-internal knowledge aggregation layer** — the bridge between external knowledge (project docs / engineer discussions / dependency updates / AI exploration) and internal knowledge (Asset / Work / Proof).
>
> v0.7.x unifies the v0.5/v0.6 five Pool types (research / design / issue / audit / journal) into a single Memory layer, quantified by `trust_score`, with TTL self-decay to prevent context explosion.

## 1. Position in the IAP closed loop

```
                    External Knowledge
                    (docs / issues / deps / discussions)
                          ↓ Engineer manual ingest / Insight auto collect
                   ┌─────────────────────┐
                   │   Memory (aggregate)│
                   │   .openxenon/memory/ │
                   └──────────┬──────────┘
                              ↓ Bidirectional (Insight double source)
                   ┌─────────────────────┐
                   │   Insight (E4)      │
                   └──────────┬──────────┘
                              ↓ Recommendation
                   ┌─────────────────────┐
                   │   Asset + Work      │
                   └──────────┬──────────┘
                              ↓ Accumulation (closed loop)
                   ┌─────────────────────┐
                   │   Memory (loop)     │
                   └─────────────────────┘
```

**Core thesis**: Memory is the dissipative-structure layer through which OXN transitions from a "closed tool" to an "open collaboration system" (continuously absorbing negative entropy flows).

## 2. MemoryEntry Schema

Each Memory entry is a `MemoryEntry`:

| Field | Type | Meaning |
|---|---|---|
| `id` | `mem-YYYY-MM-DD-NNN` | Globally unique ID |
| `source` | `external` \| `engineer` \| `agent` | Information source |
| `type` | 9 types (see below) | Information type |
| `title` | string | Title |
| `content` | markdown | Content |
| `trustScore` | 0-1 | Trust score |
| `ttl` | seconds (nullable) | Time-to-live |
| `relatedAssetIds` | string[] | Linked Asset IDs |
| `relatedRoadmapItem` | string | Linked Roadmap item |
| `timestamp` | ms epoch | Creation time |
| `approval` | ApprovalRecord | Approval record (filled after apply) |
| `supersededBy` | string | Which entry superseded this |
| `tags` | string[] | Tags |

### 2.1 source field (Q4=B · no approval)

| source | Write path | Default trust_score |
|---|---|---|
| `engineer` | Engineer manual `oxn memory ingest` | 1.0 |
| `engineer` + reference | Engineer-confirmed Insight recommendation | 0.7-0.9 |
| `agent` | Insight auto-output (`--write-memory`) | 0.5-0.7 |
| `external` | External scrape (webhook / paste) | 0.3-0.5 |

**Key invariant**: Q4=B chooses **no approval gate**, but trust is quantified via `trust_score`. AI context injection filters by trust_score threshold.

### 2.2 type field (9 types)

Inherited from v0.5 Pool 5 types + 4 new:

| type | Use | Source | Typical trust |
|---|---|---|---|
| `research` | Research notes | engineer | 1.0 |
| `design` | Design documents | engineer | 1.0 |
| `issue` | Issue analysis | engineer | 1.0 |
| `audit` | Improvement suggestion (Insight apply primary) | agent | 0.7 |
| `journal` | Timeline | engineer | 1.0 |
| `dependency_update` | Dependency version update | external | 0.5 |
| `doc_note` | Project doc note | engineer | 1.0 |
| `discussion` | Engineer discussion record | engineer | 1.0 |
| `test_result` | Test result | agent | 0.7 |

## 3. Physical layout

```
.openxenon/memory/                              ← Sibling (Q1)
├── index.json                                  # Full index
├── entries/
│   ├── mem-2026-11-15-001.md                   # Single entry (markdown body)
│   ├── mem-2026-11-15-002.md
│   └── ...
└── archive/                                    # TTL-expired archive
    ├── mem-2026-08-01-001.md
    └── ...
```

Each entry is an independent markdown file: frontmatter contains metadata, body is markdown content.

## 4. trust_score self-decay formula (ADR-0045)

```
t_current = max(0, T0 - (now - timestamp) / ttl * (T0 - 0.3))
```

| Initial trust | TTL (d) | elapsed (d) | Current trust |
|---|---|---|---|
| 1.0 | 30 | 15 | 0.65 |
| 0.7 | 30 | 30 | 0.30 (boundary) |
| 0.5 | 30 | 10 | 0.43 |
| 1.0 | null | ∞ | 1.0 (no decay) |

**Archive threshold**: `decay < 0.3` OR TTL expired OR `supersededBy !== null`

## 5. Memory ↔ Insight double source (ADR-0042)

Insight pipeline-compute accepts `memory: MemoryEntry[]` input, adds new `memory_projection` dimension:

```typescript
export const MemoryProjectionEntrySchema = z.object({
  memoryId: z.string(),
  recommendedAsset: z.object({
    kind: z.enum(['domain', 'blueprint', 'stack']),
    name: z.string(),
    rationale: z.string(),
  }),
  priority: z.enum(['high', 'medium', 'low']),
  sourceTrust: z.number(),
})
```

`oxn insight --pipeline --write-memory` automatically writes MemoryProjection to Memory.

## 6. Memory Apply Protocol (ADR-0044 · replaces Pool Approve)

`oxn memory apply <id>` replaces v0.5 `oxn pool approve <slug>`:

```
1. Read memory/entries/<id>.md
2. Validate status='approved' (trustScore ≥ 0.5)
3. Read Asset current content + compute beforeHash
4. Compute newContent = applyPatch(original, meta.content)
5. ⚠ Atomic rename (v0.5 missing, v0.7.x added):
   a. copyFileSync(target, target.bak)    // .bak backup
   b. writeFileSync(target.draft.tmp, newContent)
   c. renameSync(target.draft.tmp, target) // atomic
   d. chmodSync(target, 0o444)             // restore 3-layer lock
6. spawn `oxn <kind> validate <name>` to recompute planLock
7. Write approvalRecord to memory entry frontmatter
8. Write events.jsonl audit
```

**Key differences from v0.5**:

| Dimension | v0.5 intent-overwriter | v0.7.x memory-overwriter |
|---|---|---|
| Write | `writeFileSync` direct overwrite | `renameSync` atomic + `.bak` |
| chmod | Maintain writable (**0o644 leaked**) | **0o444 restored** |
| PlanLock recompute | ❌ Missing | ✅ spawn `oxn validate` |
| Error handling | No try/finally | Full try/finally + rollback |

## 7. Onboarding Wizard (ADR-0043 · dual entry)

**Entry A**: `oxn init --ai opencode --memory-onboarding` (triggered during init flow)

**Entry B**: `oxn memory onboard` (standalone command, for already-init projects)

5-step interaction:

```
Step 1: Project Type        [web/mobile/cli/library/monorepo/other]
Step 2: Tech Stack         [language/runtime/framework]
Step 3: Business Domain     [e-commerce/auth/payment/content/...]
Step 4: Auto-Discovery     [scan README/package.json → infer]
Step 5: Memory Write       [write 5 MemoryEntries + recommend Assets]
```

## 8. CLI complete list

### 8.1 Write

```bash
oxn memory ingest                                  # Engineer manual
oxn memory ingest --from-insight                   # From Insight recommendation
oxn memory ingest --type dependency_update \
    --content "bun 1.2.0 released" \
    --related-asset @prj/blueprints/dev-workflow \
    --trust-score 0.7 --ttl 30d
oxn memory onboard                                 # 5-step wizard
oxn memory migrate-from-pools                      # v0.5/v0.6 → v0.7.x migration
```

### 8.2 Query

```bash
oxn memory list                                    # List all
oxn memory list --type audit --since 7d
oxn memory list --source external --min-trust 0.5
oxn memory show <id>
oxn memory query --related-asset MemberContext
oxn memory query --tag onboarding
oxn memory query --fulltext "password"
oxn memory aggregate --by-type --by-source
oxn memory aggregate --cross-pool --since 7d
```

### 8.3 Maintenance

```bash
oxn memory apply <id>                              # Write Asset (replaces approve)
oxn memory reject <id> --reason <text>
oxn memory gc                                      # TTL archive
oxn memory gc --dry-run
oxn memory gc --min-trust 0.5
```

### 8.4 Insight integration

```bash
oxn insight --pipeline --write-memory              # Auto-write Memory
oxn insight --cross-proof --write-memory
```

## 9. Closed-loop validation (ADR-0047)

### Scenario A: New project bootstrap

```
T1: oxn init --ai opencode --memory-onboarding
    → Start 5-step wizard → write 5 MemoryEntries (trust=1.0)
    → Insight aggregate → recommend Asset list

T2: oxn work create MemberContext --type asset --asset-kind domain
    → AI extracts from Memory → write .openxenon/assets/domains/MemberContext.oxn

T3-T4: ...

T5: oxn insight --pipeline --write-memory
    → Write audit memory: add-invariant (trust=0.6)
    → Memory auto-accumulate pattern

T7: oxn memory apply mem-XXX-003
    → atomic rename + .bak rollback + chmod 0o444 restore + planLock recompute

T8: Loop back to T4
```

### Scenario B: Existing project

```
T1: oxn init --ai opencode
    → Detect .openxenon/domains/ exists → skip wizard
    → Auto-scan + write Memory (trust=0.8)

T2: oxn memory migrate-from-pools --apply
    → Migrate v0.5/v0.6 audit pool entries

T3-T5: Engineer adds external knowledge → Insight consumes → Memory apply
```

## 10. Error codes

```typescript
ExecErrorCode = {
  // ... v0.7.2 existing
  OXN_MEMORY_ENTRY_NOT_FOUND: 'OXN_MEMORY_ENTRY_NOT_FOUND',
  OXN_MEMORY_TRUST_SCORE_LOW: 'OXN_MEMORY_TRUST_SCORE_LOW',
  OXN_MEMORY_TTL_EXPIRED: 'OXN_MEMORY_TTL_EXPIRED',
  OXN_MEMORY_APPLY_FAILED: 'OXN_MEMORY_APPLY_FAILED',
  OXN_MEMORY_DUPLICATE_ID: 'OXN_MEMORY_DUPLICATE_ID',
  OXN_MEMORY_MIGRATION_FAILED: 'OXN_MEMORY_MIGRATION_FAILED',
}
```

## 11. Anti-patterns

- ❌ `trustScore: 1.0` for everything (never decay = context bomb)
- ❌ Skip `--dry-run` and run `oxn memory migrate-from-pools --apply` directly
- ❌ Delete `.bak` files after `oxn memory apply` (lose rollback capability)
- ❌ Skip Onboarding Step 4 Auto-Discovery (miss real project info)
- ❌ Repeatedly `oxn memory onboard --force` (destroy Memory history)
- ❌ Write Asset content into Memory (Memory is knowledge, not Asset)

## 12. Pool migration compatibility window

| Phase | Behavior |
|---|---|
| v0.7.x early | Dual-write (Pool + Memory both exist), Memory is SSOT |
| v0.7.x mid | Pool → shim (deprecation warning) |
| v0.8.x | Pool commands retained (warning escalated) |
| v0.9.x | Pool commands removed (Memory only) |
| v0.10+ | `pools/` directory physically removed (keep `insight-patterns/` and `sprints/`) |

## 13. Philosophical anchors

| Theory | Embodiment |
|---|---|
| **Dissipative Structure** | Memory is the open system's "negative entropy flow" entry (absorbs external info) |
| **Cybernetics** | trust_score + TTL automatic feedback regulation |
| **Systems Theory** | Memory ↔ Insight bidirectional coupling forms homeostasis |
| **Information Theory** | trust_score threshold filters channel noise |

## 14. Key code path index (v0.7.x)

| File | Role |
|---|---|
| `packages/engine/src/kernel/schemas/memory-entry-schema.ts` | MemoryEntry Zod schema |
| `packages/engine/src/Memory/io.ts` | readMemory / writeMemory |
| `packages/engine/src/Memory/index-json.ts` | index.json maintenance |
| `packages/engine/src/Memory/ttl.ts` | trust_score decay + archive judgment |
| `packages/engine/src/Memory/memory-overwriter.ts` | atomic rename + .bak rollback |
| `packages/engine/src/Memory/migration.ts` | Pool → Memory migration |
| `packages/engine/src/Memory/onboarding-wizard.ts` | 5-step wizard |
| `packages/engine/src/kernel/verdicts/pipeline-compute.ts` | Insight double source (with memory) |
| `packages/cli/src/commands/memory/*` | 10+ CLI subcommands |
| `packages/engine/src/Memory/__tests__/closed-loop.test.ts` | End-to-end closed-loop validation |

---

## → Reference

- [v0.7.x Memory RFC (rebound archive)](../../.openxenon/pools/sprints/v0.7-emergence/design/2026-07-05-archive-v0.7.x-memory-rfc-superseded.md) 📝 Archive
- [Replacement: v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [Replacement: docs/zh-cn/asset-paper.md](../asset-paper.md) new SSOT (Asset paper structure)
- [ADR-0040 ~ 0047 series](../../.openxenon/forges/sprints/archive/docs-tmp-era/decisions/)
- [v0.6 RFC §v0.7 preview · Memory](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [harness-3.md §Memory](../../.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-harness-3.md)