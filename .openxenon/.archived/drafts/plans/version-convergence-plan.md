# 版本收敛执行计划

> **状态**：执行参考（流动草稿）
> **创建**：2026-07-26
> **作者**：opencode（与 user 协作，grilling #8 产出）
> **关联**：[`rfc-migration-master-plan.md`](./rfc-migration-master-plan.md)、[`rfc-migration-remediation-plan.md`](./rfc-migration-remediation-plan.md)

---

## 背景

OpenXenon 当前存在 **20 处版本漂移**（grilling #8 调研），核心矛盾：

| 维度 | 声称 | 实际 |
|---|---|---|
| `package.json` version | 0.6.1 | v0.7 doc restructure 已 commit 但未 bump |
| `docs/product/en/roadmap.md` | **v0.1.2** | 落后 5 个 minor |
| AGENTS.md / roadmap asset | "v0.7 已落地" | package.json 仍是 0.6.1 |
| Git tags（最新 v0.4.0） | v0.4.0 | HEAD 有 v0.6.1 + v0.7 doc refactor |
| `.changes/0-7-0-emergence.md` | v0.7.0 = emergence + Infra Ports | 实际 v0.7 commit 做的是 doc restructure |

## 收敛原则

**代码保持 0.6.x 迭代，0.7 是下一个版本规划。** package.json 为版本唯一真相源。

---

## 决策清单（8 项，全部锁定）

| # | 决策 | 选择 |
|---|---|---|
| V1 | package.json 版本 | bump 0.6.1 → **0.6.2**（doc/terminology restructure 归入 0.6.x 系列） |
| V2 | AGENTS.md 17 处 "v0.7" | 改为 **0.6.x**（与 package.json 对齐） |
| V3 | 0-7-0-emergence.md | **保持不变**（未来路线图参考） |
| V4 | en/roadmap.md | 加 **stale banner** |
| V5 | version-check.ts | 以 **package.json 为唯一真相源**，规划文档（.changes/0-7-*.md）豁免 |
| V6 | Git tags | **不补**（重构跳过） |
| V7 | CHANGELOG.md 缺 3 条 | **加指引链接**到 pre-0-6-history.md |
| V8 | 0.7 语义 | **代码保持 0.6.x 迭代，0.7 是下一个版本规划** |

---

## 12 步执行计划

### A. 版本号 bump（3 文件）

| 文件 | 改动 |
|---|---|
| `package.json`（root） | `"version": "0.6.1"` → `"0.6.2"` |
| `packages/engine/package.json` | `"version": "0.6.1"` → `"0.6.2"` |
| `packages/cli/package.json` | `"version": "0.6.1"` → `"0.6.2"` |

---

### B. AGENTS.md v0.7 → 0.6.x（1 文件，17 处替换）

17 处 "v0.7" 引用改为 "0.6.x"。完整列表（按行号）：

| 行 | 当前 | 改为 |
|---|---|---|
| 3 | "v0.7 起纯 MD" | "0.6.x 起纯 MD" |
| 64 | "v0.7.0 后 `.oxn` 格式已废弃" | "0.6.x 后 `.oxn` 格式已废弃" |
| 85 | "## 文档三层架构（v0.7 三情态分离重构）" | "## 文档三层架构（0.6.x 三情态分离重构）" |
| 89 | "v0.7 三情态" | "0.6.x 三情态" |
| 101 | "v0.7+ 废除 OXP 双层机制" | "0.6.x+ 废除 OXP 双层机制" |
| 109 | "v0.7 Phase 3 已批量归档" | "0.6.x Phase 3 已批量归档" |
| 117 | "v0.7.0 布局" | "0.6.2 布局" |
| 129 | "### RFC 生命周期（v0.7+ 取代 OXP 机制）" | "### RFC 生命周期（0.6.x+ 取代 OXP 机制）" |
| 151 | "### 引用规则（v0.7 三情态隔离）" | "### 引用规则（0.6.x 三情态隔离）" |
| 157 | "v0.7 RFC-0010" | "0.6.x RFC-0010" |
| 171 | "v0.7 布局" | "0.6.2 布局" |
| 173 | "v0.7+ 唯一规定性载体" | "0.6.x+ 唯一规定性载体" |
| 177 | "## AI Agent 路由入口（v0.7.x Roadmap）" | "## AI Agent 路由入口（0.6.x+ Roadmap）" |
| 185 | "v0.7+ 6 scene" | "0.6.x+ 6 scene" |
| 193 | "### v0.7+ 文档架构改动（AI 必读）" | "### 0.6.x+ 文档架构改动（AI 必读）" |
| 233 | "v0.7 三层文档守门（已落地）" | "0.6.x 三层文档守门（已落地）" |

