# OpenXenon 文档命名体系 v1.0

> **日期**：2026-06-20
> **状态**：v1.0（与 `md-ssot-system.md` v2 配套）
> **覆盖**：当前 `.openxenon/` 目录结构下的所有 MD 资产命名规则
>
> ⚠️ **v0.3 范围**：本文档**仅作历史/参考保留**，不进入 v0.3 实施范围。
> 命名规范 CI 校验、命名变更影响分析等关联任务**推迟至 v0.4.0 规划**。
> v0.3 仅保留文档本身（v0.3 阶段 1 + 阶段 2 不依赖本文档）。

---

## 0. 命名原则

| 原则 | 含义 |
|---|---|
| **可排序** | 文件名按字典序排序时，与发布/阅读顺序一致 |
| **可搜索** | `grep` 一组关键字能精准定位 |
| **稳定** | 状态变化不引发重命名（用后缀） |
| **可读** | AI 与人类都能解析 |
| **简短** | 单文件名 ≤ 50 字符 |

---

## 1. 文件名格式

### 1.1 通用格式

```
[<scope>-]<topic-slug>[@<status>][-v<X.Y.Z>].md
```

| 段 | 可选 | 取值 |
|---|---|---|
| `<scope>` | 可选 | `arch` / `dev-design` / `process` / `plan` / `req` / `test-design` / `product` / `retro` / `journal` / `audit`（详见 §2）|
| `<topic-slug>` | 必填 | kebab-case，2-5 词；描述文档主题 |
| `<status>` | 可选 | `@draft` / `@current` / `@stable` / `@deprecated` / `@archived`（详见 §3）|
| `-v<X.Y.Z>` | 可选 | semver；仅当文档**强绑定**某版本时使用（详见 §4）|

### 1.2 示例

| 文件名 | 含义 |
|---|---|
| `v0.3.0-roadmap.md` | v0.3.0 路线图，current 状态 |
| `md-ssot-system.md` | MD-SSOT 系统架构，current 状态 |
| `process-version-iteration-flow.md` | 版本迭代流（流程类），current 状态 |
| `l0-l3-alignment.md` | L0–L3 架构对齐，current 状态 |
| `req-md-ssot-v0.3.0.md` | v0.3.0 阶段需求（MD-SSOT 体系）|
| `audit-v0.2.0-md-ssot-readiness.md` | v0.2.0 MD-SSOT 准备度审计 |

---

## 2. `<scope>` 类型表

`<scope>` 表达**文档类型**，与所在目录语义对应（v0.2.0 目录结构）。

| scope | 含义 | 主要目录 | 示例 |
|---|---|---|---|
| `arch` | 架构决策 | `pools/design/` | `arch-md-ssot-system.md` |
| `dev-design` | 开发设计 | `pools/design/` | `dev-design-md-ssot-implementation-v0.3.0.md` |
| `process` | 流程/操作手册 | `pools/design/` | `process-version-iteration-flow.md` |
| `plan` | 路线图/计划 | `pools/design/` | `plan-v0.3.0-roadmap.md` |
| `req` | 需求分析 | `pools/design/` | `req-md-ssot-v0.3.0.md` |
| `test-design` | 测试设计 | `pools/design/` | `test-design-md-ssot-v0.3.0.md` |
| `product` | 产品设计 | `pools/design/` | `product-md-ssot-overview-v0.3.0.md` |
| `retro` | 复盘/回顾 | `pools/audit/` | `retro-v0.2.0-sprint-1.md` |
| `journal` | 关键事件日志 | `pools/journal/` | `journal-2026-06-20-md-ssot-decision.md` |
| `audit` | 审计报告 | `pools/audit/` | `audit-v0.2.0-md-ssot-readiness.md` |

**规则**：
- `<scope>` 应与所在目录**对齐**
- 若 `<scope>` 与目录重复，可省略（保持简洁）
- ~~例外：跨切文档可放 `design/architecture/`（v0.3.0+ 已废弃，统一进 `pools/design/`）~~

---

## 3. `<status>` 状态后缀

### 3.1 5 状态机

