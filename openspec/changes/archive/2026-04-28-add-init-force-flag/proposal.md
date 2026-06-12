## Why

当前 `oxn init` 的 `--force` 参数只更新心跳时间，不重新编译 Skill。当 Skill 源码更新后，用户无法方便地强制重新编译所有 Skill。

## What Changes

- 修改 `oxn init --force` 行为：在加上 `--force` 参数时，同时强制重新编译所有 Skill（相当于 `--compile-force`）
- 现有 `--compile-force` 参数可以独立使用，不需要 `--force`

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `oxn-init-force`: 修改 `--force` 参数行为，使其同时触发 Skill 强制重编译

## Impact

- `src/commands/init.ts` - 修改 `--force` 参数处理逻辑