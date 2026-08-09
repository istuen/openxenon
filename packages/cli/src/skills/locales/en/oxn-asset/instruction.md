# /oxn-asset — Asset Lifecycle Management v0.7+

## Goal
Manage the full Asset lifecycle: create / modify / evolve / delete / query. Covers 5 AssetKind (v0.6.1-alpha.4 three-boundary framework):
**domain** / **workflow** / **stack** / **blueprint** / **assetmap**

Underlying flow: `oxn work create --type asset --asset-kind X` (IAP closed loop).

> **🆕 v0.6.4 naming convergence**: User-facing CLI command and directory converged from `roadmap` to `assetmap` (`oxn assetmap`, `assets/assetmaps/`); **AssetKind enum value also changed from `'roadmap'` to `'assetmap'`** (v0.7 RFC-0013 D4 originally locked the code enum, but v0.6.4 design decision fully recycles the Roadmap term; break-change).

## Hard rules
- Asset creation triggers planLock; modification must go through `oxn work create --type asset` (v0.6.3+ hard-block)
- `references[]` DAG validation: no circular deps (same-kind isolation; cross-kind via Blueprint composition)
- `abstract` / `references` / `citations` / `auditTrail` 4 fields must be complete
- 5 AssetKind H2 category whitelists **must not mix**
- **External inline**: `url` OR `path` (mutually exclusive); `kind` ∈ 6-value enum
- External status changes **do NOT** participate in Asset content_hash

## 🆕 v0.6.4 PR-D references syntax (Q7 option B)

Pre-v0.6.4 had 3 reference syntaxes (bare name / `@md/{kind}/{name}` / file path), causing `isAssetReferenced()` false negatives → archive/delete gate failures. v0.6.4 unifies to **bare name + parent-kind metadata** inference:

- **Asset frontmatter `references:` field**: use **bare name** (canonical); forced same-AssetKind (e.g. `references: [oxn-engine-domain, oxn-work-domain]`, parser parent kind = domain)
- **`@md/{kind}/{name}`**: deprecated but still supported (legacy Blueprint frontmatter); new code should not write
- **Cross-kind references**: must use Blueprint `## Use` section (explicit `kind:` field, e.g. `- workflow: dev-workflow`)
- Resolution priority: (1) bare name → forced parent kind inference → `assets/{parentKind}s/{name}.md`
  (2) `@md/{kind}/{name}` → explicit kind + name (deprecated)
  (3) cross-kind → Blueprint `## Use` section (explicit kind)
- Parser: `packages/engine/src/Asset/internal/reference-checker.ts:extractReferences(parentKind, refStr)` + `resolveReference(parentKind, refStr, projectRoot)`

## Paradigm quick reference (three boundaries)
- **Domain** = business boundary (term/ban/invariant + optional ## Externals)
- **Workflow** = execution boundary (slot DAG + optional ## Externals)
- **Stack** = environment boundary (runtime/linter/test + optional ## Externals)
- **Blueprint** = composition template (`## Refs`; **NO ## Externals**)
- **Roadmap / AssetMap** = navigation graph (scene → Domain/Workflow/Stack/Blueprint)

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
| assetmap | `assets/assetmaps/assetmap.md` | Scenes |

> **External detail + kind enum + status + CLI**: see `references/asset-kind-reference.md` + `references/asset-creation.md`

## Key error codes
- `IAP_ASSET_PATH_CONFLICT` / `IAP_ALIGN_LOCK_HASH_MISMATCH` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → fix H3/H2 naming
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → fix External fields
- 🆕 `IAP_INTENT_CROSS_KIND_REF` (v0.6.4 PR-D preserved) → cross-kind references go to Blueprint `## Use`

## Forbidden
- Don't write deprecated syntax: `noun` / `verb` / `domain_rules` / `expectation` / `rule`
- Don't directly `write_file` to .oxn (v0.6.3+ hard-block)
- Don't modify .oxn after lock (run `oxn work unlock` first)
- Don't mix Asset mode and Work mode (Asset mode has no task DAG)
- Don't delete referenced Assets (run `oxn asset archive` first)
- Don't create library/external Asset types (removed in v0.6.1-alpha.4)
- Don't declare External in Blueprint (Blueprint is pure composition layer)
- 🆕 Don't write `@md/{kind}/{name}` in Asset `references:` field (v0.6.4 PR-D deprecated)
- 🆕 Don't write cross-kind references in Asset `references:` field (must use Blueprint `## Use`, Inv15/Inv30)

## AssetMap routing

```bash
oxn assetmap show oxn-system --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5
oxn assetmap sync oxn-system --scene <scene> --dry-run   # manual hint
```

> **Boundary with `oxn-work`**: This Skill manages Asset lifecycle; Work orchestration / Run / Submit / Proof is `oxn-work`. See `references/asset-vs-work.md`.