# Asset Lifecycle (Delete/Archive)

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when deleting/archiving an Asset.

## Archive (Recommended)

### Step 1: Mark as Deprecated

```bash
oxn asset archive MemberContext --reason "Business boundary merged into IdentityContext" --json
```

Effects:
- Asset `.oxn` / `.md` moved to `.openxenon/.archived/<kind>/<name>.oxn`
- `metadata` records archive reason, archive time, original citations
- planLock still queryable (read-only)

### Step 2: Notify Referencing Parties

After archiving, all Works referencing this Asset should:
- Update `domain "X" ref "..."` to the new Asset
- `oxn work lock` to re-lock
- Old Work's `context.md` records the archive event

### Step 3: DAG Validation

`oxn asset validate --check-dag --all` validates:
- No Work references archived Assets (should all switch to new Assets)
- No Asset references point to archived Assets

## Hard Delete (Not Recommended)

Only use when **confirmed no references** AND **business team agrees**:

```bash
oxn asset delete MemberContext --force --json
```

Effects:
- Directly delete `.oxn` / `.md`
- `assets.json` slim index deletion
- git history preserved (recoverable)

## Anti-Patterns

- ❌ Hard-delete referenced Assets (referencing Work `run` will `fail-fast`)
- ❌ Archive without updating Works (causes `MISSING_ASSET` errors)
- ❌ Skip DAG validation when archiving (DAG drift)