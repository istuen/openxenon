---
categories:
  - Fixed
  - Changed
---

- **Breaking change (v0.0.28+)**：`task.deps` 字段语法收紧为唯一合法写法 `deps = ["t1", "t2"]`（grammar 加 `'deps' '='` 关键字引导 parser disambiguation）
- 拒绝写法：裸数组 `["t1"]` / `deps ["t1"]`（无 `=` 号） / 重复 deps 字段
- 修复 grammar ↔ examples ↔ 真实 work 三方漂移：之前 4 种 deps 写法在 parser 阶段全部 fail
- 迁移：`.openxenon/works/poc-git-isolation/work.oxn` 3 行 `deps [...]` → `deps = [...]`
- 测升级：`src/oxl/__tests__/examples-parsing.test.ts` 从 4 个 existsSync smoke test 升级为对真实 work 的真 parse 测（test.each 9 个 case 全绿）
- 新增：`src/oxl/__tests__/task-deps.test.ts` — 5 合法 + 5 非法 task.deps 端到端契约测（10 个 testcase 全绿）
- 语法顺序约束：deps 字段必须在所有 part 之后（grammar `(parts+=TaskPartDecl)* ('deps' '=' deps=TaskDeps)?`）
- 关联 forge：[`2026-06-11-grammar-deps-fix-design.md`](../.openxenon/forges/2026-06-11-grammar-deps-fix-design.md) + [`2026-06-11-pre-release-test-coverage-work-journal.md`](../.openxenon/forges/2026-06-11-pre-release-test-coverage-work-journal.md)
- 已知遗留：`src/oxl/examples/*.oxn` 仍用 v0.0.x 旧规（align/version/slot/ref），与当前 grammar 不兼容 — 独立 issue 待迁移
- 已知遗留：lint 2 个 pre-existing 违规（daemon/ipc/context.ts 与 daemon/recovery.ts 跨层导入 CLI）— 与本 PR 无关
- 已知遗留：i18n Phase A 漂移（详见 forges/2026-06-11-i18n-version-drift.md §5.1）— 36 处硬编码中文、en 资源缺失、0 单测、version:check 失败 — 与本 PR 无关，0.0.29 PR-1 修复
