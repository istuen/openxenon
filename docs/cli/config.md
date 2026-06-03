# `oxn config` — Project-level CLI configuration

The `oxn` CLI exposes a small per-project config file, `.oxnrc`, that lets a
project pin its preferred leader track and (in the future) other knobs.

## File format

`.oxnrc` is a small JSON document in the project root (CWD when you invoke
`oxn`):

```json
{
  "version": 1,
  "leaderMode": "mvp"
}
```

| Field        | Type      | Required | Allowed values          | Effect                                  |
|--------------|-----------|----------|-------------------------|-----------------------------------------|
| `version`    | number    | yes      | `1`                     | Schema version (must be `1` for now)    |
| `leaderMode` | string    | no       | `"reference"` / `"mvp"` | Which leader track the project uses     |

Unknown fields are ignored. A missing `.oxnrc` is equivalent to `{}` (default
track = `reference`).

## Commands

```bash
# Print the resolved config + the source each value came from
oxn config show [--json|--yaml]

# Persist a value into .oxnrc
oxn config set --key leaderMode --value mvp
```

## Resolution priority

When the CLI starts and needs to know which leader track to load, sources
are consulted in this order (highest priority first):

1. **CLI flag** `--leader-mode=reference|mvp`
2. **Environment variable** `OXN_LEADER_MODE=reference|mvp`
3. **Project config** `./.oxnrc` (the `leaderMode` field)
4. **Default** `reference`

`oxn config show` reports which source won. Example:

```bash
$ cd ~/projects/foo  # has a .oxnrc with leaderMode: "mvp"
$ OXN_LEADER_MODE=reference oxn config show --json
{
  "ok": true,
  "data": {
    "leaderMode": "reference",
    "source": "env",
    "projectConfig": { "version": 1, "leaderMode": "mvp" },
    "projectConfigPath": "/Users/me/projects/foo/.oxnrc"
  }
}
```

## Error handling

A malformed `.oxnrc` (invalid JSON, unknown `version`, illegal
`leaderMode`) is treated as **no project config** — the resolution chain
falls through to env / default. A warning is printed to stderr and is also
surfaced by `oxn config show` in the `warning` field. This means a typo in
`.oxnrc` never blocks the CLI from running.

## Recommended setup

For most projects:

```bash
cd my-project
oxn config set --key leaderMode --value mvp   # opt into the mvp canary
git add .oxnrc
git commit -m "chore: opt this repo into the mvp leader canary"
```

Teams that prefer the stable reference track simply don't add `.oxnrc` (or
set `leaderMode: "reference"` explicitly for clarity).