| 状态 | 含义 | frontmatter 等价 | 物理位置 |
|---|---|---|---|
| `@draft` | 起草中，未评审 | `status: draft` | 当前位置 |
| `@current` | 评审通过，是当前权威 | `status: approved` | 当前位置 |
| `@stable` | 已实施 + 验证，跨版本稳定 | `status: implemented` | 当前位置 |
| `@deprecated` | 已被替代，保留为历史 | `status: deprecated` + `replaced-by: <new>` | 当前位置 |
| `@archived` | 彻底退役 | `status: archived` | `_archive/` |

### 3.2 状态转换

```
@draft ──→ @current ──→ @stable
                ↓
            @deprecated ──→ @archived
```

### 3.3 何时加后缀

**默认不加**：所有 current 文档**不写** `@current`（避免冗余）

**何时加**：
- `@draft`：起草中的文档
- `@deprecated`：已废弃但保留阅读
- `@archived`：进入 `_archive/`

### 3.4 frontmatter 等价

每个 MD 资产仍包含 frontmatter：

```yaml
---
version: 0.3.0
status: current        # 等价于文件名后缀
type: architecture
author: opencode
date: 2026-06-20
---
```

**状态单一来源**：
- **文件名后缀** = 物理可观察状态（`ls` 即知）
- **frontmatter status** = 语义状态（AI 解析时读）
- 两者必须一致

---

## 4. `<version>` 编号规则

### 4.1 三类文档的版本策略

| 文档类型 | 是否带 `-v<X.Y.Z>` | 理由 |
|---|---|---|
| **跨切架构/流程**（如 `md-ssot-system.md`）| **不带** | 适用于所有版本 |
| **版本特定路线图**（如 `v0.3.0-roadmap.md`）| **必带** | 强绑定 v0.3.0 |
| **版本特定实现/审计**（如 `v0.2.0-sprint-1.md`）| **必带** | 不可跨版本复用 |

### 4.2 版本号与发版号同步

- 文档版本号 = `package.json` version
- 发版前 `version:check` 验证一致性
- 同一文档的 v0.X → v0.Y 演进：旧版本加 `@archived` 后缀，新版本新建

---

## 5. 当前 `.openxenon/` 各目录的命名模式

### 5.1 `domains/`（IAP Intent 业务规则）

```
<DomainName>.md
```

- **PascalCase**（DDD 惯例）
- 与现有 `domains/*.oxn` 命名一致
- 例：`OrderContext.md`, `MD-SSOT-System.md`, `AuthContext.md`

### 5.2 `blueprints/`（IAP Intent 技术模式）

```
<blueprint-name>.md
```

- **kebab-case**
- 例：`dev-workflow.md`, `git-workflow.md`, `v0.3-md-ssot-implementation.md`

### 5.3 `works/<work-name>/`（IAP Align 编排空间）

```
work.md                # 主工作 MD
tasks/<task-name>.md   # 每个 task
state.json             # 8 阶段状态机
```

- `<work-name>`：kebab-case，从 frontmatter `work:` 字段提取
- 例：`v0-3-md-ssot/work.md`, `v0-3-md-ssot/tasks/spike.md`

### 5.4 `proofs/<proof-name>/`（IAP Proof 验证产物）

```
verdict.md        # 人类可读
verdict.json      # 机器可读
```

- `<proof-name>`：kebab-case
- 例：`auth-impl/verdict.md`

### 5.5 `pools/<type>/`（forges/ 升级版；5 类池）

```
pools/
├── research/        # 调研
│   └── <doc>.md
├── design/          # 设计、架构、需求、测试设计
│   └── <doc>.md
├── issue/           # 问题
│   └── <doc>.md
├── audit/           # 审计
│   └── <doc>.md
└── journal/         # 日志
    └── <doc>.md
```

- `<doc>`：按主题命名（kebab-case）
- 例：`pools/design/2026-06-20-md-ssot-decision.md`, `pools/audit/v0.2.0-pre-release.md`

### 5.6 `pools/design/`（v0.3 阶段文档）

```
pools/design/
├── req-<name>-v<X.Y.Z>.md
├── dev-design-<topic>-v<X.Y.Z>.md
├── test-design-<topic>-v<X.Y.Z>.md
├── product-<name>-v<X.Y.Z>.md
└── arch-<topic>-v<X.Y.Z>.md        # 架构设计也放 design 池
```

### 5.7 `pools/journal/`

```
YYYY-MM-DD-<event-slug>.md
```

- ISO 8601 日期前缀（保证字典序 = 时序）
- 例：`2026-06-20-md-ssot-decision.md`

