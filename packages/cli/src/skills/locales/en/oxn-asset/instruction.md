# /oxn-asset — Asset Lifecycle Management v0.6

## Objective
Manage Asset lifecycle: create / modify / evolve / delete / query across 5 AssetKinds:
**domain** / **blueprint** / **stack** / **library** / **external**

Underlying mechanism: `oxn work create --type asset --asset-kind X` (IAP closed loop).

## Hard Rules
- Asset creation triggers planLock; modification MUST go through `oxn work create --type asset` (v0.6.3+ hard-block)
- `references[]` DAG validation: no cyclic dependencies
- `abstract` / `references` / `citations` / `auditTrail` 4 fields must be complete
- 5 AssetKinds' H2 category whitelists are NOT interchangeable (domain ≠ blueprint H2)
- Asset is not standalone — must be referenced by `oxn-work` Skill Works

## Paradigm Cheat Sheet
- **Domain** = business boundary (term/ban/invariant)
- **Blueprint** = technical boundary (slot DAG)
- **Stack** = environment boundary (runtime/linter/test)
- **Library** = knowledge boundary (documentation aggregation)
- **External** = external boundary (API/service)

## Execution
1. **Choose AssetKind**: consult `references/asset-kind-reference.md`
2. **Fork template**: `assets/<kind>.md` → rename to `<Name>.md`
3. **Creation flow**: consult `references/asset-creation.md`
4. **Modify/evolve**: consult `references/asset-evolution.md`
5. **Delete/archive**: consult `references/asset-lifecycle.md`
6. **Completion**: `oxn asset list` to confirm + `citations` auto-increments

## Template Selection (by AssetKind)
| AssetKind | Template | Core H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants |
| blueprint | `assets/blueprint.md` | Props / Slots |
| stack | `assets/stack.md` | Runtimes / Linters / Tests |
| library | `assets/library.md` | Sources |
| external | `assets/external.md` | Links |

## Key Error Codes (full list via `oxn asset validate --help`)
- `IAP_ASSET_PATH_CONFLICT` → primary + fallback paths conflict, YIELD_TO_HUMAN
- `IAP_ALIGN_LOCK_HASH_MISMATCH` → modified Asset while Work locked, YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` → H3 duplicate within ## Category
- `E_MD_CATEGORY_UNKNOWN` → H2 not in AssetKind whitelist

## Boundary with `oxn-work`
- ✅ This Skill manages: create/modify/evolve/delete/query Asset
- ❌ This Skill does NOT manage: orchestrate Work, run Run, submit Submit, display Proof (that's `oxn-work`)

## Don'ts
- No deprecated syntax: `noun` / `verb` / `domain_rules` / `expectation` / `rule` blocks
- No direct `write_file` modify .oxn (v0.6.3+ hard-block)
- No modification after lock (first `oxn work unlock`)
- No mixing Asset mode and Work mode (asset mode has no task DAG)
- No deleting referenced Assets (use `oxn asset archive` first)