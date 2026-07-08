# 0.6.1 — PR-1: RFC T19 收尾（切割 allowLegacyDirective 安全网）

> 主题：v0.6.1-asset-md 5 PR 计划第 1 步
> 分支：`feat/v0.6.1-asset-md`
> Work：`v0-6-1-asset-md` → t1-rfc-t19-cleanup → **status=passed**
> 决策：D-α (c) + D-β (c) + D-γ (b)
> 关键不变量：v0.3 阶段 2 双轨制 → 单轨制；`:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`

---

## 0. 核心变更

**v0.3 阶段 2 双轨制（`:::intent{...}` 容器指令）正式废弃**。所有 8 个 EntityCompiler 解析 `:::intent` 块时**无条件**抛 `E_MD_DEPRECATED_SYNTAX`，不再有 `allowLegacyDirective` 逃生通道。

**勘察发现**（v0.3 PR-A 已完成大部分工作）：
- 5+3 个 EntityCompiler 全部就位（domain/blueprint/work/task/proof + stack/library/external）
- 15 个 `.openxenon/domains-md/*.md` 已全部转为纯 MD（H1 + H2 + H3 嵌套列表）
- `remark-directive` 已从 package.json 卸下
- `E_MD_DEPRECATED_SYNTAX` 已在 `pipeline.ts` 实现

**PR-1 实际剩余工作**：仅切 `allowLegacyDirective` 安全网。

---

## 1. 代码变更

| 文件 | 变更 | 净 LOC |
|---|---|---|
| `entity-compiler.ts` | `ParseOptions` 退化为空接口（删 `allowLegacyDirective` 字段）| -3 / +3 |
| 8 个 compiler（domain/blueprint/work/task/proof/stack/library/external）| 删 `if (options?.allowLegacyDirective !== true) {` 条件判断；改用 `{` 块包住 throw 块（biome noConstantCondition 友好）| -8 / +0 |
| 2 个 test fixture（`oxl-md-decompiler.test.ts:380` + `domain-compiler.test.ts:118`）| 删 `allowLegacyDirective: true` 调用；改写为 PR-1 验证测试 | -1 / +5 |

**总变更**：12 文件，+88 / -95 净 -7 LOC（不变量保持）。

---

## 2. 验收

### 2.1 md-bridge 单测
```
packages/engine/src/oxl/md-bridge:
  226 pass
  0 fail
  546 expect() calls
Ran 226 tests across 16 files. [251.00ms]
```

### 2.2 全量校验
- `bun run typecheck` — 0 error ✓
- `bun run check`（biome）— 0 error ✓
- `bun run lint`（eslint）— 0 error（2 pre-existing warnings in `sync-hash.ts`，与 PR-1 无关）✓
- `bun test packages/engine/src/oxl/md-bridge` — 226 / 226 ✓

### 2.3 全仓测试
- 1960 / 1960（含 skill 测试套） — **17 pre-existing failures 全在 skill 模块**（与 PR-1 无关，已通过 `git stash` 对照验证）

### 2.4 Work 推进
- `oxn work submit v0-6-1-asset-md t1-rfc-t19-cleanup` → `taskStatus: "passed"` ✓
- frozen.json 落地：`.openxenon/works/v0-6-1-asset-md/.run/tasks/t1-rfc-t19-cleanup/frozen.json`
- planLock 重置：`allHash: cd12ec88b1d62df1c32cccfa17d5ad628052b8df771930576d34cb68816b973d`

---

## 3. 决策影响

| 决策 | 影响 |
|---|---|
| **D-α (c)** | v0.6.1 不删 .oxn（.oxn 留盘作 v0.6.x fallback）；v0.7.0 切割 |
| **D-β (c)** | v0.6.1 不卸 Langium（Langium 留作 v0.6.x 解析 fallback）；v0.7.0 卸 |
| **D-γ (b)** | Work 引用值用 `@md/...` 前缀（D-γ 推迟到 PR-2）|

---

## 4. 后续 PR

- **PR-2** (t2-md-prefix)：`@md/...` 前缀（1 天）
- **PR-3** (t3-asset-canonical-flip)：AssetPathResolver + 全量迁移（3 天）
- **PR-4** (t4-langium-freeze)：Langium 冻结（1.5 天）
- **PR-5** (t5-verify-release)：验证 + 收尾（3.5 天）

---

## 5. 关联

- 完整 RFC：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md`
- v0.3 阶段 2 实施报告：`.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md`
- v0.6.1 RFC：`.openxenon/pools/sprints/v0.6.1-asset-md/design/rfc-v2.0-summary.md`（v0.6.1 阶段创建）
- Work 跟踪：`.openxenon/works/v0-6-1-asset-md/work.oxn`
