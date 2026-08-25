# /oxn-asset — Asset Lifecycle Management v0.7+

## Goal
Manage Asset lifecycle: create/modify/evolve/delete/query. 5 AssetKinds: **domain** / **workflow** / **stack** / **blueprint** / **assetmap**.

Underlying flow: `oxn work create --type asset --asset-kind X` (IAP closed loop).

> **🆕 v0.6.4 naming convergence**: `roadmap` → `assetmap` (`oxn assetmap`, `assets/assetmaps/`; AssetKind enum value → `'assetmap'`; v0.7 RFC-0013 D4 originally locked the code enum, but v0.6.4 design decision fully recycles the Roadmap term).

## Hard rules
- 🗑️ **RFC-0033 D2**: Asset planLock retired; freely modifiable, referencing Works don't need re-lock
- Modification must go through `oxn work create --type asset` (v0.6.3+ hard-block)
- `references[]` DAG validation: no circular deps (same-kind isolation)
- `abstract` / `references` / `citations` / `auditTrail` 4 fields must be complete
- 5 AssetKind H2 category whitelists **must not mix**
- **External inline**: `url` OR `path` (mutually exclusive)
- External status changes **do NOT** participate in Asset content_hash

## references syntax (v0.6.4 PR-D)

v0.6.4 unifies to **bare name + parent-kind metadata** inference:

- **Asset frontmatter `references:`**: use **bare name** (canonical); forced same-AssetKind (e.g. `references: [oxn-engine-domain, oxn-work-domain]`)
- **`@md/{kind}/{name}`**: deprecated but still supported; new code should not write
- **Cross-kind references**: must use Blueprint `## Use` section (e.g. `- workflow: dev-workflow`)
- Parser: `packages/engine/src/Asset/internal/reference-checker.ts:extractReferences + resolveReference`
- See `references/asset-creation.md` for details

## Paradigm quick reference
- **Domain** = business boundary (term/ban/invariant)
- **Workflow** = execution boundary (slot DAG)
- **Stack** = environment boundary (runtime/linter/test)
- **Blueprint** = composition template (`## Refs`)
- **AssetMap** = navigation graph (scene → Domain/Workflow/Stack/Blueprint)

## Execution
1. **Choose AssetKind**: see `references/asset-kind-reference.md`
2. **fork template**: `assets/<kind>.md` → rename `<Name>.md`
3. **Creation flow**: see `references/asset-creation.md`
4. **Modify/evolve**: see `references/asset-evolution.md`
5. **Delete/archive**: see `references/asset-lifecycle.md`
6. **Done**: `oxn asset list` confirms

## Template selection
| AssetKind | Template | Core H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants / Externals |
| workflow | `assets/workflow.md` | Props / Slots / Externals |
| stack | `assets/stack.md` | Runtimes / Linters / Tests / Externals |
| blueprint | `assets/blueprint.md` | **Refs** |
| assetmap | `assets/assetmaps/assetmap.md` | Scenes |

> See `references/asset-kind-reference.md` + `references/asset-creation.md`

## Key error codes
- `IAP_ASSET_PATH_CONFLICT` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → fix H3/H2 naming
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → fix External fields

## Forbidden
- Don't write deprecated syntax: `noun` / `verb` / `domain_rules` / `expectation` / `rule`
- Don't directly `write_file` to .md (v0.6.3+ hard-block)
- 🗑️ Don't modify .md after lock (RFC-0033 D2: planLock retired; modify Asset → run --validate-only triggers referencing Work DRIFT detection)
- Don't mix Asset mode and Work mode
- Don't delete referenced Assets (run `oxn asset archive` first)
- Don't create library/external Asset types (removed in v0.6.1-alpha.4)
- Don't declare External in Blueprint
- 🆕 Don't write `@md/{kind}/{name}` references (v0.6.4 PR-D deprecated); don't write cross-kind references (must use Blueprint `## Use`)

## AssetMap routing

```bash
oxn assetmap show oxn-system --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5
```

> Boundary with `oxn-work`: Asset lifecycle here; Work orchestration / Run / Submit is `oxn-work`. See `references/asset-vs-work.md`.