# RFC 迁移收尾修复计划

> **状态**：执行参考（流动草稿）
> **创建**：2026-07-26
> **作者**：opencode（与 user 协作，grilling #7 产出）
> **关联**：`.openxenon/drafts/rfc-migration-master-plan.md`（已大部分执行，本文档为收尾修复）

---

## 背景

`rfc-migration-master-plan.md`（493 行）的 7 阶段实施已基本完成，但 **grilling 发现 10 个深层次问题**，必须收尾修复才能作为成品交付。

**当前状态（已完成部分）**：

| Phase | 状态 |
|---|---|
| -1 Commit | ✅ 5 commits |
| 0 oxn-project-domain | ✅ 9 Term（含 7 计划） |
| 1 RFC 格式 + Blueprint | ✅ |
| 2 ADR→RFC | ✅ 12 RFC 落盘 |
| 3 废除 OXP + 归档 | ✅ 72 ADR 归档 + INDEX 删除 + README 重写 |
| 4 Registry | ✅ OxnBuiltinRegistry .md 加载 + stale path 修复 |
| 5 文档同步 | ⚠️ 部分完成 |
| 6 验证 | ✅ typecheck/test/lint/docs:build/validate-deps/boundary 全部 0 violations |

**6 项决策已锁定（grilling #7）**：

| # | 问题 | 决策 |
|---|---|---|
| G1+G3+G10 | 54 死链 + 48 失效 frontmatter + Accepted 语义矛盾 | 降回 Proposed → 镜像 ADR 到 `docs/adrs/` → 修链接 → 加 Errata → 重新升 Accepted v1.0.1 |
| G2 | Boundary checker 3 盲区 | 修全部 3 个（B1 YAML + B2 路径/pattern + B3 取消 .archived 豁免） |
| G4 | README + glossary frontmatter 格式 | 修（synced-at 移入 `---` 块） |
| G5 | three-tier-docs.md 6 处 OXP | 改为 RFC |
| G6 | oxn-system.md doc scene 缺 domain | 新增 oxn-project-domain 行 |
| G7 | master plan 进度表 | 全部标完成 |

---

## Step 1: 镜像 ADR 到 `docs/adrs/`

### 目标
创建 `docs/adrs/` 目录，镜像 72 个 ADR 文件，供 RFC 引用。

### 操作

| 步骤 | 内容 | 命令 |
|---|---|---|
| 1.1 | 创建 `docs/adrs/` 目录 | `mkdir -p docs/adrs` |
| 1.2 | 拷贝 72 ADR 文件 | `cp .openxenon/.archived/docs/adrs/*.md docs/adrs/` |
| 1.3 | 验证文件数 | `ls docs/adrs/ \| wc -l` → 72 |

### SSOT 关系

| 位置 | 角色 | 性质 |
|---|---|---|
| `.openxenon/.archived/docs/adrs/` | 不可变归档 SSOT | 工程师内部参考，frozen |
| `docs/adrs/` | 公开镜像 | RFC 引用目标，docs/ 内部 |

**规则**：RFC 只引用 `docs/adrs/`，不引用 `.openxenon/.archived/`（避免跨层）。

---

## Step 2: 12 RFC 降回 Proposed → 修链接 → 升回 Accepted

### 2a-2f 对每个 RFC（RFC-0001 到 RFC-0012）

#### 2a. 降回 Proposed

```yaml
# frontmatter 第 6 行
- status: Accepted
+ status: Proposed
```

#### 2b. 修 54 条 body markdown 链接

`## 相关决策` 段：
```markdown
# 旧（死链）
<!-- boundary:ignore -->
- [ADR-0001](../../.openxenon/drafts/rfc/0001-blueprint-props-funnel-effect.md) — Props 漏斗效应（2026-05-19）

# 新（docs/ 内部）
<!-- boundary:ignore -->
- [ADR-0001](../adrs/0001-blueprint-props-funnel-effect.md) — Props 漏斗效应（2026-05-19）
```

**替换规则**：
- 旧前缀：`../../.openxenon/drafts/rfc/`
- 新前缀：`../adrs/`
- 文件名不变

#### 2c. 修 48 条 frontmatter `related` 字段

```yaml
# 旧
related:
  - ADR-0001: .openxenon/drafts/rfc/0001-blueprint-props-funnel-effect.md
  - ADR-0021: .openxenon/drafts/rfc/0021-intent-align-observe-keyword-separation.md
  - ADR-0052: .openxenon/drafts/rfc/0052-langium-retirement-oxn-deprecation.md

# 新
related:
  - ADR-0001: docs/adrs/0001-blueprint-props-funnel-effect.md
  - ADR-0021: docs/adrs/0021-intent-align-observe-keyword-separation.md
  - ADR-0052: docs/adrs/0052-langium-retirement-oxn-deprecation.md
```

