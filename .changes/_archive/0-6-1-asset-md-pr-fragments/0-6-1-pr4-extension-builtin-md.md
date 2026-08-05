# 0.6.1 — PR-4 扩展: builtin assets (15 probes + 3 blueprints) .oxn → .md 迁移

> PR-4 Langium 冻结的扩展步骤
> 分支：`feat/v0.6.1-asset-md`
> 决策：D-α (c) — v0.6.1 不删 .oxn；保留作 v0.6.x fallback

---

## 0. 核心命题

**builtin assets 写 .md canonical 副本**：15 builtin probes + 3 builtin blueprints 在 `.oxn` 文件旁**新增对应 .md**（人可读 / mdast 路径），`.oxn` 留作 v0.6.x fallback。

- **runtime 行为零变化**：所有 builtin `.oxn` 仍由 Langium loader 加载（compat 兜底）
- **新增 affordance**：mdast 路径可以直接读 .md 文件，零 Langium 依赖
- **v0.7.0 切割准备**：builtin 部分可一次 `git rm .oxn` 直接到位（runtime 已有 .md fallback）

---

## 1. 代码变更

### 1.1 新增 `scripts/migrate-builtin-to-md.ts`（一次性转换工具）

- 扫 `src/builtin/probes/*.oxn` + `src/builtin/blueprints/*.oxn`
- 用 regex 解析 OXL（probe + blueprint 两类）
- 渲染为 MD format：
  - frontmatter `entity: probe|blueprint` + `version` + `name`
  - H1 `# Probe: <name>` / `# Blueprint: <name>`
  - sections: `## Alignment / ## Scheme / ## Props / ## Output`（probe）
  - sections: `## Version / ## Slots`（blueprint）
- `--write` flag 决定 dry-run vs 实际写盘

### 1.2 输出 18 个 .md 文件

```
src/builtin/probes/*.md     (15 文件)
src/builtin/blueprints/*.md (3 文件)
```

每个 .md 文件与同名 .oxn 共存，结构一一对应：
- `## Props` 列表含 type / required / default
- `## Output` 列表含 key: type
- `## Slots` 列表含 deps 嵌套列表 + observe 列表
- `## Alignment` 关联 align 名

### 1.3 新增 `src/builtin/__tests__/builtin-assets-md.test.ts`（21 cases）

测试覆盖：
- 15 probe .md 前置+frontmatter 合规（`entity: probe`, kebab-case `name`, H1 = `# Probe: <name>`）
- 3 blueprint .md 前置+frontmatter 合规（`entity: blueprint`, H1 = `# Blueprint: <name>`）
- 数量守卫：15 probes / 3 blueprints .md + .oxn 各 18 个文件
- v0.7.0 cutover 准备：`.oxn` 全量保留 v0.6.x fallback

### 1.4 不变量

- `src/builtin/probes/*.oxn` (Langium 加载) 行为不变
- `src/builtin/blueprints/*.oxn` (Langium 加载) 行为不变
- `git-workflow-compile.test.ts` 继续 parse .oxn via Langium — 不破坏
- 新 .md 文件**不影响** runtime（只作 canonical 副本）

---

## 2. 验收

| 检查 | 结果 |
|---|---|
| `bun run typecheck` | **0 error** ✓ |
| `bun run check`（biome）| **0 error** ✓ |
| `bun test packages/engine/src/oxl/md-bridge` | **242 / 242 pass** ✓ |
| `bun test src/builtin/__tests__/builtin-assets-md.test.ts` | **21 / 21 pass** ✓（新加 21 cases）|
| `bun test src/builtin/blueprints/__tests__/git-workflow-compile.test.ts` | **6 / 6 pass** ✓（既有 test 不破）|
| **18 个 builtin .md 文件 parse 全部 OK** | ✓ （独立验证脚本 tmp_verify）|

### 2.1 builtin assets 状态

| 类别 | .oxn 数量 | .md 数量 | runtime loader |
|---|---|---|---|
| builtin probes | 15 | 15 | Langium（不变）|
| builtin blueprints | 3 | 3 | Langium（不变）|

D-α c 状态：`.oxn` + `.md` 双轨并存；v0.7.0 切割时 `git rm .oxn` 后 mdast 接管。

---

## 3. 关联

- **PR-4 commit `7f2a1b7`**：基础 Langium 冻结
- **本 commit (PR-4 扩展)**：builtin asset .md 副本
- 后续 **PR-5**：verify + release
- v0.7.0：builtin `.oxn` 切割（由本 PR-4 扩展所产 .md 占位）

---

## 4. 文件清单

```
新增 (18 + 1 + 1 + 1)：
  src/builtin/probes/{15 个 .md}
  src/builtin/blueprints/{3 个 .md}
  src/builtin/__tests__/builtin-assets-md.test.ts
  scripts/migrate-builtin-to-md.ts

未触碰（per D-α c）：
  src/builtin/probes/*.oxn
  src/builtin/blueprints/*.oxn
```
