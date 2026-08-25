# Diagnose: fix-oxn-validation-gate-sync

> 诊断证据 — Bug 复现 + 根因定位 + 触发链
> 创建于：diagnose task (T1)
> 更新于：locate task (T2)

## T1 Diagnose — 三处 Bug 复现

### Bug 1: E_ASSET_RFC_ADR_CITATION 误伤合法引用

**复现命令**:
```bash
bun scripts/check-asset-structure.ts
```

**实际输出**:
```
[asset-structure] checked=28 passed=27 violations=1
  ✗ [E_ASSET_RFC_ADR_CITATION] /Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-probe-domain.md:61:
    Asset 正文引用了 RFC/ADR 编号文档（RFC-0032）；
    Asset 不反向引用 RFC/ADR（v3.2 引用方向守门）。
    Asset 自身即 SSOT，删除此引用或降级为概念术语提及。
```

**期望**: 当 Domain Theorem 用 `RFC-NNNN DXX` 形式引用某 RFC 的具体 Decision（如 `RFC-0032 D25 删 Proof`），不应触发——这是「指向决策点」而非「反向引用文档」。

**触发源**:
- 文件: `.openxenon/assets/domains/oxn-probe-domain.md`
- 行号: 61（`### ProbeIsNotSovereignVerification` Term 的第一条 bullet）
- 原文: `- 禁止 Probe 承担主权验证角色——不产 frozen.json（**RFC-0032 D25 删 Proof**）...`

**根因**: `scripts/check-asset-structure.ts:566`
```ts
const RFC_ADR_NUMBERED = /\b(?:RFC|ADR)-\d{3,4}\b/
```
正则未区分「完整文档引用」（如 `[RFC-0032](docs/rfc/...)`）与「D-section 决策点引用」（如 `RFC-0032 D25`）。当前正则命中后者 → 误伤。

**对比豁免清单**（同文件 line 562-565）:
- ✅ RFC-XXXX 占位符（doc-md-domain 追踪标记）
- ✅ docs/rfc/zh-cn/RFC-XXXX-<theme>.md 路径模板
- ✅ 无编号的 "RFC" / "ADR" 字样
- ❌ **缺**：`RFC-NNNN D[0-9]+` 形式（Decision 编号引用）

---

### Bug 2: domain-compiler DOMAIN_CATEGORIES 与 v2 结构不同步

**复现命令**:
```bash
oxn asset validate oxn-probe-domain --kind domain
```

**实际输出**（截前 5 行）:
```
✗ Asset 'oxn-probe-domain' (domain) invalid:
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Concept' for entity type 'domain'. Allowed: Terms, Bans, Invariants (line 26)
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Concept' for entity type 'domain'. Allowed: Terms, Bans, Invariants (line 31)
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Concept' for entity type 'domain'. Allowed: Terms, Bans, Invariants (line 36)
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Forbidden' for entity type 'domain'. Allowed: Terms, Bans, Invariants (line 61)
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Boundary' for entity type 'domain'. Allowed: Terms, Bans, Invariants (line 82)
  ...
  (共 19 个 E_MD_CATEGORY_UNKNOWN)
```

**期望**: Domain v2 使用 `## Group → ### Axiom → - Theorem` 结构，Group 名是 free-form（`Concept` / `Forbidden` / `Boundary` / `Practice` / `Foundation` / `Phases` / ...）。这些都应被接受。

**触发源**:
- 文件: `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts`
- 行号: 43
- 原文:
  ```ts
  export const DOMAIN_CATEGORIES = ['Terms', 'Bans', 'Invariants'] as const
  ```

**根因**: domain-compiler 是 legacy .oxn 编译器，但 v0.7+ 已统一走 .md pipeline（`md-pipeline/transformers/domain.ts`）。后者已经有 `GROUP_TO_CATEGORY` 映射（line 53-71）覆盖 free-form Group 名，但前者未跟上迁移，仍用 v1 三分类。

**对比 evidence**:
- `packages/engine/src/oxl/md-pipeline/transformers/domain.ts:53-71` 已定义 14 个 Group 名的 mapping → 但只用于 IR 抽取，未用于 validate。
- `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts:43` 是 validate 入口（`compiler.validate()` line 241）→ 仍用旧白名单。