**替换规则**：
- 旧路径：`.openxenon/drafts/rfc/`
- 新路径：`docs/adrs/`

#### 2d. 加 Errata 段

在文件末尾 `## Errata` 段（如果不存在则新建）追加：

```markdown
## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 54 条 body 死链 + 48 条失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。
```

#### 2e. 版本号 bump

```yaml
- version: 1.0.0
+ version: 1.0.1
```

#### 2f. 重新升 Accepted

```yaml
- status: Proposed
+ status: Accepted
```

### 12 RFC 详细链接清单

#### RFC-0001 (3 ADR: 0001, 0021, 0052)
- body: 3 links
- frontmatter: 3 refs

#### RFC-0002 (8 ADR: 0002, 0003, 0008, 0009, 0010, 0011, 0013, 0037)
- body: 8 links
- frontmatter: 8 refs

#### RFC-0003 (8 ADR: 0012, 0020, 0031, 0032, 0057, 0058, 0067, 0076)
- body: 8 links
- frontmatter: 8 refs

#### RFC-0004 (13 ADR: 0004, 0005, 0024, 0025, 0035, 0049, 0050, 0051, 0054, 0055, 0056, 0061, 0075)
- body: 13 links
- frontmatter: 13 refs

#### RFC-0005 (2 ADR: 0018, 0074)
- body: 2 links
- frontmatter: 2 refs

#### RFC-0006 (1 ADR: 0023)
- body: 1 link
- frontmatter: 1 ref

#### RFC-0007 (10 ADR: 0059, 0060, 0068, 0069, 0070, 0072, 0073, 0077, 0078, 0079)
- body: 10 links
- frontmatter: 10 refs

#### RFC-0008 (3 ADR: 0066, 0071, 0080)
- body: 3 links
- frontmatter: 3 refs

#### RFC-0009-0012 (meta-RFCs，无 ADR 引用)
- 不涉及链接修复
- 但仍需：加 Errata 段（说明本次修复）+ 升 v1.0.1

**总计**：54 body + 48 frontmatter = 102 处替换

---

## Step 3: 修 Boundary checker 3 个盲区

### 文件
`scripts/check-doc-boundary.ts`

### B1: YAML frontmatter 扫描

**当前问题**：`extractLinks()` 只匹配 markdown `[text](url)`，不扫描 frontmatter YAML `related` 值。

**修复**：新增 `extractFrontmatterRefs()` 函数，扫描 frontmatter `related` 字段。

```typescript
function extractFrontmatterRefs(content: string): string[] {
  const refs: string[] = []
  // 提取 frontmatter 块
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return refs

  const fm = fmMatch[1]!
  // 匹配 related: 下的 ADR-XXXX: path 格式
  const relatedMatch = fm.match(/related:\s*([\s\S]*?)(?=\n\w|\n---|\n$)/)
  if (!relatedMatch) return refs

  // 提取 "path" 值
  const pathRegex = /:\s*(.+)$/gm
  let match
  while ((match = pathRegex.exec(relatedMatch[1]!)) !== null) {
    refs.push(match[1]!.trim())
  }
  return refs
}
```

在 `scanFile()` 中调用：
```typescript
const refs = extractFrontmatterRefs(content)
for (const ref of refs) {
  // 用 ref 替代 link 调用 resolveRelativePath
  const targetPath = resolveRelativePath(filePath, ref)
  // ... 同样规则检查
}
```

### B2: 错误相对路径致 false negative

**当前问题**：targetPattern 用 `^` 锚点（如 `/^\.openxenon\/drafts\/rfc\//`），错误相对路径（如 `../../.openxenon/` 从 `docs/rfc/zh-cn/`）解析为 `docs/.openxenon/drafts/rfc/...`，不匹配 `^\.openxenon/`，漏报。

**修复**：去掉 `^` 锚点，改用 `includes()` 语义。

```typescript
// 旧
targetPattern: /^\.openxenon\/drafts\/rfc\//

// 新
targetPattern: /\.openxenon\/drafts\/rfc\//  // 任意位置匹配
```

应用到所有规则（移除 `^`）。

### B3: .archived 豁免

**当前问题**：line 157 `if (targetPath.includes('.archived')) continue` — 链接到 `.archived/` 的目标全部豁免。

**修复**：删除 line 157。

```typescript
// 删除
if (targetPath.includes('.archived')) continue
```

**效果**：任何 `.archived/` 链接都会被检查（但目前没有规则专门阻断 `docs/ → .archived/`，所以实际无影响；删除是为了保持一致性，不留隐性豁免）。

### 验证