**v0.3 路线图段（L277）状态标记**：
- 当前：`## v0.3 路线图扩展：MD-Native Grammar 改革（🟡 RFC 待拍板）`
- 改为：`## v0.3 路线图扩展：MD-Native Grammar 改革（✅ 已完成，归档到 v0.6.1）`

段内 "T18/T19/T20 状态" 描述改为 "已在 v0.6.1 落地（参见 .changes/0-6-1-pr1-rfc-t19-cleanup.md + 0-6-1-oxn-deprecation.md）"

---

### C. oxn-system.md roadmap（1 文件）

**文件**：`.openxenon/assets/roadmaps/oxn-system.md`

| 行 | 当前 | 改为 |
|---|---|---|
| 18 | "当前自举范围（2026-07-26 v0.7 Phase 5）" | "当前自举范围（2026-07-26 0.6.2 Phase 5）" |
| 20 | "v0.7+ 文档架构" | "0.6.x+ 文档架构" |
| 32 | "v0.7+ 新增" | "0.6.x+ 新增" |

---

### D. README 修正（2 文件）

**`README.md`**：

| 行 | 当前 | 改为 |
|---|---|---|
| 150 | "当前版本: 0.6.1" | "当前版本: 0.6.2" |
| 141 | "v0.5.0 — ✓ 已发布 npm（v0.5+ 暂停 npm 发布）" | "v0.5.0 — ⚠️ 未发布 npm（v0.5+ 暂停发布）" |
| 142 | "v0.6.0 — ✓ 已发布 npm（v0.5+ 暂停 npm 发布）" | "v0.6.0 — ⚠️ 未发布 npm（v0.5+ 暂停发布）" |
| 146 | "v0.7+ 规划（[apps/hall Migration Plan](./docs/architecture/v0.7-hall-migration-plan.md)）" | 删除整行（断链，目录不存在） |

**`README.en.md`**：

| 行 | 当前 | 改为 |
|---|---|---|
| 187 | "Version: 0.6.1" | "Version: 0.6.2" |
| 175-179 | v0.5.0/v0.6.0 npm 标记 | 同上修正 |
| 183 | v0.7+ roadmap 断链 | 删除整行 |

---

### E. en/roadmap.md stale banner（1 文件）

**文件**：`docs/product/en/roadmap.md`

顶部（frontmatter 之后）插入：

```markdown
> ⚠️ **This documentation is stale (last synced with v0.1.2).**
> For current roadmap, see [中文版路线图](../zh-cn/roadmap.html).
> Planned for update in the v0.7.0 release cycle.
```

---

### F. docs/product/zh-cn/roadmap.md（1 文件）

| 行 | 当前 | 改为 |
|---|---|---|
| 9 | "当前版本：v0.6.1" | "当前版本：v0.6.2" |
| 162 | "当前版本：**v0.6.1**（见 `package.json`）" | "当前版本：**v0.6.2**（见 `package.json`）" |

---

### G. CHANGELOG.md 加指引 + 0.6.2 条目（2 文件）