### 5.8 `pools/audit/`

```
audit-v<X.Y.Z>-<name>.md
retro-v<X.Y.Z>-<name>.md
```

- `audit-` 用于正式审计
- `retro-` 用于 sprint 复盘（更轻量）
- 例：`audit-v0.2.0-md-ssot-readiness.md`, `retro-v0.2.0-sprint-1.md`

### 5.9 `forges/`（[DEPRECATED] 即将删除）

```
<doc>.md          # 51 个文档
sprints/<sprint>/<doc>.md
```

- 阶段 5 物理删除前：**保持现状**
- 阶段 5 物理删除时：全部迁移到 `pools/` 对应类型

---

## 6. 当前 6 文档的命名现状

### 6.1 已规范（保持不变）

| 文件 | 评价 |
|---|---|
| `v0.3.0-roadmap.md` | ✅ 已含版本号 + 简洁 |
| `md-ssot-system.md` | ✅ 简洁 |
| `l0-l3-alignment.md` | ✅ 简洁 |
| `naming-system.md` | ✅ 简洁（本文件）|

### 6.2 建议加 `process-` 前缀（流程类）

| 当前 | 建议 | 理由 |
|---|---|---|
| `version-iteration-flow.md` | `process-version-iteration-flow.md` | 明确是"流程/操作手册" |
| `forges-deprecation-migration.md` | `process-forges-deprecation-migration.md` | 明确是"流程"（执行计划） |

**决定**：**2 个文档加 `process-` 前缀**

---

## 7. 命名验证脚本

### 7.1 `scripts/check-naming.ts`（新）

```ts
const PATTERNS = {
  // 当前 .openxenon/ 目录规范
  'domains': /^[A-Z][A-Za-z0-9]*\.md$/,  // PascalCase
  'blueprints': /^[\w-]+\.md$/,         // kebab-case
  'works': /^work\.md$/,                   // 主工作文件
  'works/tasks': /^[\w-]+\.md$/,         // task 文件
  'proofs': /^verdict\.md$/,               // verdict 文件
  'pools/research': /^[\w-]+\.md$/,
  'pools/design': /^[\w-]+(-v\d+\.\d+\.\d+)?\.md$/,
  'pools/issue': /^[\w-]+\.md$/,
  'pools/audit': /^(audit|retro)-v\d+\.\d+\.\d+-[\w-]+\.md$/,
  'pools/journal': /^\d{4}-\d{2}-\d{2}-[\w-]+\.md$/,
  'design/architecture': /^(arch-|process-|v\d+\.\d+\.\d+-roadmap|[\w-]+)\.md$/,
};

function checkFileName(filepath: string, baseDir: string): boolean {
  const rel = path.relative(baseDir, filepath);
  const dir = path.dirname(rel);
  const file = path.basename(rel);
  
  const pattern = PATTERNS[dir];
  if (!pattern) {
    console.warn(`⚠️ ${rel}: 目录 ${dir} 无命名规范`);
    return false;
  }
  
  if (!pattern.test(file)) {
    console.error(`❌ ${rel}: 不符合 ${dir} 命名规范 ${pattern}`);
    return false;
  }
  
  return true;
}
```

### 7.2 lefthook pre-commit 集成

```yaml
pre-commit:
  commands:
    check:naming:
      glob: ".openxenon/**/!(forges)/*.md"
      run: bun run scripts/check-naming.ts {staged_files}
```

---

## 8. 命名决策记录

### 8.1 已决策

| 决策 | 结论 |
|---|---|
| 默认加 `@current` 后缀？ | ❌ 不加（current 是默认值）|
| `arch-` / `dev-design-` 前缀？ | 选 `process-`（流程类）；其他不加（目录已暗示）|
| 文件名是否带 `v<X.Y.Z>`？ | 跨切文档不带；版本特定文档必带 |
| frontmatter `status` vs 文件名后缀？ | 单一来源：filename > frontmatter（物理可观察优先）|
| `@archived` 后缀 vs `_archive/` 目录？ | 两者都使用 |
| forges/ → pools/ 迁移？ | 是（pools/ = forges/ 升级版）|

### 8.2 待决策

- [ ] `pools/design/<v>/` 子目录是否需要？（vs 全部平铺在 `pools/design/`）
- [ ] `pools/audit/` 中 audit 与 retro 的具体划分
- [ ] `proofs/<proof-name>/` 命名规则（用 work-name 还是 proof-name）