| 检查 | 期望 |
|---|---|
| `bun scripts/check-doc-boundary.ts` | 0 violations（修复后真实 0） |
<!-- boundary:ignore -->
| 故意测试：临时加一条 `docs/rfc/zh-cn/test.md` 含 `[bad](../../.openxenon/drafts/rfc/0001.md)` | 应被 B2 修复后捕获 |

---

## Step 4: 4 项清理

### G4: Frontmatter 格式修复

**问题文件**：
- `docs/rfc/zh-cn/README.md` lines 1-5
- `docs/glossary/zh-cn/project-terms.md`
- `docs/glossary/zh-cn/proof-terms.md`

**当前**（synced-at 在 frontmatter 块外面）：
```yaml
---
title: RFC 索引
---
synced-at: 2026-07-26
---
```

**修复**（synced-at 移入 `---` 块）：
```yaml
---
title: RFC 索引
synced-at: 2026-07-26
---
```

### G5: three-tier-docs.md OXP → RFC

**文件**：`docs/dev/zh-cn/three-tier-docs.md`

**6 处替换**：

| 行 | 当前 | 修复 |
|---|---|---|
| 7 | "内部手册（OXP）" | "内部手册（RFC）" |
| 15 | "`docs/rfc/{zh-cn,en}/`（OXP Proposal）" | "`docs/rfc/{zh-cn,en}/`（RFC 规范）" |
| 35 | "OXP-XXXX 编号" | "RFC-XXXX 编号" |
| 44 | "`docs/rfc/{zh-cn,en}/OXP-XXXX-xxx.md`" | "`docs/rfc/{zh-cn,en}/RFC-XXXX-<theme>.md`" |
| 69 | "`docs/rfc/zh-cn/OXP-XXXX-xxx.md`（统一提案）" | "`docs/rfc/zh-cn/RFC-XXXX-<theme>.md`（规范）" |
| 76 | "AGENTS.md §OXP 生命周期" | "AGENTS.md §RFC 生命周期" |

### G6: oxn-system.md doc scene 缺 domain

**文件**：`.openxenon/assets/roadmaps/oxn-system.md`

**当前 doc scene**（lines 29-36）：
```markdown
| kind | name | description |
|---|---|---|
| domain | oxn-domain | 顶层词汇边界 + 产品定位 + IAP 三阶段 |
| domain | oxn-asset-domain | Asset 生命周期 + 5 类 AssetKind + Paper 结构 |
| domain | oxn-cli-domain | CLI + i18n + Skill + VitePress 站点配置 |
| workflow | doc-author | ... |
| ... |
```

**修复**：在 `oxn-cli-domain` 后插入 `oxn-project-domain`：
```markdown
| domain | oxn-cli-domain | CLI + i18n + Skill + VitePress 站点配置 |
| domain | oxn-project-domain | 工程术语：RFC + Built-in Asset + 三情态（v0.7+ 新增） |
| workflow | doc-author | ... |
```

### G7: master plan 进度表

**文件**：`.openxenon/drafts/rfc-migration-master-plan.md` lines 414-423

**当前**（全部 ⏳ 未开始）：
```markdown
| Phase | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| -1 Commit | ⏳ 未开始 | — | — |
| 0 oxn-project-domain | ⏳ 未开始 | — | — |
| ... |
| 6 验证 | ⏳ 未开始 | — | — |
```

**修复**（全部 ✅ 完成 + 完成日期 2026-07-26 + 收尾修复指向本文件）：
```markdown
| Phase | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| -1 Commit | ✅ 完成 | 2026-07-26 | 5 commits（Phase 0/2/3/4/5） |
| 0 oxn-project-domain | ✅ 完成 | 2026-07-26 | 9 Term（superset） |
| 1 RFC 格式 | ✅ 完成 | 2026-07-26 | — |
| 2 ADR→RFC | ✅ 完成 | 2026-07-26 | 12 RFC 落盘 |
| 3 废除 OXP | ✅ 完成 | 2026-07-26 | 3 删 + 72 归档 + README 重写 |
| 4 Registry | ✅ 完成 | 2026-07-26 | .md 加载 + stale path |
| 5 文档同步 | ⚠️ 部分 | 2026-07-26 | 见 `rfc-migration-remediation-plan.md` 收尾修复 |
| 6 验证 | ✅ 完成 | 2026-07-26 | 6 项验证全过（边界检查盲区待修） |
```

**附录新增**：指向本文档：
```markdown
## 收尾修复

Phase 0-6 已完成，但 grilling 发现 10 个深层次问题。完整修复计划见
[`.openxenon/drafts/rfc-migration-remediation-plan.md`](./rfc-migration-remediation-plan.md)。
```

---

## Step 5: 验证（5 项）

