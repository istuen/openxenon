# /oxn-draft — Draft workspace management v0.6.2-alpha.3

## Goal
Manage the full lifecycle of **Drafts** (unpromoted descriptive workspace): **create / list / archive / discard / promote / retarget** (v0.6.2-alpha.3 adds 2 commands), covering 3 DraftTypes (report / issue / design) + 3 DraftTargets (rfc / asset / work).

Underlying: `oxn draft <subcommand>` (CLI calls Engine → Infra Module directly; no Probe, no Work).

> **v0.6.2-alpha.3 new**:
> - `--target <rfc|asset|work>` skeleton fork mode (create with frontmatter)
> - `promote` subcommand (via draft-promote-router Blueprint 4 phases)
> - `retarget` subcommand (explicit retarget, preserves engineer content)
> - See `.openxenon/assets/domains/oxn-draft-domain.md` v0.2.0 + `.openxenon/assets/domains/oxn-draft-promote-domain.md` v0.1.0

## Hard rules
- Draft location: `.openxenon/drafts/` (configurable via `.oxnrc` `draftDir`)
- File naming: no `--prefix` → `<name>.md`; with `--prefix` → `<prefix>-<name>.md`
- 3 DraftTypes: `report` / `issue` / `design`
- 3 DraftTargets (v0.6.2-alpha.3): `rfc` / `asset` / `work` (only 2 commands use it)
- `discard` requires `--force` (destructive)
- `archive` moves to `.openxenon/drafts/.archived/` (preserve history)
- `retarget` is explicit (no direct frontmatter edit)
- Draft not in AssetLifecycle (not via `oxn asset create/evolve/archive`)
- Draft not in Work IAP (no Probe, no frozen.json)
- 4 commands (create/list/archive/discard) use blank mode; 2 commands (promote/retarget) use skeleton fork mode

## Pattern cheatsheet
```
Draft = pre-state of Descriptive Modality
  ├── create                    # 2 modes:
  │     ├── blank (no --target) → 0 bytes (backward compat v0.6.2)
  │     └── skeleton (--target X) → fork from .openxenon/assets/blueprints/draft-skeletons/<X>[-kind].md
  ├── list                       # by mtime desc
  ├── archive                    # → .archived/
  ├── discard                    # unlink (--force)
  ├── promote                    # → draft-promote-router Blueprint 4 phases:
  │     ├── gather (read Draft)
  │     ├── select-target (read frontmatter promote-target)
  │     ├── validate (check fields)
  │     └── dispatch-target (route to promote-target-aware-workflow)
  └── retarget                   # explicit retarget → re-fork skeleton, preserve engineer content

Draft → Promote path (v0.6.2-alpha.3+ recommends `oxn draft promote`):
  ├── → Asset  → dispatch-target=rfc|asset|work routed by promote-target-aware-workflow
  ├── → RFC    → docs/rfcs/zh-cn/RFC-XXXX-<theme>.md
  ├── → Asset  → .openxenon/assets/{kind}/{name}.md (5 AssetKind)
  └── → Work   → .openxenon/works/<id>/work.md
```

## Operations

### 1. Create Draft

**Blank mode (default, backward compat v0.6.2)**:
```bash
oxn draft create <name> [--prefix report|issue|design]
```

**Skeleton mode (v0.6.2-alpha.3+)**:
```bash
oxn draft create <name> --target <rfc|asset|work> [--kind <5 AssetKind>] [--prefix <report|issue|design>]
```

**Examples**:
```bash
# Blank mode
oxn draft create my-design --prefix design

# Skeleton → RFC
oxn draft create rfc-0013 --target rfc

# Skeleton → Asset + Domain
oxn draft create payment-core --target asset --kind domain

# Skeleton → Work
oxn draft create fix-payment-idempotency --target work
```

**When to use `--target`**:
- `rfc` — prepare to promote to RFC
- `asset` + `--kind <domain|workflow|stack|blueprint|roadmap>` — prepare to promote to 5 Asset kinds
- `work` — prepare to promote to Work instance
- no `--target` — generic draft (can `retarget` later)

### 2. List Drafts

```bash
oxn draft list                     # active only
oxn draft list --include-archived  # include archived
```

Output: name, prefix, size, mtime, archived, sorted by mtime desc.

### 3. Archive Draft

```bash
oxn draft archive <name>           # prefix optional (auto-match)
```

Move to `.openxenon/drafts/.archived/`, preserve history.

### 4. Discard Draft

```bash
oxn draft discard <name> --force   # --force required
```

Unlink, no undelete.

### 5. Promote Draft (v0.6.2-alpha.3+)

```bash
oxn draft promote <name> [--target auto|rfc|asset|work] [--archive-after]
```

**4-phase lifecycle** (via draft-promote-router Blueprint):
1. **gather** — read Draft frontmatter + body
2. **select-target** — read `promote-target` (or `--target` override)
3. **validate** — check required fields (`promote-target` + `promote-kind` only for target=asset)
4. **dispatch-target** — route to promote-target-aware-workflow Blueprint sub-target

**7 sub-targets**:
- `promote-rfc` → `docs/rfcs/zh-cn/RFC-XXXX-<theme>.md`
- `promote-asset-{domain|workflow|stack|blueprint|roadmap}` → `.openxenon/assets/{kind}/{name}.md`
- `promote-work` → `.openxenon/works/<id>/work.md`

