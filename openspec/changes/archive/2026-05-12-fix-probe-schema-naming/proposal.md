## Why

Skill references（probe-format.md, blueprint-format.md）和 Schema（probe.ts）存在不一致：
1. Schema 定义了 `fs_content_match` 和 `exec_exit_zero`，但 references 教 AI 用 `fs_match` 和 `shell_exec`
2. Schema 缺少 `fs_not_exists`，但 references 里有
3. Schema 用 `path` + `pattern`，references 用 `pattern` + `contains`

这导致 AI 按 references 生成的内容会被 Schema 拒绝。

## What Changes

1. **更新 probe-format.md（oxn-forge 的 L3 reference）**
   - `fs_match` → `fs_content_match`
   - `shell_exec` → `exec_exit_zero`
   - `fs_not_exists` 保留（补充到 Schema）
   - `FsContentMatchParams`：统一为 `path` + `contains`

2. **更新 blueprint-format.md（oxn-forge 和 oxn-task 的 L3 reference）**
   - 同步探针类型名和参数名

3. **更新 Schema（src/kernel/schemas/probe.ts）**
   - 添加 `fs_not_exists` 类型
   - `FsContentMatchParamsSchema` 改用 `path` + `contains`

4. **更新 SKILL.md 中的引用说明**
   - 指向更新后的 references 内容

## Capabilities

### New Capabilities

- `probe-type-naming-unification`: 统一探针类型命名和参数

## Impact

- 修改：`src/skills/oxn-forge.ts`（references 内容）
- 修改：`src/skills/oxn-task.ts`（references 内容）
- 修改：`src/kernel/schemas/probe.ts`（添加 fs_not_exists，修正 FsContentMatchParams）
- 不修改：其他 skill 的 SKILL.md（内容已经引用 references）