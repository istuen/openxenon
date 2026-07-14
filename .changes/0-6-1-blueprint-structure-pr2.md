# v0.6.1 — Blueprint 结构重组 PR-2（Work create 流程）

## Breaking Changes

### `oxn work create` 输出格式更新

- **Task template 加 `boundary` 字段**：task.md 的 `## Refs` 段新增 `- boundary: <boundary-name>` 字段，标识该 Task 对应 Blueprint 的哪个 Boundary
- **Task `## Parts` 默认 part 名从 `slot-name` 改为 `implement`**（与 Skill 模板一致）

### `renderWorkSkeleton` 行为变化

- **`## Use` 替代 `## Refs`**：work.md 的引用段从 `## Refs` 改名为 `## Use`
- **空 boundaries 列表不生成 `## Tasks` 段**（之前总是生成空的 `## Tasks` header）

## Bug Fix

- **修复 work.md ref 路径错误**：work.md 生成时 Blueprint ref 路径从错误的 `@prj/workflows/<name>` 修正为 `@prj/blueprints/<name>`（与现有 E2E 测试期望一致）

## 内部

- `writeTaskTemplate` 新增可选 `boundaryName` 参数；`oxn work create` 自动从 Blueprint Boundaries 传递 boundary name
- `renderWorkSkeleton` 测试覆盖 8 个场景（`## Use` 段、ref 路径、boundary 列表、多 refs、options 注入、向后兼容、空列表）
- `per-work-blueprints-merger.ts` 默认 ref 路径同步修正

## 验证

- typecheck: ✅ 0 errors
- lint: ✅ 0 warnings
- tests: ✅ 1504 pass / 3 skip / 0 fail（1507 tests across 123 files，新增 8 个 work-skeleton 测试）