**Examples**:
```bash
# auto-read frontmatter promote-target
oxn draft promote my-design

# explicit override
oxn draft promote my-design --target rfc

# auto-archive after promote
oxn draft promote my-design --archive-after
```

**Key constraints**:
- Source Draft mtime unchanged (no Draft modification)
- After promote, engineer decides archive/discard
- 4 phases strictly ordered; any failure rolls back

### 6. Retarget Draft (v0.6.2-alpha.3+)

```bash
oxn draft retarget <name> --new-target <rfc|asset|work> [--new-kind <5 AssetKind>]
```

**Responsibilities**:
- Re-fork skeleton with new target
- Preserve engineer-typed frontmatter fields (except `promote-target` / `promote-kind` / `created-from` / `synced-at`)
- Preserve engineer body content (append to `<!-- engineer-preserved-content -->`)

**Examples**:
```bash
# rfc → asset+domain
oxn draft retarget my-design --new-target asset --new-kind domain

# chain retarget
oxn draft retarget my-design --new-target work
oxn draft retarget my-design --new-target rfc
```

**Key constraints**:
- Explicit retarget (no direct frontmatter edit on `promote-target`)
- retarget calls draft-skeleton-fork Workflow
- Engineer body content auto-preserved

## Promote routing (Draft → formal artifact)

| Target | Path (sub-target) | Frontmatter | When to use |
|---|---|---|---|
| **Asset** | `promote-asset-{kind}` | `--target=asset --kind=<5 AssetKind>` | Content converged to terms/rules/constraints |
| **RFC** | `promote-rfc` | `--target=rfc` | Content is prescriptive decision ("why decide X") |
| **Work** | `promote-work` | `--target=work` | Multi-stage executable task |

**DraftType → Promote path recommendation** (v0.6.2-alpha.3):

| DraftType | Recommended target |
|---|---|
| `design` | RFC or Asset |
| `issue` | Asset or Work |
| `report` | RFC or Asset |

## Key error codes

| Error code | Meaning | Fix |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name has path separator or extension | use kebab-case / camelCase |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` not in 3 types | use `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | file already exists | `oxn draft list`; rename |
| `OXN_DRAFT_NOT_FOUND` | archive/discard/promote/retarget not found | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | discard missing `--force` | add `--force` or use `archive` |
| `OXN_DRAFT_ALREADY_ARCHIVED` | archive target exists | discard archived copy or rename |
| `OXN_DRAFT_TARGET_INVALID` | `--target` not in 3 types | use `rfc` / `asset` / `work` |
| `OXN_DRAFT_KIND_REQUIRED` | `--target=asset` missing `--kind` | add `--kind=<5 AssetKind>` |
| `OXN_DRAFT_KIND_INVALID` | `--kind` not in 5 types | use `domain` / `workflow` / `stack` / `blueprint` / `roadmap` |
| `OXN_DRAFT_SKELETON_NOT_FOUND` | skeleton template missing | create `.openxenon/assets/blueprints/draft-skeletons/<target>[-kind].md` |
| `OXN_DRAFT_PROMOTE_TARGET_MISSING` | frontmatter missing `promote-target` | `oxn draft retarget` to add target |
| `OXN_DRAFT_PROMOTE_TARGET_UNKNOWN` | `promote-target` not in 3 types | fix frontmatter or `--target` |
| `OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH` | target/kind combination invalid | use `--target=asset --kind=<valid>` |
| `OXN_DRAFT_PROMOTE_VALIDATE_FAILED` | frontmatter validation failed | `oxn draft retarget` to fill |
| `OXN_DRAFT_FRONTMATTER_INVALID` | no frontmatter or malformed | `oxn draft create --target` to fork |

## Forbidden

- No Template in Draft (Draft engine has no builtin Template; skeleton from Blueprint)
- No required frontmatter (optional `--target` fork)
- No Probe via `oxn draft` (creation doesn't need validation, 5.1 insight)
- No hardcoded Draft paths in code (use `.oxnrc` `draftDir`)
- No active Draft deletion without `--force`
- No direct frontmatter edit on `promote-target` (use `oxn draft retarget`)

## Skill boundaries

| Skill | Owns | Does NOT own |
|---|---|---|
| `oxn-asset` | Asset lifecycle (5 AssetKind) | Draft create / promote / retarget |
| `oxn-work` | Work orchestration + execution + Probe | Draft create / promote / retarget |
| **`oxn-draft`** | **Draft lifecycle (6 commands) + Promote routing** | **Asset/Work/Doc direct creation** |

> Draft is Pre-Work exploration (free-format or skeleton-fork); Work is execution (IAP loop). They don't mix.

## Detailed references

- `references/draft-lifecycle.md` — 6 commands detailed + boundary rules + Work/Proof relation
- `.openxenon/assets/domains/oxn-draft-domain.md` v0.2.0 — Draft concept boundary
- `.openxenon/assets/domains/oxn-draft-promote-domain.md` v0.1.0 — Promote routing boundary
- `.openxenon/assets/blueprints/draft-promote-router.md` — routing Blueprint
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md` — L2 generic Promote
- `.openxenon/assets/workflows/draft-skeleton-fork.md` — Skeleton fork Workflow
