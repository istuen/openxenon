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

For most projects, no `.oxnrc` is needed — the unified leader is the
default. The `leaderMode` field is preserved for backward compatibility
with scripts that predate the unification.

```bash
cd my-project
# Nothing to do. Just run:
oxn leader new --name my-work
oxn leader run --work-file .openxenon/works/my-work/work.oxn
oxn leader submit --work-name my-work
```

If you previously had `leaderMode: mvp` in `.oxnrc` (from the dual-track
era), you can leave it — both modes now resolve to the same unified
leader. A one-time deprecation hint is logged to stderr on each
invocation.

For projects that want a project-pinned configuration:

```bash
cd my-project
# Set per-project defaults (only `leaderMode` is currently supported)
oxn config set --key leaderMode --value reference
git add .oxnrc
git commit -m "chore: pin this repo to the stable reference leader"
```

The `reference` and `mvp` values are now functionally equivalent (both
route to the unified leader), but the explicit value still works as a
hint to humans reading the file.

## See also

- [docs/architecture/unified.md](../architecture/unified.md) — full
  description of the unified architecture
- `oxn leader --help` — list of leader subcommands
