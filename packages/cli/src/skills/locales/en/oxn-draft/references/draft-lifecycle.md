# Draft lifecycle reference

> Detailed description of `oxn draft` 4 commands' execution, error codes, Work/Proof collaboration, and boundary rules.

## 1. create command

### Usage
```bash
oxn draft create <name> [--prefix report|issue|design] [--json]
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | positional | ✅ | Draft name (kebab-case or camelCase, no path separator / no extension) |
| `--prefix` | string | ❌ | DraftType prefix (`report` / `issue` / `design`) |

### File naming

| `--prefix` | Filename |
|---|---|
| none | `<name>.md` |
| `report` | `report-<name>.md` |
| `issue` | `issue-<name>.md` |
| `design` | `design-<name>.md` |

### Output (JSON mode)
```json
{
  "ok": true,
  "data": {
    "name": "my-design",
    "prefix": "design",
    "path": "/path/to/.openxenon/drafts/design-my-design.md",
    "filename": "design-my-design.md"
  }
}
```

### Error codes

| Code | Trigger | Fix |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name contains `/` `.` or empty | use `^[a-zA-Z][a-zA-Z0-9_-]*$` |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` not in 3 kinds | use `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | same name exists | `oxn draft list` to see existing |

### Side effects
- Creates `.openxenon/drafts/` directory if not exists
- Writes empty file (0 bytes)
- No Probe calls, no frozen.json

---

## 2. list command

### Usage
```bash
oxn draft list [--include-archived] [--json]
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `--include-archived` | boolean | ❌ | also list `.archived/` Drafts |

### Output (human mode)
```
| name | prefix | size | mtime | archived |
|---|---|---|---|---|
| design-grilling | design | 0B | 2026-07-29T... |  |
| report-market | report | 1024B | 2026-07-28T... |  |
| old-design | design | 512B | 2026-07-20T... | yes |
```

### Output (JSON mode)
```json
{
  "ok": true,
  "data": {
    "drafts": [
      {
        "name": "design-grilling",
        "prefix": "design",
        "path": "/path/to/.openxenon/drafts/design-grilling.md",
        "size": 0,
        "mtime": "2026-07-29T...",
        "archived": false
      }
    ],
    "count": 1
  }
}
```

### Sort
by mtime descending (most recent first).

---

## 3. archive command

### Usage
```bash
oxn draft archive <name> [--json]
```

### Behavior
- Move `<draftDir>/<filename>` to `<draftDir>/.archived/<filename>`
- Preserve filename (including prefix)
- Prefix optional: `archive foo` and `archive design-foo` both find the file
- `archived` flag set to `true`, default list excludes it

### Error codes

| Code | Trigger | Fix |
|---|---|---|
| `OXN_DRAFT_NOT_FOUND` | file not in active dir | `oxn draft list` to see existing |
| `OXN_DRAFT_INVALID_NAME` | name format invalid | use valid format |
| `OXN_DRAFT_ALREADY_ARCHIVED` | `.archived/` already has same name | discard archived copy or rename |

---

## 4. discard command

### Usage
```bash
oxn draft discard <name> --force [--json]
```

### Required `--force`
`discard` is destructive; explicit confirmation required. If `--force` missing, returns `OXN_DRAFT_DISCARD_FORCE_REQUIRED` and does NOT delete.

### Search order
1. Search in active directory first
2. If not found, search in `.archived/`
3. If both not found, return `OXN_DRAFT_NOT_FOUND`

### Error codes

| Code | Trigger | Fix |
|---|---|---|
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | missing `--force` | add `--force` or use `archive` |
| `OXN_DRAFT_NOT_FOUND` | active + archived both not found | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_INVALID_NAME` | name format invalid | use valid format |

---

## 5. Config file (`.oxnrc`)

Draft directory configurable via `.oxnrc` `draftDir` field:

```json
{
  "version": 1,
  "mode": "PRODUCTION",
  "draftDir": "drafts"
}
```

- Default: `drafts` (with boundaryDir `.openxenon` → `.openxenon/drafts/`)
- Can be relative (e.g. `notes` → `.openxenon/notes/`) or absolute (not recommended)

> ⚠️ `draftDir` is v0.6.2 new; old projects keep default behavior.

---

## 6. Work / Proof collaboration

### Draft is not Work
- Work has 3 IAP phases (Intent → Align → Proof), Draft has none
- Work produces frozen.json, Draft does not
- Work references Assets (DAG validation), Draft does not
- Work files in `.openxenon/works/<id>/`, Draft files in `.openxenon/drafts/`

### Draft is not Proof
- Proof-First verifies **existing artifacts** (read-only observation), Draft **creates empty documents**
- All 19 Probes are verifiers; Draft creation needs no verification
- Draft creation "evidence" is the file's existence + creation timestamp (FS mtime)

### Draft and Promote Blueprint
Draft files **can be read by Promote Blueprint's gather slot** (as promotion source):

| Promote Blueprint | gather slot behavior |
|---|---|
| `asset-workflow` | collect Drafts related to target Asset |
| `doc-rfc-workflow` | collect Drafts related to target RFC |

**doc-dev-workflow / doc-prod-workflow** do not collect from drafts/ (direct pick-domain) — Draft → Doc(dev/prod) is a pseudo-need (grilling decision D16-D18).

---

## 7. Boundary rules (inherited from oxn-project-domain)

```
- .openxenon/drafts/ project draft → ADR/RFC staging forbidden (draft should not self-reference)
- .openxenon/drafts/rfc/ ADR/RFC staging → project Asset forbidden (use docs/ concept page)
- docs/dev/ → .openxenon/drafts/ forbidden (developer manual cannot reference ADR staging)
```

These rules are enforced by `scripts/check-doc-boundary.ts` in pre-commit (landed in v0.6.x).

---

## 8. Complete example

```bash
# Create a design draft
oxn draft create my-design --prefix design
# → /path/to/.openxenon/drafts/design-my-design.md (empty)

# Edit (any editor)
vim .openxenon/drafts/design-my-design.md

# List current Drafts
oxn draft list

# Design complete, decide to promote to RFC
oxn work create my-design-rfc --blueprint doc-rfc-workflow

# Archive original Draft (preserve history)
oxn draft archive design-my-design

# No longer needed, discard
oxn draft discard design-my-design --force
```