---

## 9. 迁移计划（v0.3 阶段 1-5）

| 阶段 | 工作 | 文件数 |
|---|---|---|
| 1 | 写本命名体系文档 | 1 |
| 1 | 写 `check-naming.ts` 脚本 | 1 |
| 1 | 重命名 2 个流程类文档 | 2 |
| 2 | 强制所有新建 MD 资产符合命名规范 | 0 |
| 2 | 写 6+ 个 v0.3.0 阶段文档 | ~10 |
| 3 | 51 forges/ 文档迁移到 pools/ | 51 |
| 4 | oxn-md CLI 集成命名校验 | 0 |
| 5 | forges/ 物理删除前最终命名审计 | 0 |

---

## 10. 关联文档

- [`md-ssot-system.md`](./md-ssot-system.md) — 系统架构
- [`v0.3.0-roadmap.md`](./v0.3.0-roadmap.md)
- [`version-iteration-flow.md`](./version-iteration-flow.md)
- [`forges-deprecation-migration.md`](./forges-deprecation-migration.md)（迁移到 pools/）
- [`l0-l3-alignment.md`](./l0-l3-alignment.md)

---

## 附录 A：完整命名示例集

### A.1 [DEPRECATED] 跨切架构（`design/architecture/` → `pools/design/`）

```
pools/design/（v0.3.0+ 唯一合法位置）
├── v0.3.0-roadmap.md                 # plan
├── md-ssot-system.md                # 跨切 arch
├── l0-l3-alignment.md               # 跨切 arch
├── process-version-iteration-flow.md    # 跨切 process
├── process-forges-deprecation-migration.md  # 跨切 process
└── naming-system.md                  # 跨切 arch（本文件）
```

### A.2 v0.3.0 阶段文档（`pools/design/`）

```
pools/design/
├── req-md-ssot-v0.3.0.md
├── dev-design-md-ssot-implementation-v0.3.0.md
├── dev-design-mdast-parser-v0.3.0.md
├── test-design-md-ssot-v0.3.0.md
├── product-md-ssot-overview-v0.3.0.md
└── arch-md-ssot-v0.3.0.md
```

### A.3 IAP Intent（`domains/` `blueprints/`）

```
domains/
├── OrderContext.md
├── MD-SSOT-System.md
├── AuthContext.md

blueprints/
├── dev-workflow.md
├── v0.3-md-ssot-implementation.md
└── git-workflow.md
```

### A.4 IAP Align（`works/` `pools/journal/`）

```
works/v0-3-md-ssot/
├── work.md
├── tasks/
│   ├── spike.md
│   ├── design.md
│   ├── implement.md
│   └── verify.md
└── state.json

pools/journal/
├── 2026-06-20-md-ssot-decision.md
├── 2026-06-20-v0.3-roadmap-anchored.md
└── 2026-06-21-process-forges-migration-kickoff.md
```

### A.5 IAP Proof（`proofs/` `pools/audit/`）

```
proofs/auth-impl/
├── verdict.md                        # 人类读
└── verdict.json                      # 机器读

pools/audit/
├── audit-v0.2.0-md-ssot-readiness.md
├── audit-v0.3.0-md-ssot-rollout.md
├── retro-v0.2.0-sprint-1.md
├── retro-v0.2.0-sprint-2.md
└── retro-v0.3.0-roadmap-execution.md
```

### A.6 pools/ 5 池示例

```
pools/
├── research/
│   └── 2026-06-15-unified-mdast-prior-art.md
├── design/
│   ├── req-md-ssot-v0.3.0.md
│   ├── dev-design-md-ssot-v0.3.0.md
│   ├── test-design-md-ssot-v0.3.0.md
│   ├── product-md-ssot-v0.3.0.md
│   └── arch-md-ssot-v0.3.0.md
├── issue/
│   └── 2026-06-20-mdast-bench-fail-issue-1.md
├── audit/
│   ├── audit-v0.2.0-md-ssot-readiness.md
│   ├── retro-v0.2.0-sprint-1.md
│   └── retro-v0.2.0-sprint-2.md
└── journal/
    ├── 2026-06-20-md-ssot-decision.md
    └── 2026-06-21-v0.3-roadmap-anchored.md
```
