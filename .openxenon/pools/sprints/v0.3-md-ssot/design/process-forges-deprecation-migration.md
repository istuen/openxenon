# forges/ 废弃与 51 文档迁移到 pools/ 计划

> **日期**：2026-06-20
> **状态**：初稿
> **目的**：将 `.openxenon/forges/` 51 个文档按用途映射至 `.openxenon/pools/`（5 类池）

---

## 0. 背景

- `.openxenon/forges/` 已有 31 top-level + 20 sprints/ = **51 .md**
- AGENTS.md 宣告："**forges/ 计划于 v0.1.x 升级为 `.openxenon/pools/` Intent Pool**"
- T13 (v0.2.0 commit `16fb880`) 已建 5 池：`research/` `design/` `issue/` `audit/` `journal/`
- **但 forges/ 物理目录仍在**，51 文档未迁移
- v0.3 MD-SSOT 决策要求 forges/ 物理删除

**关键确认（2026-06-20）**：
- `pools/` = `forges/` 升级版
- forges/ 文档迁移目标 = pools/ 对应池
- 保留当前 `.openxenon/` 目录结构

---

## 1. 总体迁移策略

### 1.1 三阶段执行

| 阶段 | 行为 | 时间 |
|---|---|---|
| **A. 加 DEPRECATED 标** | 51 文档头部加 "本设计稿已迁移至 X" 区块 | 1 天 |
| **B. 复制到新位置** | 按映射表复制到 `.openxenon/pools/` 对应池 | 1-2 天 |
| **C. 物理删除 forges/** | 备份到 `_archive/2026-06-forges/` 后 forges/ rm | 阶段 5 强制 |

### 1.2 备份策略

- 物理删除前：`forges/` 整体复制到 `_archive/2026-06-forges/`（永久保留）
- `_archive/` 不受 .gitignore 影响
- 不可改 `_archive/` 内容

### 1.3 迁移工具（v0.2.0 已有 CLI）

v0.2.0 源码已实现 `oxn pool create` CLI（T13 同步实施），可用于阶段 B 复制：

```bash
# 创建单个 pool 资产
oxn pool create <pool> <slug> --title "<title>" --content "<markdown>"
# 例：
oxn pool create design md-ssot-system --title "MD-SSOT 系统架构" --content "$(cat md-ssot-system.md)"

# 5 池：research / design / issue / audit / journal
# slug：kebab-case
# content：MD 内容（默认 `## Why\n\n## How\n\n` 模板）
```

**自动化迁移脚本**（基于 `oxn pool create`）：

```bash
# scripts/migrate-forges.ts 内部循环
for [src, dst] in migration_map:
  if dst starts with 'pools/':
    pool, slug = parse dst
    content = read src
    spawn('oxn pool create', pool, slug, '--content', content)
```

**优点**：
- 利用现有 CLI，无需写新 IO 代码
- 走 `L1-Infra/filesystem.ts` 收口（不破坏 L0-Processor 兰姆达真空）
- 复用 T13 实施的 5 池校验

---

## 2. 完整迁移映射表

### 2.1 sprints/ 子目录（20 篇）→ `pools/audit/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/sprints/sprint-1/*.md` | `pools/audit/retro-v0.2.0-sprint-1/` | v0.2.0 sprint 1 复盘 |
| `forges/sprints/sprint-2/*.md` | `pools/audit/retro-v0.2.0-sprint-2/` | v0.2.0 sprint 2 复盘 |
| `forges/sprints/sprint-3a/*.md` | `pools/audit/retro-v0.2.0-sprint-3a/` | v0.2.0 sprint 3a 复盘 |
| `forges/sprints/sprint-3b/*.md` | `pools/audit/retro-v0.2.0-sprint-3b/` | v0.2.0 sprint 3b 复盘 |
| `forges/sprints/sprint-3c/*.md` | `pools/audit/retro-v0.2.0-sprint-3c/` | v0.2.0 sprint 3c 复盘 |
| `forges/sprints/sprint-3d/*.md` | `pools/audit/retro-v0.2.0-sprint-3d/` | v0.2.0 sprint 3d 复盘 |
| `forges/sprints/sprint-4/*.md` | `pools/audit/retro-v0.2.0-sprint-4/` | v0.2.0 sprint 4 复盘 |
| `forges/sprints/sprint-5a/*.md` | `pools/audit/retro-v0.2.0-sprint-5a/` | v0.2.0 sprint 5a 复盘 |
| `forges/sprints/sprint-5b/*.md` | `pools/audit/retro-v0.2.0-sprint-5b/` | v0.2.0 sprint 5b 复盘 |
| `forges/sprints/sprint-5c/*.md` | `pools/audit/retro-v0.2.0-sprint-5c/` | v0.2.0 sprint 5c 复盘 |
| `forges/sprints/sprint-5d/*.md` | `pools/audit/retro-v0.2.0-sprint-5d/` | v0.2.0 sprint 5d 复盘 |
| `forges/sprints/sprint-6/*.md` | `pools/audit/retro-v0.2.0-sprint-6/` | v0.2.0 sprint 6 复盘 |
| `forges/sprints/sprint-7/*.md` | `pools/audit/retro-v0.2.0-sprint-7/` | v0.2.0 sprint 7 复盘 |
| `forges/sprints/sprint-8/*.md` | `pools/audit/retro-v0.2.0-sprint-8/` | v0.2.0 sprint 8 复盘 |
| `forges/sprints/sprint-9/*.md` | `pools/audit/retro-v0.2.0-sprint-9/` | v0.2.0 sprint 9 复盘 |
| `forges/sprints/EXECUTION-ORDER.md` | `pools/audit/retro-v0.2.0-execution-order.md` | v0.2.0 总执行顺序 |

**合计 16 个 sprint 目录 + 1 个 EXECUTION-ORDER = 17 路径**

### 2.2 top-level 已实施设计稿（7 篇）→ `pools/design/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-infra-io-layer-reorg.md` | `pools/design/dev-design-infra-io-layer-reorg-v0.2.0.md` | T1a/T1b 已实施 |
| `forges/2026-06-11-runtime-adapter-design.v0.3.md` | `pools/design/dev-design-runtime-adapter-v0.1.6.md` | v0.1.6 已实施 |
| `forges/2026-06-11-grammar-deps-fix-design.md` | `pools/design/dev-design-grammar-deps-fix-v0.0.28.md` | v0.0.28 已实施 |
| `forges/2026-06-14-probe-signal-taint-design.md` | `pools/design/dev-design-probe-signal-taint-v0.2.0.md` | T4-T7/T9 已实施 |
| `forges/2026-06-13-intent-pool-design.md` v3 | `pools/design/arch-intent-pool-v3-v0.2.0.md` | T8/T13 已实施 |
| `forges/2026-06-14-three-layer-proof-design.md` | `pools/design/dev-design-three-layer-proof-v0.2.0.md` | T11/T12 已实施 |
| `forges/2026-06-11-daemon-functional-design.md` | `pools/design/dev-design-daemon-functional-v0.2.0.md` | T14 已实施 |

### 2.3 top-level 早期设计稿（4 篇）→ `pools/design/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-v0.1.0-pre-publish-design.md` | `pools/design/process-pre-publish-v0.1.0.md` | v0.1.0 发布流程已实施 |
| `forges/2026-06-11-v0.0.27-pre-release-test-coverage.md` | `pools/design/dev-design-test-coverage-v0.0.27.md` | v0.0.27 设计 |
| `forges/2026-06-11-v0.0.27-product-audit.md` | `pools/design/audit-product-v0.0.27.md` | v0.0.27 审计 |
| `forges/2026-06-11-probe-mount-system-design.md` | `pools/design/dev-design-probe-mount-v0.0.25.md` | 早期设计 |

### 2.4 top-level 审计/分析（10 篇）→ `pools/audit/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-i18n-version-drift.md` | `pools/audit/audit-i18n-version-drift-v0.1.0.md` | i18n 漂移审计 |
| `forges/2026-06-12-c2-retraction.md` | `pools/audit/retro-c2-retraction-v0.1.0.md` | C2 撤回 |
| `forges/2026-06-12-code-quality-pattern-and-logic.md` | `pools/audit/audit-code-quality-v0.1.0.md` | v0.1.0 代码质量 |
| `forges/2026-06-12-phase-c-i18n-full-coverage.md` | `pools/audit/audit-phase-c-i18n-v0.1.5.md` | v0.1.5 i18n 阶段 C |
| `forges/2026-06-12-work-cli-interaction-improvements.md` | `pools/audit/audit-work-cli-improvements-v0.1.x.md` | work CLI 交互 |
| `forges/2026-06-16-ponytail-analysis.md` | `pools/audit/audit-ponytail-v0.1.8.md` | v0.1.8 ponytail |
| `forges/2026-06-11-infra-v0-to-v1.1-state-diff.md` | `pools/audit/audit-infra-v0-v1.1-state-diff.md` | v0→v1.1 状态机差异 |
| `forges/2026-06-11-rename-oxn-dsl-to-oxl.md` | `pools/audit/audit-oxn-rename-v0.1.0.md` | DSL→OXL 重命名 |
| `forges/2026-06-12-product-manual-ssot-design.md` | `pools/audit/audit-product-manual-ssot-v0.1.0.md` | 文档 SSOT 设计 |
| `forges/2026-06-12-docs-site-v0.1.0-final.md` | `pools/audit/audit-docs-site-v0.1.0-final.md` | v0.1.0 文档站定稿 |

### 2.5 top-level 已有引用价值（1 篇）→ `blueprints/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-git-workflow-workspace.md` | `blueprints/git-workflow.md` | **是 Blueprint 形态**（已批准实施）|

### 2.6 top-level 设计稿基石（2 篇）→ `pools/design/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md` | `pools/design/arch-domain-as-ssot-2026-06-17.md` | Domain SSOT 设计基石 |
| `forges/2026-06-18-md-as-canonical-rewrite-design.md` | `pools/design/arch-md-as-canonical-rewrite-2026-06-18.md` | 路线 C v1（v0.3 v2 升级前历史）|

### 2.7 top-level 已废弃（3 篇）→ `_archive/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-runtime-adapter-design.v0.2.deprecated.md` | `_archive/2026-06-forges/` | 文件名已含 .deprecated |
| `forges/2026-06-18-md-as-friendly-view-spike-design.md` | `_archive/2026-06-forges/` | [DEPRECATED] 路线 A |
| `forges/2026-06-18-ddd-terms-decouple-oxl-grammar-design.md` | `_archive/2026-06-forges/` | [DEPRECATED] 路线 B |

### 2.8 top-level Work Journals（2 篇）→ `.openxenon/works/`

| 旧路径 | 新路径 | 理由 |
|---|---|---|
| `forges/2026-06-11-grammar-deps-fix-work-journal.md` | `works/grammar-deps-fix/journal.md` | work journal 归 align |
| `forges/2026-06-11-pre-release-test-coverage-work-journal.md` | `works/pre-release-test-coverage-v0-0-27/journal.md` | work journal 归 align |

---

## 3. 汇总统计

| 目标位置 | 数量 | 占比 |
|---|---|---|
| `.openxenon/pools/audit/<v>/` | 27（17 sprint + 10 audit）| 53% |
| `.openxenon/pools/design/<v>/` | 13（7 dev-design + 4 design + 2 arch）| 25% |
| `.openxenon/blueprints/` | 1 | 2% |
| `.openxenon/align/work/<w>/` | 2 | 4% |
| `_archive/2026-06-forges/` | 3 | 6% |
| `.changes/0-0-X-*.md` 重组为 `pools/audit/`（阶段 5）| 5 | 10% |
| **合计** | **51** | **100%** |

**说明**：
- 27 文档进 `pools/audit/`（主要是 sprints/ 复盘 + 已执行审计）
- 13 文档进 `pools/design/`（已实施的设计稿 + 架构基石）
- 1 文档进 `blueprints/`（git-workflow）
- 2 文档进 `align/work/`（work journal 归位）
- 3 文档进 `_archive/`（已废弃）
- 5 文档为 .changes/ 历史重组（阶段 5）

---

## 4. DEPRECATED 标头模板（阶段 A）

每个被迁移的 forges/ 文档头部加：

```markdown
# <原标题> [DEPRECATED 2026-06-20]

> **DEPRECATED 2026-06-20**：本设计稿已迁移至 `<新路径>`。保留为历史参考，不作为实施依据。
> 完整迁移计划：`.openxenon/pools/design/process-forges-deprecation-migration.md`
>
> ---
>
> **原内容**（保留）：
>
> <原 markdown 内容>
```

---

## 5. 迁移脚本

### 5.1 `scripts/migrate-forges.ts`（新）

```ts
interface MigrateOptions {
  dryRun: boolean;          // true = 只打印，不改文件
  phase: 'A' | 'B' | 'C';   // A=标头, B=复制, C=删除
}

async function migrate(opts: MigrateOptions) {
  const map = await loadMigrationMap();  // 加载 §2 表格
  for (const [src, dst] of Object.entries(map)) {
    if (opts.phase === 'A') {
      await prependDeprecationHeader(src, dst);
    } else if (opts.phase === 'B') {
      await copyWithHeaderUpdate(src, dst);
    } else if (opts.phase === 'C') {
      await deleteFromForges(src);
    }
  }
}
```

### 5.2 执行序列

```bash
# 阶段 A：标 DEPRECATED 标头（不动位置）
bun run scripts/migrate-forges.ts --phase A --dry-run  # 预览
bun run scripts/migrate-forges.ts --phase A            # 执行

# 阶段 B：复制到新位置（pools/）
bun run scripts/migrate-forges.ts --phase B --dry-run
bun run scripts/migrate-forges.ts --phase B

# 备份
cp -r .openxenon/forges _archive/2026-06-forges/

# 阶段 C：物理删除 forges/
bun run scripts/migrate-forges.ts --phase C --dry-run
bun run scripts/migrate-forges.ts --phase C
```

---

## 6. .gitignore 调整

```gitignore
# 现有（保留）
.openxenon/forges/

# v0.3 阶段 5 调整：forges/ 已删除，删除该行
# 同时新增：
.openxenon/align/work/*/state.json
.openxenon/proofs/*/verdict.json.lock
```

**v0.3 阶段 5 前**：
- forges/ 仍 gitignored（运行时数据）
- 不影响 v0.2/v0.3 早期

**v0.3 阶段 5 后**：
- forges/ 行删除
- 新增 4 类目录的 gitignore 规则
- pools/ 设计池的入仓决策（待定）

---

## 7. 时间表

| 阶段 | 工作量 | 时间 |
|---|---|---|
| A. DEPRECATED 标头 | 1 天 | W0 |
| B. 复制 51 文档 | 1-2 天 | W7-8（与 v0.3 阶段 3 并行）|
| C. 物理删除 | 0.5 天 | 阶段 5 强制 |

---

## 8. 下一步

- [ ] 写 `l0-l3-alignment.md`（L0–L3 兼容性）
- [ ] 阶段 A：执行 `migrate-forges --phase A`
- [ ] 阶段 B：执行 `migrate-forges --phase B`（与 v0.3 阶段 3 同步）
- [ ] 阶段 C：v0.3 阶段 5 物理删除

---

**关联文档**：
- [`md-ssot-system.md`](./md-ssot-system.md)
- [`v0.3.0-roadmap.md`](./v0.3.0-roadmap.md)
- [`process-version-iteration-flow.md`](./process-version-iteration-flow.md)
- [`l0-l3-alignment.md`](./l0-l3-alignment.md)
- [`naming-system.md`](./naming-system.md)