---

### Bug 3: check-heading-skeleton 静默跳过 rfc/ 子目录

**复现命令**:
```bash
bun scripts/check-heading-skeleton.ts .openxenon/drafts/rfc/
```

**实际输出**:
```json
{
  "checked": 0,
  "passed": 0,
  "failed": [],
  "skipped": 0,
  "errors": []
}
```

**期望**: `.openxenon/drafts/rfc/` 下若有 `rfc-NNNN-<slug>.md` 文件，应被检查 RFC 骨架（required: `## 决策要点` / `## 影响范围` / `## 相关术语` / `## 相关决策` / `## Errata`）。

**根因**: `scripts/check-heading-skeleton.ts:99-127` `checkDirectories()` 函数：
```ts
for (const entry of entries) {
  const fullPath = join(dir, entry)
  // ...
  if (st.isFile() && fullPath.endsWith('.md')) {
    // ... 检查 ...
  }
  // 跳过子目录（如 rfc/）以避免重复检查   ← BUG
}
```

注释自己写「跳过子目录」是错的——脚本自己的 `draftTypeFromPath()` (line 87) 显式声明处理 `rfc/` 子目录路径（`rfc/rfc-XXXX-<slug>.md` → 'rfc'），且 `DRAFT_SPECS.rfc` 有完整 required 骨架。当前实现等于完全旁路了 RFC Draft 的骨架检查。

**触发路径示例**（contract vs 现实）:
| 路径 | contract (按 `draftTypeFromPath`) | reality (按 `checkDirectories`) |
|---|---|---|
| `drafts/rfc/rfc-0042-foo.md` | type=rfc → required 骨架检查 | 跳过（不递归） |
| `drafts/design-foo.md` | type=design → optional 检查 | 检查 ✓ |
| `drafts/issue-foo.md` | type=issue → required 检查 | 检查 ✓ |
| `drafts/report-foo.md` | type=report → optional 检查 | 检查 ✓ |

---

## T2 Locate — git-blame + 行号定位

### Bug 1: scripts/check-asset-structure.ts:566-577

| 行号 | commit | author | date | 说明 |
|---|---|---|---|---|
| 560-577 | `eb6395a3` | Test | 2026-08-11 16:46:24 +0800 | 「v3.2 引用方向守门」整段（含正则 + 错误信息） |
| 562-565 | `eb6395a3` | 同上 | 同上 | 豁免清单注释（占位符 / 路径模板 / 无编号字样） |

**commit message**: `refactor(meta): v0.7.0 RFC-0030 + RFC/ADR 历史溯源收敛`

**修复 target**:
- 改 line 566 正则 → 兼容 `RFC-NNNN D[0-9]+` Decision 引用
- 改 line 562-565 豁免注释 → 补 D-section 豁免

### Bug 2: packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts:43

| 行号 | commit | author | date | 说明 |
|---|---|---|---|---|
| 43 | `819fe90a` | Test | 2026-07-14 11:57:39 +0800 | `DOMAIN_CATEGORIES = ['Terms', 'Bans', 'Invariants']` 三分类白名单 |
| 39-43 | `819fe90a` | 同上 | 同上 | 「v0.4 PR-A 软推荐已废弃」注释（删 Stack / Externals） |

**修复 target**:
- 改 line 43 → 与 `transformers/domain.ts:53-71` GROUP_TO_CATEGORY 对齐（14 个 free-form Group 名）

### Bug 3: scripts/check-heading-skeleton.ts:99-130

| 行号 | commit | author | date | 说明 |
|---|---|---|---|---|
| 99-130 | `a73c8097` | Test | 2026-06-15 22:44:33 +0800 | 原 `checkDirectories` 循环（顶层 entries only） |
| 109-124 | `42ad7609` | Test | 2026-08-09 19:19:24 +0800 | 加 `draftTypeFromPath` + `DRAFT_SPECS` 处理；但未触原始循环 |
| 126 行注释 | `a73c8097` | 同上 | 同上 | 错的「跳过子目录（如 rfc/）以避免重复检查」 |

**commit message**: `refactor(scripts): v0.7.5 sync 11 gates — Phase A 现代化 + Phase B 元数据 + Phase C 接入`

