# v0.6.1 — Blueprint 结构重组 PR-1（解析层 + 语法调整）

## Breaking Changes

### Blueprint `.md` 语法重构

- **`## Use` 替代 `## Refs`**：Blueprint 通过 `## Use` 段引用三边界（domain / workflow / stack），H3 下用 `- domain:` / `- workflow:` / `- stack:` 字段
- **`## Boundaries` 替代 `## Slots`**：每个 Boundary 是一个编排单元，含 `refs`（引用哪些边界）+ `observe`（可用 Probe 类型清单）+ `deps`（依赖其他 Boundary）
- **删除 `## Props`**：Blueprint 不再需要 Props 段

### Workflow `.md` 语法简化

- **Slot 只保留 `desc`**：deps 和 observe 字段删除（已移到 Blueprint Boundary）
- **删除 `## Externals`**：external 并入 frontmatter `references`

### Stack `.md` 语法合并

- **`## Tools` 替代 `## Runtimes` / `## Linters` / `## Tests`**：三类工具合并为一个 H2 分类
- **无 `role` 分类**：由 catalog 自己知道映射
- **删除 `## Externals`**

### Domain `.md` 语法精简

- **删除 `## Stack`**：Stack 由独立 Asset 处理
- **删除 `## Externals`**：external 并入 frontmatter `references`

### Work `.md` 语法

- **`## Use` 替代 `## Refs`**：Work 只引用 Blueprint（不再直接引用 Workflow）

## Migration

- 所有现有 Blueprint 文件需要从 `## Refs` + `## Slots` 迁移到 `## Use` + `## Boundaries`
- Workflow 文件需要删除 slot 的 `deps` 和 `observe` 字段
- Stack 文件需要从 `## Runtimes` / `## Linters` / `## Tests` 合并为 `## Tools`
- Domain 文件需要删除 `## Stack` 和 `## Externals` 段
- Work 文件需要将 `## Refs` 改名为 `## Use`

## 内部

- `BlueprintIR` 接口重写：`props` + `slots` 字段 → `use` + `boundaries` 字段
- `WorkflowSlot` 接口简化：只保留 `name` + `desc`
- `StackItem` 不再分 runtimes/linters/testers，合并为 `tools` 数组
- 4 个 EntityCompiler 的 H2 分类白名单更新
- `serializeBlueprintToOxn` 重写为 use + boundaries 序列化
- `Work` `createWork` 流程改用 boundaries
- 3 个测试块标记 skip（`## Externals` 已废弃）

## 验证

- typecheck: ✅ 0 errors
- lint: ✅ 0 warnings
- tests: ✅ 1496 pass / 3 skip / 0 fail（1499 tests across 122 files）
