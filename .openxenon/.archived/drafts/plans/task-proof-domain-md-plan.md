# Task + Proof + Domain 完全 MD 化计划

## Context

v0.6.1 已将 Work 迁移为 MD-native（frontmatter + H1/H2/H3 + lists），但 Task、Proof、Domain 三个实体仍依赖 OXN 正则解析。MD-native 编译器（`task-compiler.ts`、`proof-compiler.ts`、`domain-compiler.ts`）已存在于 `md-bridge/compilers/`，但未接入 CLI 流程。`summary-extractors.ts` 中的 `readTaskFile()` 和 `readDomainFile()` 仍用 OXN 正则，无法正确解析 MD 文件。

## 目标

- Task、Proof、Domain 的读取/写入全部使用 MD 格式
- CLI 子命令（list-task、task-status、edit-task、proof create、proof probe add 等）全部使用 MD 正则
- 保留 OXN 正则作为 v0.6.x fallback（通过 `--format oxn` flag 或自动检测）
- 测试通过

---

## Phase 1：修复 `summary-extractors.ts`（核心解析层）

### 1.1 重写 `readTaskFile()` — MD 解析

**文件**: `packages/engine/src/oxl/summary-extractors.ts` (lines 78-134)

当前问题：8 个 OXN 正则无法解析 MD 任务文件。

**新逻辑**：
```
1. 解析 frontmatter → 提取 name
2. 查找 H1 "# Task: name"
3. 查找 "## Parts" H2 下的 H3 子标题 → parts
4. 每个 H3 下查找 "- skill_context: ..." → skillContext
5. 查找 "## Refs" H2 下的 "- blueprint: ..." / "- domain: ..."
```

**保留 OXN fallback**：检测文件是否以 `---` 开头（frontmatter），否则走旧 OXN 正则。

### 1.2 重写 `readDomainFile()` — MD 解析

**文件**: `packages/engine/src/oxl/summary-extractors.ts` (lines 36-75)

当前问题：6 个 OXN 正则无法解析 MD domain 文件。

**新逻辑**：
```
1. 解析 frontmatter → 提取 name
2. 查找 H1 "# Domain: name"
3. 查找 blockquote "> description" → description
4. 查找 "## Terms" H2 下的 H3 → terms
5. 查找 "## Bans" H2 下的 H3 → ban
6. 查找 "## Invariants" H2 下的 H3 → invariant
```

**保留 OXN fallback**：同上。

---

## Phase 2：修复 CLI Task 子命令

### 2.1 `list-task` — MD 正则

**文件**: `packages/cli/src/commands/work.ts` (lines 1163-1219)

当前：`blueprint "name"` / `domain "name"` OXN 正则

改为：
- 读 frontmatter → `name`
- 查 `## Refs` 下 `- blueprint: xxx` / `- domain: xxx`

### 2.2 `task-status` — MD 正则

**文件**: `packages/cli/src/commands/work.ts` (lines 1224-1268)

当前：3 个 OXN 正则

改为：frontmatter.name + refs 读取

### 2.3 `verify-task-path` — MD 正则

**文件**: `packages/cli/src/commands/work.ts` (lines 1273-1353)

当前：4 个 OXN 正则（包括 `part "name"` 计数）

改为：frontmatter + `## Parts` 下 H3 计数

### 2.4 `edit-task` — MD 正则

**文件**: `packages/cli/src/commands/work.ts` (lines 1358-1474)

当前：6 个 OXN 正则替换（objective、constraints、domain）

改为：MD 列表替换（`- objective:`、`- skill_context:`、`- domain:` under refs）

### 2.5 `run` 中 task 文件解析 — MD 正则

**文件**: `packages/cli/src/commands/work.ts` (lines 1762-1785)

当前：5 个 OXN 正则提取 blueprint、injects、parts、objective、constraints

改为：frontmatter + refs + parts 读取

---

## Phase 3：修复 CLI Proof 子命令

### 3.1 `proof create` — MD 模板

**文件**: `packages/cli/src/commands/proof.ts` (lines 364-381)

当前：生成 OXN `proof "name" { description = "..."; }`

改为：生成 MD 模板
```
---
entity: proof
version: 0.7.0
name: ${name}
---
# Proof: ${name}
> TODO: 一句话描述这个 proof 验收什么
```

### 3.2 `proof probe add` — MD 追加

**文件**: `packages/cli/src/commands/proof.ts` (lines 484-598)

当前：追加 OXN `probe "p1" { ref "..."; params { ... } }`

改为：追加 MD H3 块
```
### ${probeName}
- ref: ${ref}
- key: value
```

同时修复 `nextProbeName()` 正则为 MD 模式（`### p1`）

---

## Phase 4：修复 `work-manager.ts` editTask()

**文件**: `packages/engine/src/Work/work-manager.ts` (lines 332-407)

当前：6 个 OXN 正则替换

改为：MD 列表替换，与 CLI edit-task 保持一致

---

## Phase 5：更新测试

### 需要更新的测试文件

1. `packages/engine/src/oxl/__tests__/summary-extractors.test.ts` — 添加 MD 格式测试用例
2. `packages/cli/src/__tests__/work-*-e2e.test.ts` — Task 相关 E2E 需要用 MD 格式 task 文件
3. `packages/engine/src/Work/__tests__/birth-cert.test.ts` — 已更新（上次 commit）
4. `packages/engine/src/oxl/__tests__/task-compiler.test.ts` — 已有 MD 测试，验证通过

---

## 执行顺序

1. Phase 1（summary-extractors）→ 2. Phase 2（CLI task）→ 3. Phase 3（CLI proof）→ 4. Phase 4（engine editTask）→ 5. Phase 5（tests）

## 验证

```bash
bun test                          # 全量测试
bun run typecheck                 # 类型检查
bun run lint                      # 架构守卫
bun run check                     # biome 格式
```

## 关键文件

| 文件 | 变更 |
|---|---|
| `packages/engine/src/oxl/summary-extractors.ts` | 重写 readTaskFile/readDomainFile |
| `packages/cli/src/commands/work.ts` | 5 个子命令 MD 化 |
| `packages/cli/src/commands/proof.ts` | create/probe add MD 化 |
| `packages/engine/src/Work/work-manager.ts` | editTask MD 化 |
| `packages/engine/src/oxl/__tests__/summary-extractors.test.ts` | 新增 MD 测试 |
