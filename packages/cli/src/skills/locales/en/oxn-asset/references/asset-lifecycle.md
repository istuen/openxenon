# Asset Lifecycle (Delete/Archive · v1.3 · RFC-0033 adapted)

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when deleting/archiving an Asset.

## Archive (Recommended)

### Step 1: Mark as Deprecated

```bash
oxn asset archive MemberContext --reason "Business boundary merged into IdentityContext" --json
```

Effects:
- Asset `.md` moved to `.openxenon/.archived/assets/<kind>s/<name>.md`
- `metadata` records archive reason, archive time, original citations

🗑️ RFC-0033 D2: planLock retired, no need to consider lock state

### Step 2: Notify Referencing Parties

After archive, all Works referencing this Asset should:
- Update `domain "X" ref "..."` to point to new Asset
- `oxn work run <w> --validate-only` re-validate (no lock needed)
- Old Work's `context.md` records archive event

### Step 3: DAG Validation

`oxn asset validate --check-dag --all` validates:
- No Work references archived Asset (should all switch to new Asset)
- No Asset's references point to archived Asset

## Hard Delete (Not Recommended)

Use only when **confirmed no references** AND **business team agrees**:

```bash
oxn asset delete MemberContext --force --json
```

Effects:
- Directly delete `.md`
- `assets.json` slim index deletes entry
- git history preserved (recoverable)

## Anti-Patterns

- ❌ Hard delete referenced Asset (referencing Work's `run` will `fail-fast`)
- ❌ Archive without updating Works (causes `MISSING_ASSET` errors)
- ❌ Archive without DAG validation (DAG drift)