**`docs/product/zh-cn/changelog/CHANGELOG.md`** 和 **`docs/product/en/changelog/CHANGELOG.md`**：

1. **顶部（0.6.1 条目之前）加指引**：

```markdown
> **0.4.0 / 0.5.0 / 0.6.0 的变更记录见 [`.changes/pre-0-6-history.md`](https://github.com/istuen/openxenon/blob/main/.changes/pre-0-6-history.md)。**
```

2. **新增 0.6.2 条目**（在 `## [0.6.1]` 之前）：

```markdown
## [0.6.2] - 2026-07-26

### Changed
- RFC 迁移：48 Adopted ADR → 12 RFC（8 主题 RFC + 4 meta-RFC），废除 ADR+OXP 双层
- 文档三情态分离：Asset（定义性）/ RFC（规定性）/ Doc（描述性）
- OxnBuiltinRegistry 从硬编码 mock 改为 .md 文件加载（15 probes + 3 blueprints）
- Boundary checker 3 盲区修复 + lefthook pre-commit 启用
- 术语对齐：TrustClosure → MinimumClosure 等

### Added
- `docs/adrs/` 镜像目录（72 ADR 文件，供 RFC 引用）
- `docs/glossary/zh-cn/project-terms.md`（工程术语：RFC / Built-in Asset / 三情态）
- `oxn-project-domain.md`（CONTEXT-MAP 第 8 个 Domain）
- 4 条 meta-RFC：RFC-0009（文档三情态）/ RFC-0010（frozen+errata）/ RFC-0011（内置 Asset 两层）/ RFC-0012（自举种子豁免）
- `bun scripts/check-doc-boundary.ts` 扩展：YAML frontmatter 扫描 + 无 ^ 锚点 + 取消 .archived 豁免

### Removed
- 3 条 OXP 文件（`docs/rfc/zh-cn/OXP-000{1,2,3}-*.md`，内容已合并到 RFC）
- `.openxenon/drafts/rfc/INDEX.md`（被 `docs/rfc/zh-cn/README.md` 替代）
- 3 phantom parts（`OxnBuiltinRegistry` 中无 .md 文件的硬编码 mock：`git-commit`/`create-branch`/`develop-feature`）
```

---

### H. 新建 changelog fragment（1 文件）

**新建 `.changes/0-6-2-rfc-migration.md`**：

