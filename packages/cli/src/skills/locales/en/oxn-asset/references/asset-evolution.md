# Asset Evolution (Modification)

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when modifying an existing Asset.

## Evolution Workflow

### Step 1: Locate the Asset

```bash
oxn asset list --type domain --name MemberContext
# Or
ls .openxenon/domains/MemberContext.oxn
```

### Step 2: Check planLock

```bash
oxn asset show MemberContext --json
# View lock status, citations, dependent Asset list
```

If the Asset **is referenced by a locked Work**:
- Triggers `IAP_ALIGN_LOCK_HASH_MISMATCH` (if you bypass lock)
- **Must** first `oxn work unlock <w>` → modify Asset → `oxn work lock <w>`

### Step 3: Trigger Asset Mode Work (Modify)

```bash
oxn work create evolve-MemberContext \
  --type asset --asset-kind domain \
  --evolve-from MemberContext \
  --json
```

Work internal IAP:
- **Intent**: Modify MemberContext.oxn (specify what to change)
- **Align**: AI reads old → writes new (with diff)
- **Proof**: `oxn domain validate MemberContext` passes

### Step 4: planLock Recompute

After Asset modification:
- All Works referencing this Asset's `planLock` automatically invalidated
- Must `oxn work lock <w>` to re-lock
- `assets.json` slim index auto-recomputes

### Step 5: citations Auto-increment

After any Asset modification, **reverse references** (Assets depending on this) `citations` auto-increments by 1.

## Evolution vs New Creation

| Scenario | Recommendation |
|---|---|
| Modify 1-2 terms | Evolution (same Asset) |
| Modify H2 category structure | Evolution + strict planLock validation |
| Completely different business boundary | New creation (archive old Asset) |

## Anti-Patterns

- ❌ Direct `write_file` modify .oxn (v0.6.3+ hard-blocks, must use Work path)
- ❌ Modify .oxn without unlocking related Work (triggers `LOCK_HASH_MISMATCH`)
- ❌ Delete .oxn without going through archive flow (loses audit trail)