**修复 target**:
- 改 `checkDirectories` 用 DFS 递归 walk 子目录
- 跳过 `.archived/`（约定不检查归档）
- 删 line 126 错误注释

---

## T3 Verify — fix 后重跑三处复现命令

### Bug 1 验证

**命令**: `bun scripts/check-asset-structure.ts`

**修复前**:
```
[asset-structure] checked=28 passed=27 violations=1
  ✗ [E_ASSET_RFC_ADR_CITATION] /.../oxn-probe-domain.md:61: ...
```

**修复后**:
```
[asset-structure] checked=28 passed=28 violations=0
```

✅ 通过

### Bug 2 验证

**命令**: `oxn asset validate oxn-probe-domain --kind domain`

**修复前**:
```
✗ Asset 'oxn-probe-domain' (domain) invalid:
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Concept' ... (line 26)
  - E_MD_CATEGORY_UNKNOWN: Unknown H2 category 'Concept' ... (line 31)
  ... (共 19 个 E_MD_CATEGORY_UNKNOWN)
```

**修复后**:
```
[Asset.validate]  WARN  abstract field missing ...
[Asset.validate]  WARN  auditTrail comment missing ...
✗ Asset 'oxn-probe-domain' (domain) invalid:
  - abstract field missing (recommended: 1-line business boundary description)
  - auditTrail comment missing (add // auditTrail: created by <name> at <time>)
```

E_MD_CATEGORY_UNKNOWN 全部消失。剩余 abstract/auditTrail 警告是 4 字段警告（Asset.validate 的 fail-open 设计），与本次 Bug 2 修复无关。
✅ 通过

### Bug 3 验证

**临时复现环境**: `/tmp/test-rfc-recursion/.openxenon/drafts/`
- `rfc/rfc-test-001.md` (完整 RFC skeleton: 5 项 required)
- `rfc/rfc-test-002.md` (缺 3 项 required)

**修复前**: `checked=0, passed=0` （rfc/ 子目录被跳过，完全没检查）

**修复后**:
```json
{
  "checked": 2,
  "passed": 1,
  "failed": ["/tmp/test-rfc-recursion/.openxenon/drafts/rfc/rfc-test-002.md"],
  "errors": [{"file": ".../rfc/rfc-test-002.md", "missing": ["## 相关术语", "## 相关决策", "## Errata"]}]
}
```

✅ 通过

### 回归三关

| 关 | 命令 | 结果 |
|---|---|---|
| lint | `bun run check` | 4 pre-existing errors（在 packages/engine/src/Version/manager.ts 等不相关位置）+ 1 warning + 1 info；我动的文件 0 新增 |
| typecheck | `bun run typecheck` | 0 errors |
| test | `bun test` | 1849 pass + 3 pre-existing failures（用 git stash 确认 pre-existing）|

**新增/更新测试**:
- `scripts/__tests__/check-heading-skeleton.test.ts` — 4 cases (3 改 + 1 修复)
- `scripts/__tests__/check-asset-structure.test.ts` — 🆕 7 cases 正则测试
- `packages/engine/src/oxl/md-bridge/__tests__/compilers/domain-compiler.test.ts` — 2 cases 更新 + 2 cases 新增

总计 31 cases pass。

### 文件改动清单

| 文件 | 行数 | 类型 |
|---|---|---|
| `scripts/check-asset-structure.ts` | +6 -2 | Bug 1 修复 + 豁免注释 |
| `packages/engine/src/oxl/md-pipeline/transformers/domain.ts` | +8 -1 | 暴露 VALID_DOMAIN_GROUP_NAMES |
| `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts` | +12 -7 | Bug 2 修复 + import + 注释更新 |
| `scripts/check-heading-skeleton.ts` | +52 -10 | Bug 3 修复：递归 walk + .archived 跳过 |
| `scripts/__tests__/check-heading-skeleton.test.ts` | 重写 | v0.7.5+ 路径适配 + rfc/ 递归 case |
| `scripts/__tests__/check-asset-structure.test.ts` | 🆕 | Bug 1 回归 7 cases |
| `packages/engine/src/oxl/md-bridge/__tests__/compilers/domain-compiler.test.ts` | +18 -6 | Bug 2 回归：Stack legal + Concept/Forbidden/Boundary + Practice/Foundation/Quality |
