# Asset Evolution (Modification · v1.3 · RFC-0033 adapted)

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when modifying an existing Asset.

## Evolution Workflow (RFC-0033 D2 retired planLock step)

### Step 1: Locate the Asset

```bash
oxn asset list --type domain --name MemberContext
# Or
ls .openxenon/domains/MemberContext.md
```

### Step 2: Check referencing Works (RFC-0033 D2: planLock retired)

```bash
oxn asset show MemberContext --json
# View referencing Works + citations + dependent Asset list
```

🗑️ **No more planLock check**: Asset freely modifiable; referencing Works continue to function (work.md freely modifiable).

### Step 3: Trigger Asset Mode Work (Modify)

```bash
oxn work create evolve-MemberContext \
  --type asset --asset-kind domain \
  --evolve-from MemberContext \
  --json
```

Work internal flow (RFC-0033 D1: 3 steps):
- **Intent**: Modify MemberContext.md (specify what to change)
- **Align**: AI reads old → writes new (with diff)
- **Validate**: `oxn domain validate MemberContext` passes

### Step 4: Referencing Works Auto-Adapt (RFC-0033 D2 no re-lock needed)

After Asset modification:
- All Works referencing this Asset **don't need re-lock** (planLock retired)
- Next submit with work.md hash change → trace.jsonl appends ASSET_DRIFT event (not blocking)
- `assets.json` slim index auto-recomputes (at run --validate-only)

### Step 5: citations Auto-increment

After any Asset modification, **reverse references** (Assets depending on this) `citations` auto-increments by 1.

## Evolution vs New Creation

| Scenario | Recommendation |
|---|---|
| Modify 1-2 terms | Evolution (same Asset) |
| Modify H2 category structure | Evolution + trigger referencing Works re-validate |
| Completely different business boundary | New creation (archive old Asset) |

## Anti-Patterns

- ❌ Direct `write_file` modify .md (v0.6.3+ hard-blocks, must use Work path)
- ❌ Delete .md without going through archive flow (loses audit trail)
- ❌ Expect OXN to BLOCK Asset modifications causing Work errors (RFC-0033 D4: DRIFT only records not blocks)