# /oxn-asset — Asset Lifecycle Management v0.6.1

## Goal
Manage the full Asset lifecycle: create / modify / evolve / delete / query. Covers 5 AssetKind (v0.6.1-alpha.4 three-boundary framework):
**domain** / **workflow** / **stack** / **blueprint** / **roadmap**

Underlying flow: `oxn work create --type asset --asset-kind X` (IAP closed loop).

> **v0.6.1-alpha.4 changes**: AssetKind 6→5; original blueprint renamed **workflow**; new **Blueprint** = composition template; External converged to boundary `## Externals`; External status independent index.

## Hard rules
- Asset creation triggers planLock; modification must go through `oxn work create --type asset` (v0.6.3+ hard-block)
- `references[]` DAG validation: no circular deps (same-kind isolation; cross-kind via Blueprint composition)
- `abstract` / `references` / `citations` / `auditTrail` 4 fields must be complete
- 5 AssetKind H2 category whitelists **must not mix**
- **External inline**: `url` OR `path` (mutually exclusive); `kind` ∈ 6-value enum
- External status changes **do NOT** participate in Asset content_hash

## Paradigm quick reference (three boundaries)
- **Domain** = business boundary (term/ban/invariant + optional ## Externals)
- **Workflow** = execution boundary (slot DAG + optional ## Externals)
- **Stack** = environment boundary (runtime/linter/test + optional ## Externals)
- **Blueprint** = composition template (`## Refs`; **NO ## Externals**)
- **Roadmap** = navigation graph (scene → Domain/Workflow/Stack/Blueprint)

## Execution
1. **Choose AssetKind**: see `references/asset-kind-reference.md`
2. **fork template**: `assets/<kind>.md` → rename `<Name>.md`
3. **Creation flow**: see `references/asset-creation.md`
4. **Modify/evolve**: see `references/asset-evolution.md`
5. **Delete/archive**: see `references/asset-lifecycle.md`
6. **Done**: `oxn asset list` confirms

## Template selection (v0.6.1-alpha.4)
| AssetKind | Template | Core H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants / **Externals** |
| workflow | `assets/workflow.md` | Props / Slots / **Externals** |
| stack | `assets/stack.md` | Runtimes / Linters / Tests / **Externals** |
| blueprint | `assets/blueprint.md` | **Refs** |
| roadmap | `assets/roadmap.md` | Scenes |

> **External detail + kind enum + status + CLI**: see `references/asset-kind-reference.md` + `references/asset-creation.md`

## Key error codes
- `IAP_ASSET_PATH_CONFLICT` / `IAP_ALIGN_LOCK_HASH_MISMATCH` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → fix H3/H2 naming
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → fix External fields

## Forbidden
- Don't write deprecated syntax: `noun` / `verb` / `domain_rules` / `expectation` / `rule`
- Don't directly `write_file` to .oxn (v0.6.3+ hard-block)
- Don't modify .oxn after lock (run `oxn work unlock` first)
- Don't mix Asset mode and Work mode (Asset mode has no task DAG)
- Don't delete referenced Assets (run `oxn asset archive` first)
- Don't create library/external Asset types (removed in v0.6.1-alpha.4)
- Don't declare External in Blueprint (Blueprint is pure composition layer)

## Roadmap routing

```bash
oxn roadmap show oxn-system --scene <scene>
oxn roadmap suggest --goal "<goal>" --scene <scene> --top 5
oxn roadmap sync oxn-system --scene <scene> --dry-run   # manual hint
```

> **Boundary with `oxn-work`**: This Skill manages Asset lifecycle; Work orchestration / Run / Submit / Proof is `oxn-work`. See `references/asset-vs-work.md`.