```markdown
---
version: 0.6.2
date: 2026-07-26
type: minor
---

# 0.6.2 — RFC 迁移 + 文档三情态分离 + 术语对齐

## 核心改动

### RFC 迁移（ADR + OXP → RFC）
- 48 Adopted ADR + 4 meta-RFC（grilling 决策）→ 12 RFC 文件，落盘 `docs/rfc/zh-cn/`
- 8 主题 RFC：RFC-0001 OXL/Blueprint / RFC-0002 Kernel-L0 / RFC-0003 AI 协作 / RFC-0004 Work-Asset / RFC-0005 Insight-Skill / RFC-0006 Docs-Brand / RFC-0007 Domain 词汇与 OXN 定位 / RFC-0008 命名与演进策略
- 4 meta-RFC：RFC-0009 文档三情态分离 / RFC-0010 frozen+errata / RFC-0011 内置 Asset 两层 / RFC-0012 自举种子豁免
- 72 ADR 文件物理移动到 `.openxenon/.archived/docs/adrs/`，并在 `docs/adrs/` 创建镜像供 RFC 引用
- 废除 3 条 OXP（内容合并到对应 RFC）

### 文档三情态分离
- **定义性情态（Asset）**：`.openxenon/assets/` —— 回答 "X 是什么"
- **规定性情态（RFC）**：`docs/rfc/zh-cn/` —— 回答 "为什么决定 X"
- **描述性情态（Doc）**：`docs/{product,dev}/` —— 回答 "怎么用 X"
- 跨层引用规则：docs 内部互引 ✅，docs → .openxenon ❌（严格隔离）
- 新增 `oxn-project-domain.md`（第 8 个 Domain）：RFC / Built-in Asset / Starter Asset / 三情态 / 自举种子豁免

### Engine 改动
- `OxnBuiltinRegistry` 从硬编码 mock 改为从 `src/builtin/**/*.md` 加载（mdast pipeline）
- 修复 4 probes inconsistency：4 → 15 probes + 0 → 3 blueprints
- 删除 3 phantom parts（无 .md 文件）
- 修复 stale path：`oxn-scope.ts` `.openxenon/arsenals/` → `.openxenon/assets/`

### 文档边界守门
- `scripts/check-doc-boundary.ts` 扩展：
  - B1：扫描 YAML frontmatter `related` 字段
  - B2：去除 targetPattern `^` 锚点（抓错误相对路径）
  - B3：取消 `.archived` 目标豁免
- lefthook pre-commit 启用 boundary checker

### 术语对齐
- TrustClosure → MinimumClosure
- 旧 OXP-XXXX → RFC-XXXX（编号）
- ProbeVerdict → ProbeOutcome（v0.7.3 计划，本版预对齐）

## 影响范围

- **测试**：1630 pass / 0 fail / 3 intentional skip
- **构建**：`bun run typecheck` / `bun test` / `bun run docs:build` / `bun run lint` / `bun scripts/validate-dependencies.ts` 全部通过
- **边界检查**：0 violations（真实 0，非盲区假象）

## 关联文档

- `.openxenon/drafts/rfc-migration-master-plan.md` — 迁移总计划（Phase 0-6）
- `.openxenon/drafts/rfc-migration-remediation-plan.md` — 收尾修复（Step 1-5）
- `.openxenon/drafts/version-convergence-plan.md` — 版本收敛（V1-V8）
```

---

### I. version-check.ts 扩展（1 文件）

**文件**：`scripts/version-check.ts`

**新检查范围**：

| 文件 | 检查方式 | 期望 |
|---|---|---|
| `README.md` | `/版本:\s*([\d.]+)/` | == package.json |
| `README.en.md` | `/Version:\s*([\d.]+)/` | == package.json |
| `docs/product/zh-cn/changelog/CHANGELOG.md` | 第一个 `## [X.Y.Z]` | == package.json |
| `docs/product/en/changelog/CHANGELOG.md` | 第一个 `## [X.Y.Z]` | == package.json |
| `packages/engine/package.json` | `version` 字段 | == package.json |
| `packages/cli/package.json` | `version` 字段 | == package.json |
| `docs/product/zh-cn/roadmap.md` | `/当前版本[：:]\s*\*?\*?v?([\d.]+)/` | == package.json |
| `.openxenon/assets/roadmaps/oxn-system.md` | `/当前自举范围.*v?([\d.]+)/` | == package.json |

**豁免清单**（不检查）：
- `docs/product/en/roadmap.md`（已标 stale banner）
- `.changes/0-7-*.md` / `.changes/0-8-*.md`（未来路线图）
- `.changes/pre-0-6-history.md`（历史归档）
- `docs/rfc/zh-cn/*.md`（RFC 文档 version，非 OXN version）
- AGENTS.md（v0.6.x/v0.7 历史叙述，不强制等于 package.json）

**输出格式扩展**：检查通过时打印检查的文件数（"8 files checked"），失败时打印哪些文件 mismatch。

---

### J. .changes/0-6-0-iap-refactor.md 断链修复（1 文件）

**文件**：`.changes/0-6-0-iap-refactor.md`

| 行 | 当前 | 改为 |
|---|---|---|
| 119 | `[apps/hall Migration Plan](../docs/architecture/v0.7-hall-migration-plan.md)` | `[v0.7 emergence changelog](../0-7-0-emergence.md)` |
| 120 | `[v0.7+ builtin assets 迁移范围](../docs/architecture/v0.6-builtin-assets-scope.md)` | 删除（断链 + 未来路线图，不在 0.6.0 范围） |

