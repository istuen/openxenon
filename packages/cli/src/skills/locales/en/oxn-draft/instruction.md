# /oxn-draft — Draft workspace management v0.6.2

## Goal
Manage the full lifecycle of **Drafts** (unpromoted descriptive workspace): **create / list / archive / discard**, covering 3 DraftTypes (report / issue / design).

Underlying: `oxn draft <subcommand>` (CLI calls Engine → Infra Module directly; no Probe, no Work).

> **v0.6.2 new**: Draft is the pre-state of Descriptive Modality. Empty file, no Template, no frontmatter, no Probe (OXN verifier ≠ executor). See `.openxenon/drafts/draft-system-design-grilling.md`.

## Hard rules
- Draft location: default `.openxenon/drafts/` (configurable via `.oxnrc` `draftDir`)
- File naming: no `--prefix` → `<name>.md`; with `--prefix` → `<prefix>-<name>.md`
- DraftType 3 kinds: `report` (research report) / `issue` (problem record) / `design` (design draft)
- `discard` is destructive; requires `--force`
- `archive` moves Draft to `.openxenon/drafts/.archived/` (preserve history)
- Draft does NOT participate in AssetLifecycle (no `oxn asset create/evolve/archive`)
- Draft does NOT participate in Work's IAP closed loop (no Probe, no frozen.json)

## Paradigm
```
Draft = pre-state of Descriptive Modality
  ├── create → empty file (engineer + AI free-form fill)
  ├── archive → move to .archived/ (preserve history, mark inactive)
  └── discard → physical delete (--force)

Draft → promotion paths (not via Draft commands, via Promote Blueprint):
  ├── → Asset  → oxn work create --type asset --asset-kind X (use oxn-asset Skill)
  ├── → RFC    → oxn work create --blueprint doc-rfc-workflow
  ├── → Doc(dev)   → oxn work create --blueprint doc-dev-workflow
  └── → Doc(prod)  → oxn work create --blueprint doc-prod-workflow
```

## Execution

### 1. Create Draft

```bash
oxn draft create <name> [--prefix report|issue|design]
```

**When to use `--prefix`**:
- `report` — research report (e.g. `report-market-analysis.md`)
- `issue` — problem record (e.g. `issue-bug-123.md`)
- `design` — design draft (e.g. `design-arch-v2.md`)
- none — generic draft (e.g. `my-notes.md`)

### 2. List Drafts

```bash
oxn draft list                     # active only
oxn draft list --include-archived  # include archived
```

Output: name, prefix, size, mtime, archived status, sorted by mtime descending.

### 3. Archive Draft

```bash
oxn draft archive <name>           # prefix optional (auto-match)
```

Move to `.openxenon/drafts/.archived/`, preserve history.

### 4. Discard Draft

```bash
oxn draft discard <name> --force   # requires --force
```

Physical delete.

## Promotion guide (Draft → formal artifact)

| Target | Command | Use case |
|---|---|---|
| **Asset** | `oxn work create --type asset --asset-kind X` | content converged to terms/rules/constraints |
| **RFC** | `oxn work create --blueprint doc-rfc-workflow` | content is prescriptive decision ("why we decided X") |
| **Doc(dev)** | `oxn work create --blueprint doc-dev-workflow` | content is developer manual chapter (L0-L3 implementation view) |
| **Doc(prod)** | `oxn work create --blueprint doc-prod-workflow` | content is product manual chapter (user view) |

**DraftType → promotion recommendation**:

| DraftType | Recommended target |
|---|---|
| `design` | RFC or Doc(dev) |
| `issue` | Doc(dev) or RFC |
| `report` | Doc(prod) or Doc(dev) |

## Key error codes

| Code | Meaning | Fix |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name has path separator or extension | use kebab-case / camelCase |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` not in 3 kinds | use `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | same name exists | `oxn draft list` to see existing |
| `OXN_DRAFT_NOT_FOUND` | archive/discard cannot find file | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | discard missing `--force` | add `--force` or use `archive` |
| `OXN_DRAFT_ALREADY_ARCHIVED` | archive target exists | discard archived copy or rename |

## Prohibitions

- No Template-based Drafts (no Template mechanism, D22/D33/D37 revoked)
- No frontmatter-based Drafts (Draft ≠ Asset, no entity/version fields)
- No Probe verification via `oxn draft` (creation needs no verification, insight 5.1)
- No hardcoded Draft paths in code (use `.oxnrc` `draftDir`)
- No deleting active Drafts without `--force`

## Skill boundary

| Skill | Owns | Does NOT own |
|---|---|---|
| `oxn-asset` | Asset lifecycle (5 AssetKinds) | Draft create/archive |
| `oxn-work` | Work orchestration + execution + Probe | Draft create |
| **`oxn-draft`** | **Draft lifecycle (4 commands)** | **Asset/Work/Doc creation** |

> Draft is Pre-Work exploration zone (free-form handwritten); Work is execution zone (IAP closed loop). Do not mix.

## Reference
- `references/draft-lifecycle.md` — 4 commands detail + boundary rules + Work/Proof relationship