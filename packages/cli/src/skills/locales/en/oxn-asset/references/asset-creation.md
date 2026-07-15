# Asset Creation Workflow

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when creating a new Asset.

## Creation Workflow (5 Steps)

### Step 1: Choose AssetKind + Template

Select from `assets/` directory:
- `assets/domain.md` — 5 H3 terms + 1 `forbidden-constructs` H3 + 3 inv-* H3
- `assets/blueprint.md` — 2 prop H3 + 3 slot H3 (with deps / observe)
- `assets/stack.md` — 2 runtime + 1 linter + 1 test
- `assets/library.md` — N source H3
- `assets/external.md` — N link H3

### Step 2: Fork the Template

```bash
cp docs/en/asset-templates/domain.md /tmp/MyDomain.md
# Edit: name / abstract / references / citations / Terms / Bans / Invariants
```

### Step 3: Fill Fields

Each template has **minimum examples**, modify accordingly:
- Domain: term name + desc, ban name + items, invariant name + value
- Blueprint: prop name + type/values/required/default, slot name + deps/observe
- Stack: runtime name + version, linter name + config, test name + command/coverage
- Library: source name + url/version/fetched/summary
- External: link name + url/kind/ttl/auth/summary

### Step 4: Write to Disk (CLI triggers Work mode)

```bash
# Trigger Asset mode Work (IAP closed loop)
oxn work create MyDomain --type asset --asset-kind domain --json

# Or fast-path CLI (bypasses IAP, only v0.6.1-alpha.0)
oxn domain create MyDomain
```

### Step 5: Auto Sync

Asset mode Work complete, OXN auto-syncs:
- Write `.openxenon/assets/<kind>/<name>.oxn` (or v0.5 fallback `domains/blueprints/`)
- Write `.openxenon/assets/<kinds>-md/<name>.md` (MD mirror)
- planLock locks
- chmod 0o444 (read-only)

## Create vs Modify vs Delete

| Operation | Trigger | Output |
|---|---|---|
| Create | This file's 5 steps | New .oxn + .md mirror |
| Modify | `references/asset-evolution.md` | Old version backup + new version |
| Delete | `references/asset-lifecycle.md` | Archive directory `.archived/` + git history |