---

## 文件改动清单

| 操作 | 文件 | 数量 |
|---|---|---|
| 编辑 | `package.json`（root + 2 packages） | 3 |
| 编辑 | `AGENTS.md`（17 处 v0.7 + v0.3 段状态） | 1 |
| 编辑 | `.openxenon/assets/roadmaps/oxn-system.md` | 1 |
| 编辑 | `README.md` + `README.en.md` | 2 |
| 编辑 | `docs/product/en/roadmap.md`（banner） | 1 |
| 编辑 | `docs/product/zh-cn/roadmap.md` | 1 |
| 编辑 | `docs/product/{zh-cn,en}/changelog/CHANGELOG.md` | 2 |
| 编辑 | `scripts/version-check.ts` | 1 |
| 编辑 | `.changes/0-6-0-iap-refactor.md`（断链） | 1 |
| 新建 | `.changes/0-6-2-rfc-migration.md` | 1 |
| **合计** | | **14 文件** |

---

## 执行顺序

```
A. 版本号 bump（3 个 package.json）
    ↓
B. AGENTS.md v0.7 → 0.6.x
    ↓
C. oxn-system.md roadmap
    ↓
D. README 修正 ×2
    ↓
E. en/roadmap.md stale banner
    ↓
F. docs/product/zh-cn/roadmap.md
    ↓
G. CHANGELOG.md 指引 + 0.6.2 条目 ×2
    ↓
H. .changes/0-6-2-rfc-migration.md 新建
    ↓
I. version-check.ts 扩展
    ↓
J. .changes/0-6-0-iap-refactor.md 断链
    ↓
验证
```

**必须串行**：A → B → ... → J → 验证
**无并行机会**（各步骤均涉及不同文件，但顺序敏感于 A 必须先于验证）

---

## 验证（6 项）

| 检查 | 命令 | 期望 |
|---|---|---|
| 1 | `bun run version:check` | PASS（扩展后仍通过） |
| 2 | `bun run typecheck` | 通过 |
| 3 | `bun test` | 1630 pass / 0 fail |
| 4 | `bun run docs:build` | 通过 |
| 5 | `grep -r "v0\.7" AGENTS.md` | 0 匹配（除 v0.7 路线图段标记历史引用） |
| 6 | `grep -r "0\.6\.1" package.json packages/*/package.json` | 0 匹配 |
| 7 | `grep -r "v0\.7 Phase 5" .` | 0 匹配 |
| 8 | `ls docs/adrs/ \| wc -l` | 72 |

---

## 不变更清单

为避免 scope creep，以下文件 **保持不变**：

| 文件 | 理由 |
|---|---|
| `.changes/0-7-0-emergence.md` | 未来路线图（emergence + Infra Ports），与今天的 doc restructure 无关 |
| `.changes/0-7-1-ai-three-modes.md` | 未来路线图 |
| `.changes/0-7-2-anchor-slot.md` | 未来路线图 |
| `.changes/0-8-0-term-upstream-dag.md` | 未来路线图 |
| `.openxenon/.archived/docs/adrs/*.md` | 不可变归档 SSOT |
| `docs/adrs/*.md` | 公开镜像（与归档一致） |
| `docs/rfc/zh-cn/*.md` | RFC 文档 version 字段是 RFC 文档版本，非 OXN 版本 |

---

## 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | AGENTS.md 17 处替换可能遗漏 | 用 `grep -n "v0\.7" AGENTS.md` 列出全部位置，逐个确认 |
| R2 | version-check.ts 扩展后 false positive（en/roadmap.md 是 stale，应豁免） | 已在豁免清单 |
| R3 | CHANGELOG.md 0.6.2 条目格式与历史不一致 | 参考现有 0.6.1 条目格式 |
| R4 | README 断链删除后段落上下文不连贯 | 检查段落前后是否需要补充说明 |
| R5 | git 提交未发生 | 暂不 commit，由用户决定何时 commit（推荐作为 1 个 commit："chore(v0.6.2): 版本收敛"） |

