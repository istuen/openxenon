# 0.6.1 — PR-4: Langium 冻结（v0.6.1 不卸，v0.7.0 切割）

> 主题：v0.6.1-asset-md 5 PR 计划第 4 步
> 分支：`feat/v0.6.1-asset-md`
> Work：`v0-6-1-asset-md` → t4-langium-freeze → **status=passed**
> 决策：D-β (c) 锁定 — v0.6.1 不卸 Langium；v0.7.0 切割时一次 git rm

---

## 0. 核心命题

**冻结 Langium** — 现有 Langium usage 保留（compat 兜底），但**禁止新增**，v0.7.0 切割时统一 `git rm`。

- **v0.6.1**：冻结新增 + `@deprecated` 标注 + CI 守卫
- **v0.7.0**（8–12 周后）：删 `langium-driver/` 目录 + 卸 npm 依赖

不变量：
- 所有新代码走 mdast + EntityCompiler
- CLI 默认 driver = `'mdast'`（`'langium'` 仍保留 alias）
- `oxn <asset> validate --no-langium` 强校验（.oxn 文件拒绝）

---

## 1. 代码变更

### 1.1 新增 `scripts/check-no-new-langium-usage.ts`（CI 守卫 · fatal）

检测范围：git `ls-files --others`（新增未跟踪）+ `diff --cached --diff-filter=A`（已 staged 新增）
匹配：`from 'langium'` / `from '@langium/...'` / `require('langium')`
排除：`scripts/`（自身）+ `langium-driver/` + `generated/` + `__tests__/`
触发：fatal exit 1

加 `bun run check:no-langium` 到 `package.json` scripts。

### 1.2 `langium-driver/` 标 `@deprecated`（v0.7.0 cutover）

- `langium-oxl-driver.ts` 顶部注释加 `@deprecated v0.7.0 will be removed`
- 新增 `langium-driver/DEPRECATED.ts` throw — 误调用即抛错
- 注释明确列出 v0.7.0 待 git rm 的文件清单

### 1.3 `driver.ts` 默认 driver `'mdast'`（D-β c 锁定）

```ts
let activeDriverName: DriverName = 'mdast'  // v0.6.1 前是 'unified'
```

`getActiveDriver()` 返回 unified driver（v0.4 PR-C4 已实现）。
`setActiveDriver('langium')` 显式仍可切（compat）；`'unified'` 保留 alias。
`listDrivers()` 把 `'mdast'` 提到首位。

### 1.4 CLI 新增 `--no-langium` 选项

**`oxn domain validate <name> --no-langium`** 和 **`oxn blueprint validate <name> --no-langium`**：
- `.md` 文件 → 正常 validate（mdast 路径）
- `.oxn` 文件 → 抛 `OXN_NO_LANGIUM_REJECTED` 错误

语义：用户显式声明"我只要 mdast"，避免 Langium grammar 加载。

### 1.5 Docs 更新

`docs/zh-cn/extending.md` + `docs/en/extending.md`：
- 加"Langium 退役时间表"段
- 5 行表格：v0.6.0 / v0.6.1 PR-1 / PR-4 / v0.7.0 cutover
- 用户行为变更 3 项 + 迁移指南 3 条

---

## 2. 验收

| 检查 | 结果 |
|---|---|
| `bun run typecheck` | **0 error** ✓ |
| `bun run check`（biome）| **0 error** ✓ |
| `bun run lint`（eslint）| **0 error**（2 pre-existing warnings）✓ |
| `bun test packages/engine/src/oxl/md-bridge` | **242 / 242 pass** ✓ |
| `bun run check:no-langium` | ✓ exit 0（无新增 Langium usage）|
| `bun run check:md-fallback` | 跑通 ✓ |
| `oxn work submit t4-langium-freeze` | `taskStatus: "passed"` ✓ |
| frozen.json 落地 | `.run/tasks/t4-langium-freeze/frozen.json` ✓ |

### 2.1 Langium 现状（PR-4 截止）

- **新文件 Langium usage**：0（CI 守卫通过）
- **现有 Langium usage**：保留 compat（v0.7.0 切割时一次清理）
- **已 `git rm`（DEPRECATED.ts）**：0（标记用途，不删实际功能）

---

## 3. 后续 PR

- **PR-5** (t5-verify-release)：3.5 天 — 验证 + 收尾 + CHANGELOG + 双 remote + tag v0.6.1
- **v0.7.0 切割**（独立 sprint，8 周后）：`git rm` `langium-driver/` + 卸 npm dep + 简化 `OxlDriver` 抽象

---

## 4. 关联

- RFC v2.0：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md`（D9 锁定）
- 守卫脚本：`scripts/check-no-new-langium-usage.ts`
- deprecated 目录标记：`packages/engine/src/oxl/langium-driver/DEPRECATED.ts`
- Docs：`docs/zh-cn/extending.md` + `docs/en/extending.md`
- Work 跟踪：`.openxenon/works/v0-6-1-asset-md/work.oxn`
- 上一步 PR-3 changelog：`.changes/0-6-1-pr3-asset-canonical-flip.md`
