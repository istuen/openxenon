# ISS-001 · CI 早退 bug：validate-dependencies.ts 提前退出整个递归

> **状态**：✅ Fixed in `ab6cdce` (2026-06-08) · 🗂 Closed (2026-07-10, doc-openxenon-cleanup)
> **严重度**：🔴 High
> **发现时间**：2026-06-08
> **发现者**：L0-L3 一致性审计（commit `ab6cdce`）
> **影响范围**：CI 依赖图验证（`.github/workflows/validate-deps.yml`）

---

## 1. 现象

`bun scripts/validate-dependencies.ts` 在大目录下报告的扫描文件数远小于实际：
- 修复前扫描 145 个文件
- 修复后扫描 206 个文件
- 修复前只发现 2 个违规
- 修复后真实发现 12 个违规（9 假阳性 + 3 真问题）

---

## 2. 根因

`scripts/validate-dependencies.ts` 的 `processDirectory()` 函数存在 **return 应为 continue** 的 bug：

```typescript
} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
  const layer = getLayerFromPath(fullPath)
  if (!layer) return  // 🐛 BUG: 退出整个函数，而非跳过当前文件
  ...
}
```

当遇到**未映射到任何层的 .ts 文件**时（例如 `src/core/errors/oxn-crash.ts`、`src/hall/index.ts`），`return` 会**退出整个递归**，导致同一目录及其后所有未遍历的兄弟目录都被跳过。

`readdirSync` 返回顺序的非确定性使得 bug 隐蔽：
- 在 `src/oxn-dsl/` 之前的所有目录（`src/infra/` 等）可能侥幸被处理
- 一旦命中未映射文件，整个递归提前终止

### 2.1 受影响的"未映射"目录

```bash
src/core/errors/        (L3-CLI 但未在 layer 规则)
src/watcher/            (L3-CLI 但未在 layer 规则)
src/skills/             (L3-CLI 但未在 layer 规则)
src/i18n/               (L3-CLI 但未在 layer 规则)
src/hall/               (L3-CLI 但未在 layer 规则)
```

---

## 3. 触发条件

- `src/` 目录下存在任何**未在 LAYER_RULES 注册**的 `.ts` 文件
- 该文件按字母序早于关键目录（`src/oxn-dsl/`、`src/cli/`、`src/daemon/`）被 `readdirSync` 返回
- 在 macOS / Linux 上，文件按 inode / 插入顺序返回，所以行为**非确定**

---

## 4. 修复方案（已落地）

### 4.1 脚本修复

```diff
- if (!layer) return  // 🐛 早退整个递归
+ if (!layer) continue  // ✅ 跳过当前文件
```

### 4.2 L3 映射补全

新增映射：

```typescript
if (
  relativePath.startsWith('src/cli/') ||
  relativePath.startsWith('src/daemon/') ||
  relativePath.startsWith('src/hall/') ||    // 新增
  relativePath.startsWith('src/skills/') ||  // 新增
  relativePath.startsWith('src/watcher/') || // 新增
  relativePath.startsWith('src/core/') ||    // 新增
  relativePath.startsWith('src/i18n/')       // 新增
) {
  return 'L3-CLI'
}
```

### 4.3 配套修复

- **C-2**：识别 `import type` 语句（避免误报 type-only 依赖）
- **C-3**：跳过 `__tests__/` 与 `*.test.ts` 文件（test 文件 relaxed boundary）
- **C-4**：`L2-Arsenal` → `L2-Builtin`（`src/arsenals/` 已删除）

---

## 5. 验证结果

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 扫描文件数 | 145 | **206** |
| 报告 violations | 2（漏报） | 12（真实）→ 修脚本后 **3**（仅真问题） |
| CI 早退风险 | 🔴 High | ✅ 已消除 |

---

## 6. 经验教训

1. **递归函数中 `return` vs `continue` 必须在 lint 阶段就拦截**。建议未来在 `processDirectory` 模式上加 ESLint 规则禁用 `return`。
2. **CI 验证的"完整性"应有外部测试**：写一个 meta-test，断言"在 src/ 下添加一个新 .ts 文件后，脚本扫描计数会增加"（防止未来再次发生早退）。
3. **layer 规则应是"全或无"**：要么所有 src/ 子目录都在 LAYER_RULES，要么脚本应**警告**未映射目录（而非静默跳过）。

---

## 7. 相关引用

- **修复 commit**：`ab6cdce` `docs(architecture): L0-L3 宪法沉淀（OXN 元域聚合根） + 一致性审计修复`
<!-- boundary:ignore -->
- **宪法文档**：[`docs/architecture/l0-l3-constitution.md`](../../docs/architecture/l0-l3-constitution.md) §4 依赖规则
- **CI workflow**：[`.github/workflows/validate-deps.yml`](../../.github/workflows/validate-deps.yml)
- **相关 issue**：[ISS-002](./ISS-002-l0-to-l3-reverse-dependency.md)（IAPError 反向依赖）

---

**标签**：`bug` `ci` `architectural-guard` `fixed`