---

## 进度追踪

| 步骤 | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| A 版本 bump | ⏳ 未开始 | — | — |
| B AGENTS.md | ⏳ 未开始 | — | — |
| C oxn-system.md | ⏳ 未开始 | — | — |
| D README ×2 | ⏳ 未开始 | — | — |
| E en/roadmap.md | ⏳ 未开始 | — | — |
| F zh-cn/roadmap.md | ⏳ 未开始 | — | — |
| G CHANGELOG ×2 | ⏳ 未开始 | — | — |
| H .changes fragment | ⏳ 未开始 | — | — |
| I version-check.ts | ⏳ 未开始 | — | — |
| J 断链修复 | ⏳ 未开始 | — | — |
| 验证 | ⏳ 未开始 | — | — |

---

## 附录：grilling #8 发现的 20 处漂移

| # | 制品 | 声称 | 实际 | 严重度 | 本计划处理 |
|---|---|---|---|---|---|
| 1 | `package.json` ×3 | 0.6.1 | v0.7 doc refactor 已 commit | High | A（bump 0.6.2） |
| 2 | `docs/product/en/roadmap.md` | v0.1.2 | package.json = 0.6.1 | **CRITICAL** | E（stale banner） |
| 3 | `docs/product/zh-cn/roadmap.md` | v0.6.1 | 不提 v0.7 | Medium | F（改 0.6.2） |
| 4 | `AGENTS.md` | "v0.7 已落地" | package.json 0.6.1 | High | B（17 处 v0.7→0.6.x） |
| 5 | `oxn-system.md` roadmap | "v0.7 Phase 5" | package.json 0.6.1 | High | C（改 0.6.x） |
| 6 | Git tags | v0.4.0 | HEAD 有 0.6.1+v0.7 | **CRITICAL** | 不处理（V6 不补） |
| 7 | README npm 表 | v0.5.0/v0.6.0 "已发布 npm" | 无 tag | High | D（修正） |
| 8 | CHANGELOG.md | 缺 0.4.0/0.5.0/0.6.0 | 只有 5 条 | High | G（加指引） |
| 9 | CHANGELOG.md 0.2.0 | "2026-06-XX" | 占位符 | Low | 不处理（不影响当前版本） |
| 10 | CHANGELOG.md L39 | `bunx @istuen/openxenon@0.6.1` | 不在 npm | Medium | 不处理（V6 不发 npm） |
| 11 | `.changes/0-7-*.md` | future dates | 未来路线图 | Medium | 不变更 |
| 12 | README L146 断链 | 链接不存在 | — | High | D（删除） |
| 13 | `.changes/0-6-0-iap-refactor.md` 断链 | 同上 | — | High | J（修复） |
| 14 | AGENTS.md v0.3 段 | "🟡 RFC 待拍板" | 已发版 | Medium | B（标 ✅ 已完成） |
| 15 | `.changes/0-6-1-pr4-langium-freeze.md` | "v0.7.0 切割" | 已在 0.6.1 删 | Medium | 不处理（chang history 不改） |
| 16 | `version-check.ts` | 4 文件 | 漏 11+ | High | I（扩展） |
| 17 | npm scope | @istuen vs @openxenon | 两个 scope | Low | 不处理 |
| 18 | 分支 | `feat/v0.6.1` | v0.7 commit 在 v0.6.1 分支 | Medium | 不处理（分支策略） |
| 19 | `bunfig.toml` L27 | "Verified: 2026-01" | 过期 | Low | 不处理 |
| 20 | `0-6-1-ideal-data-flow.md` | "原 v0.7.3 命名" | 版本号渗透 | Medium | 不处理（历史 changelog） |

---

*本计划是流动草稿，执行过程中如遇偏差可直接编辑更新。*