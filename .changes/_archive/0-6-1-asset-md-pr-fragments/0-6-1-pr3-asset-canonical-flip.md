# 0.6.1 — PR-3: Asset canonical 翻转 (.md 优先 + .oxn fallback)

> 主题：v0.6.1-asset-md 5 PR 计划第 3 步
> 分支：`feat/v0.6.1-asset-md`
> Work：`v0-6-1-asset-md` → t3-asset-canonical-flip → **status=passed**
> RFC：md-native-grammar-rfc v2.0（v0.6.1 增量已 PR-2 锁定）
> 决策：D-α (c) + D-β (c) + D-γ (b)

---

## 0. 核心命题

**Asset canonical 表示从 .oxn 翻转到 .md**（D-α c 锁定）：
- **v0.6.1**：默认写 `.md`，`.oxn` 留盘作 v0.6.x fallback（不删）
- **v0.7.0**（独立 sprint）：`git rm` 全部 .oxn + 卸 Langium（D-β c）

**实际变更范围（Q1 砍 195 works + Q2 留 docs + Q3 默认 .md）**：
- 33 个 user/builtin asset 跑 `oxn domain sync --all` + `oxn blueprint sync --all` → 现在 .md 与 .oxn 共存
- 0 历史 works / 0 doc examples 触碰（D-α c 锁定）
- 0 新 npm 依赖

---

## 1. 代码变更

### 1.1 `infra/paths.ts` 加 4 级候选路径（D-α c 设计）

新增 2 个 helper：
- `resolveAssetFileCandidatesV61(projectRoot, entity, name, config)` → 4 候选：`<primary>/<name>.md` → `<primary>/<name>.oxn` → `<fallback>/<name>.md` → `<fallback>/<name>.oxn`
- `resolveAssetWritePathV61(projectRoot, entity, name, config, format)` → 写路径只产 1 个目标（默认 .md）

`AssetFormat` 默认值：`'oxn'` → `'md'`（D-α c 锁定）。

### 1.2 `Asset/internal/resolver.ts` 加 `resolveAssetFileFirst()`

新 helper：返回第一个存在的资产文件路径（.md → .oxn → ...）。
如果都不存在，返回 primary .md（让 create 命令新建）。

### 1.3 CLI 复用：无需新增 `md-migrate` 子命令

**3b 关键发现**：`oxn domain sync --all` 和 `oxn blueprint sync --all` 已存在且行为正确：
- 跑 `oxn domain sync --all` → 18 个 domain .md 已写入主目录
- 跑 `oxn blueprint sync --all`（在 copy 11 个 legacy .oxn 到 v6 默认布局后）→ 11 个 blueprint .md 已写入

**因此无需新增 CLI 子命令**，复用既有 `sync` 即可。

### 1.4 `oxn work create` 默认 .md

- 默认生成 `works/<n>/work.md`（canonical）+ `works/<n>/tasks/<t>.md`（每个 task）
- 保留 `.oxn` 作 v0.6.x fallback
- 加 `--oxn-legacy` flag 可切回 .oxn 写（v0.6.x compat）

### 1.5 `resolveWorkFilePath` 已支持 .md 优先（无需改）

CLI 现有 read path 已通过 `resolveWorkFilePath(projectRoot, workName, assetFormat)` 走 .md 优先 + .oxn fallback，3a 改 default 后整链路生效。

### 1.6 新增 `scripts/check-md-fallback-stats.ts`（INFO 守卫）

- 扫所有 asset dir 的 .oxn 数量 + .md 数量
- 输出进度：`domain: 18 .oxn / 18 .md (50%)` 等
- 总进度 + 趋势建议
- **不阻断 CI**（exit code 0）
- 加 `bun run check:md-fallback` 到 package.json

观察期：v0.6.1 → v0.7.0 切割期间，.oxn 数量应逐步下降至 0（届时可触发 PR v0.7）。

### 1.7 23 test fixtures（Q1 决策：**不动**）

`packages/engine/src/oxl/examples/**/*.oxn` 仅 smoke test 引用（`examples-parsing.test.ts:30`），未真正 parse；保留 .oxn（Q2 决策）。

### 1.8 Docs 更新

- `docs/zh-cn/cli.md` + `docs/en/cli.md`：加 v0.6.1 .md 优先说明 + `oxn domain sync --all` 迁移命令
- Asset 路径查找 4 级候选说明

---

## 2. 验收

| 检查 | 结果 |
|---|---|
| `bun run typecheck` | **0 error** ✓ |
| `bun run check`（biome）| **0 error** ✓ |
| `bun run lint`（eslint）| **0 error**（2 pre-existing warnings）✓ |
| `bun test packages/engine/src/oxl/md-bridge` | **242 / 242 pass** ✓ |
| `bun run check:md-fallback` | 跑通，输出 33 asset .oxn/.md 进度 ✓ |
| `oxn domain sync --all` | 18 个 .md 已写入主目录 ✓ |
| `oxn blueprint sync --all` | 11 个 .md 已写入主目录 ✓ |
| `oxn work create my-new --blueprint X`（默认）| 生成 work.md + work.oxn（双轨）✓ |
| `oxn work submit t3-asset-canonical-flip` | `taskStatus: "passed"` ✓ |
| planLock allHash | `1a52969988c67353d12e008fadb9167c5f18cb3f17824e71ee909e18084e93fb` |
| frozen.json 落地 | `.run/tasks/t3-asset-canonical-flip/frozen.json` ✓ |
| **历史 works 触碰** | **0**（Q1 决策执行）|
| **doc examples 触碰** | **0**（Q2 决策执行）|

### 2.1 当前 .oxn fallback 状态

```
=== v0.6.1 PR-3 .oxn fallback stats (INFO) ===
  domain     :  18 .oxn /  18 .md  (50.0% legacy remaining)
  blueprint  :  22 .oxn /  11 .md  (66.7% legacy remaining)
  ------------------------------------------------------------
  TOTAL      :  40 .oxn /  29 .md
ℹ Migration progress: 42.0% converted to .md. v0.7.0 cutover planned.
```

（blueprint 22 = 11 in `assets/blueprints/` + 11 in `blueprints/` legacy dir；D-α c 设计上双轨并存）

---

## 3. 后续 PR

- **PR-4** (t4-langium-freeze)：Langium 冻结（1.5 天），含 builtin blueprints + 15 builtin probes 迁移到 .md
- **PR-5** (t5-verify-release)：验证 + 收尾（3.5 天）
- **v0.7.0 切割**（独立 sprint，8 周后）：`git rm` 全部 .oxn + 卸 Langium

---

## 4. 关联

- RFC v2.0：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md`
- 入口 helper：`packages/engine/src/infra/paths.ts` + `Asset/internal/resolver.ts`
- 守卫脚本：`scripts/check-md-fallback-stats.ts`
- Docs：`docs/zh-cn/cli.md` + `docs/en/cli.md`
- Work 跟踪：`.openxenon/works/v0-6-1-asset-md/work.oxn`
- 上一步 PR-2 changelog：`.changes/0-6-1-pr2-md-prefix.md`