| 检查 | 命令 | 期望 |
|---|---|---|
| 5.1 | `bun scripts/check-doc-boundary.ts` | 0 violations（B1+B2+B3 修复后真实 0） |
| 5.2 | `bun run docs:build` | 0 dead link（`docs/adrs/` 镜像存在） |
| 5.3 | `bun run typecheck` | 通过 |
| 5.4 | `bun test` | 1630+ pass |
| 5.5 | `bun run lint` | 通过 |

**新增验证项**（手动）：
- 抽查 3 个 RFC（如 RFC-0001/0004/0010）的链接应可点击打开
- `docs/adrs/` 目录应有 72 个 .md 文件
- 4 个 meta-RFC（0009-0012）的 Errata 段应存在
- boundary checker 故意加一条违规链接应被捕获（B2 修复验证）

---

## 文件改动清单

| 操作 | 文件 | 数量 |
|---|---|---|
| 新建 | `docs/adrs/` 目录 + 72 ADR 镜像 | 72 |
| 编辑 | 12 RFC 文件（降回 Proposed + 修链接 + Errata + 升 Accepted v1.0.1） | 12 |
| 编辑 | `scripts/check-doc-boundary.ts`（3 盲区修复） | 1 |
| 编辑 | `docs/rfc/zh-cn/README.md`（frontmatter） | 1 |
| 编辑 | `docs/glossary/zh-cn/project-terms.md`（frontmatter） | 1 |
| 编辑 | `docs/glossary/zh-cn/proof-terms.md`（frontmatter） | 1 |
| 编辑 | `docs/dev/zh-cn/three-tier-docs.md`（OXP→RFC） | 1 |
| 编辑 | `.openxenon/assets/roadmaps/oxn-system.md`（domain 行） | 1 |
| 编辑 | `.openxenon/drafts/rfc-migration-master-plan.md`（进度表 + 附录） | 1 |
| **合计** | | **~91 文件** |

---

## 执行顺序（依赖图）

```
Step 1: 镜像 ADR 到 docs/adrs/
    ↓
Step 2: 12 RFC 修复（链接目标必须先存在）
    ↓
Step 3: Boundary checker 修复（验证 Step 2 修复后无违规）
    ↓
Step 4: 4 项清理（独立，可并行）
    ↓
Step 5: 验证
```

**必须串行**：Step 1 → Step 2 → Step 5
**可并行**：Step 3 与 Step 4 之间可并行

---

## 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 72 文件镜像增加 docs build 时间 | ADR .md 小（~2-5KB），微乎其微 |
| R2 | B2 pattern 修改可能误报合法链接 | 用 `includes()` 替代 `^`，范围更精确 |
| R3 | B1 YAML 扫描需解析 frontmatter | 简单正则提取，不需完整 YAML parser |
| R4 | 12 RFC 批量编辑出错概率 | 用 sed 批量替换 + 人工抽查 3 个 |
| R5 | `docs/adrs/` 与 `.archived/docs/adrs/` 同步漂移 | 文档化 SSOT 关系，明确 `.archived/` 是 frozen 不可变 |

---

## 进度追踪

> 每步完成后更新此处。

| Step | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| 1 镜像 ADR | ⏳ 未开始 | — | — |
| 2 RFC 修复 | ⏳ 未开始 | — | — |
| 3 Boundary checker | ⏳ 未开始 | — | — |
| 4 清理 | ⏳ 未开始 | — | — |
| 5 验证 | ⏳ 未开始 | — | — |

---

## 附录：grilling #7 发现的 10 个问题

| # | 问题 | 严重度 | 修复 |
|---|---|---|---|
| G1 | 54 条 body markdown 死链 | CRITICAL | Step 2b |
| G2 | Boundary checker 3 盲区 | CRITICAL | Step 3 |
| G3 | RFC 违反自身 D4 规则 | CRITICAL | Step 1+2 |
| G4 | README + glossary frontmatter 格式错误 | MAJOR | Step 4 G4 |
| G5 | three-tier-docs.md 6 处 OXP | MAJOR | Step 4 G5 |
| G6 | oxn-system.md doc scene 缺 domain | MAJOR | Step 4 G6 |
| G7 | master plan 进度表从未更新 | MAJOR | Step 4 G7 |
| G8 | 2 处 stale "Arsenal" 注释 | MINOR | 不在本轮修复（注释级） |
| G9 | 2 条 .archived 链接未修复 | MINOR | 不在本轮修复（架构层未阻断） |
| G10 | Accepted 语义矛盾 | CRITICAL | Step 2（降回 Proposed 修复后再升） |

---

*本计划是流动草稿，执行过程中如遇偏差可直接编辑更新。完成后归档为 `.openxenon/.archived/docs/plans/`。*