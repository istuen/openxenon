## Why

Kernel Schema 层和 Infra 层的探针类型名不一致，导致：
1. Blueprint 中使用 `fs_match` / `shell_exec` 通过 Schema 校验时会失败
2. `fs_not_exists` 在 Schema 中缺失，永远无法通过校验
3. `fs_match` 的参数名 Schema 用 `path`，Infra 用 `pattern`，不匹配

这是硬阻塞问题，影响所有使用探针的 Task 验证流程。

## What Changes

1. **统一 ProbeTypeSchema 枚举值**
   - `fs_content_match` → `fs_match`
   - `exec_exit_zero` → `shell_exec`
   - 新增 `fs_not_exists`（Schema 缺失）

2. **统一 FsMatchParamsSchema 参数名**
   - `path` → `pattern`（文件路径 glob）
   - 新增 `contains`（内容正则）

3. **修复 shell-exec.ts 的 isAbsolute bug**
   - 当前 `"npm run lint"` 会被错误拼接为 `/path/npm run lint`
   - 修复：shell: true 时直接传 command，不做 join

4. **为 shell-exec 添加 timeout**
   - 默认 30 秒超时，防止命令卡死

## Capabilities

### New Capabilities

- `probe-type-schema`: 定义探针类型的规范，包含 type 枚举和参数 schema

### Modified Capabilities

- `kernel-schema-tests`: 需要更新所有使用旧类型名的 Scenario（`fs_content_match` → `fs_match`, `exec_exit_zero` → `shell_exec`, `path` → `pattern`）

## Impact

- **修改文件**：
  - `src/kernel/schemas/probe.ts`（ProbeTypeSchema, FsContentMatchParamsSchema）
  - `src/infra/probes/shell-exec.ts`（isAbsolute bug + timeout）
  - `openspec/specs/kernel-schema-tests/spec.md`（更新所有 Scenario）
  - `src/arsenals/probes/fs-match/canonical.yaml`（参数名同步）
  - `src/arsenals/probes/shell-exec/canonical.yaml`（类型名同步）

- **破坏性变更**：
  - 使用旧类型名（`fs_content_match`, `exec_exit_zero`）的 Blueprint 会失败
  - 使用旧参数名（`path`）的 Blueprint 会失败
