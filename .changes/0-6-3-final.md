---
version: 0.6.3
prerelease: false
date: 2026-08-02
type: release-notes
scope: 0-6-3-final
status: shipped
---

# 0.6.3 Final — Draft Promote 实际写文件 + 域漂移修正 + ADR-0088 全部完成

> **状态**：🟢 **Shipped**（2026-08-02，Phase 1-4 全部完成）
> **总测试**：1971 pass / 0 fail / 0 skip（159 files）
> **wall-clock**：~35s（3 次平均）
> **关联 ADR**：ADR-0088（全部 11 phases done）

## 主题

v0.6.3 是 v0.6.2 的收官 alpha，包含 3 大块交付：

1. **Draft Promote NG6**：从 v0.6.2-alpha.3 的"仅返回 dispatch info"升级到 `--commit` 实际写文件
2. **域漂移修正**：4 个 Domain/Stack/Workflow 文件路径同步 + 7 skeleton 模板定位修复 + inv-5 推荐性
3. **ADR-0088 测试架构 11 phases 全部完成**（P0/P0d/P1/P2/P3/P4/P5/P6/P7/P8/P9）

## 关键变更

### 🆕 新增

| 特性 | 来源 | 落地文件 |
|---|---|---|
| `oxn draft promote --commit` 实际写目标文件 | RFC-0019 NG6 | `packages/engine/src/Draft/promote-dispatch.ts` |
| `oxn draft promote --force` 覆盖 | RFC-0019 NG6 | 同上 |
| `--target-dir <path>` 标志 | v0.6.3 Fix #2 | `packages/cli/src/commands/draft.ts` |
| `.oxnrc` draftPromote 配置（rfcDir/assetDirs/workDir） | v0.6.3 Fix #2 | `packages/engine/src/Draft/promote.ts` |
| `oxn init` 落地 7 skeleton 模板 | v0.6.3 Fix #1 | `packages/cli/src/init/builtin-skeleton-templates.ts` |
| `oxn draft retarget` 保留工程师 frontmatter | v0.6.3 Fix #3 | `packages/engine/src/Draft/retarget.ts` |
| 7 skeleton 模板 `entity: skeleton` 独立 entity | v0.6.3 Q1 | `builtin-skeleton-templates.ts` + boundary-guard probe |

### 🔧 修复

| Bug | 来源 | commit |
|---|---|---|
| 7 skeleton 模板错放在 `assets/blueprints/draft-skeletons/`（blueprint index 误拾取） | v0.6.3 Fix #1 | `10d623c` |
| `OXN_DRAFT_SKELETON_NOT_FOUND` 新项目阻塞 | v0.6.3 Fix #1 | `10d623c` |
| retarget 替换工程师 frontmatter | v0.6.3 Fix #3 | `10d623c` |
| tsconfig silent gap（232 错误 EXIT=0 假象） | ADR-0088 P0/P0d | `fd62346` |
| 17 Asset 模块源码 bug（silent ignore） | ADR-0088 P0b | `fd62346` |
| 2 个函数签名 silent ignore（resolveAssetFile / listAssetReferences） | ADR-0088 P0b | `fd62346` |
| CLI → src/daemon 跨包 leak（TS6059） | ADR-0088 P0c | `fd62346` |
| bunfig.toml 6 个幻影模块 glob（Intent/Align/Workflow/Domain/Stack/Daemon） | ADR-0088 P1 | `6eb3d4c` |
| shell-provider / shell-exec / ts-compiles 顶层 `mock.module` 污染 | RFC-0015 D5.2 | `495ebd3` |

### 🔄 重构

| 重构 | 来源 | commit |
|---|---|---|
| Domain/Stack/Workflow 4 文件路径 `.openxenon/assets/blueprints/draft-skeletons/` → `.openxenon/draft-skeletons/` | Phase 2.1 域漂移修正 | (Phase 2.1) |
| sync-domain-glossary.ts 精简（删冲突检测，保留多 Domain 合并） | Work G | `scripts/sync-domain-glossary.ts` (-132 行) |
| CLI 桶拆分（14 e2e → `__tests__/e2e/` 子目录） | ADR-0088 P3 | `6eb3d4c` |
| Work 单文件拆分（work-validator 1007→3 + work-context-builder 895→3） | ADR-0088 P6 | (Phase 3.4) |
| 4 旧 Blueprint 归档（asset-workflow / doc-{dev,prod,rfc}-workflow） | v0.6.2-alpha.3 | `.openxenon/.archived/assets/blueprints/` |
| 废弃 `.skip` 清理（external-cli-e2e 21 行 + `@deprecated` 误导标签） | ADR-0088 P8 | (Phase 3.2) |

### 📝 设计修订

| 决策 | 锁定位置 | 来源 |
|---|---|---|
| Q1: skeleton `entity: skeleton` 独立 entity（不是 AssetKind 第 6 类） | `oxn-draft-domain.md` + `builtin-skeleton-templates.ts` | grilling 2026-08-02 |
| Q3: 去掉 inv-5 强约束（推荐派生而非必须） | `oxn-draft-domain.md` inv-5 | grilling 2026-08-02 |
| Q2: builtin + 落地混合模式不变 | 推迟 v0.7.x | grilling 2026-08-02 |

## 架构指标

| 维度 | v0.6.2 末态 | v0.6.3 ship | 变化 |
|---|---|---|---|
| Test 文件数 | 155 | 159 | +4（work-validator × 3 + work-context-builder × 3，-2 原文件） |
| Test case 数 | 1864 | 1971 | +107（Insight +22 / Pool +26 / Proof +21 / Draft +17 / Fix #1/#2 +7 / -3 deprecated skip） |
| Skip 数 | 3 | 0 | -3（ADR-0088 P8 废弃清理） |
| Test drift（typecheck errors） | 232 silent | 0 | -232（ADR-0088 P0/P0d） |
| 真实源码 bug | 17 silent | 0 | -17 |
| CLI E2E wall-clock 占比 | 84.2% | <50% | -34pp（ADR-0088 P3 并发） |
| wall-clock 总 | 32.91s | ~35s | +2.1s（含拆分成本） |
| 测试源码 LOC | 26,809 | ~28,000 | +1,200（Insight/Pool/Proof unit 增） |
| cross-package leak | 1 | 0（typecheck 层） | -1 |

## 错误码新增（v0.6.3）

| 错误码 | 含义 | 修复 |
|---|---|---|
| `OXN_DRAFT_PROMOTE_TARGET_EXISTS` | 目标文件已存在 + 未 `--force` | 加 `--force` 或改名 |
| `OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED` | 父目录创建失败 | 检查 fs 权限 |
| `OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID` | RFC 编号格式错 | 检查 docs/rfc 命名 |

## 兼容性

### 不破坏

- v0.6.2-alpha.3 行为不变：`oxn draft promote` 默认不写（仅返回 dispatch info）
- v0.6.2 4 命令（create/list/archive/discard）行为不变
- v0.6.x 老 Work / Asset / Blueprint 数据兼容
- `OXN_DRAFT_SKELETON_NOT_FOUND` 不再阻塞（推荐性 hint，Q3 放开）

### 行为微调

- `oxn draft create --target <rfc|asset|work>` 默认从 `.openxenon/draft-skeletons/` 派生（boundary 顶层）
- 工程师可手写 Draft + 自行加 frontmatter hint（不强制从 skeleton 派生）
- `--strict` 语义改为"desc 字符串完全相同才算违规"（多 Domain desc 不一致不阻断）

## 不实现（明确推迟）

| 决议 | 状态 | 推迟位置 |
|---|---|---|
| RFC-0019 NG1 (AI 推断 promote-target) | ⏸ v0.7.x | RFC-0019 决议 |
| RFC-0019 NG2 (多人协同 Draft) | ⏸ v0.7.x | RFC-0019 决议 |
| RFC-0019 NG3 (changelog 集成) | ⏸ v0.7.x | RFC-0019 决议 |
| RFC-0019 NG4 (Per-target Probe) | ⏸ v0.7.x | RFC-0019 决议 |
| RFC-0019 NG5 (.openxenon/assets/ git 治理) | ⏸ 团队治理 RFC | RFC-0019 决议 |
| Q2 skeleton 版本化 + sync 机制 | ⏸ v0.7.x | grilling 2026-08-02 |
| skeleton 可发现性 hint（OXN_DRAFT_SKELETON_NOT_FOUND 加 hint） | ⏸ v0.7.x | grilling 2026-08-02 |
| ADR-0089 子包 files 策略 | ⏸ 独立 ADR | ADR-0088 D9 |
| sync-domain-glossary.ts unit test | ⏸ v0.7.x | ADR-0088 P2 audit gap |
| builtin-skeleton-templates.ts unit test | ⏸ v0.7.x | ADR-0088 P2 audit gap |

## 验证（CI 6 项 + 跨层守门）

```bash
bun run typecheck                                          # ✅ 0 errors
bun run lint                                               # ✅ 0 errors
bun run check                                              # ✅ 527 files clean
bun scripts/validate-dependencies.ts                       # ✅ 0 violations (44 files / 140 imports)
bun scripts/check-doc-boundary.ts                          # ✅ 0 violations
bun test                                                   # ✅ 1971 pass / 0 fail / 0 skip (159 files, ~35s)
```

## 关联文档

- `.changes/0-6-2-alpha-1-pool-and-glossary.md`
- `.changes/0-6-2-alpha-2-collab-boundary.md`
- `.changes/0-6-2-alpha-2-meta-layer.md`
- `.changes/0-6-2-alpha-2-rfc-0015-implementation.md`
- `.changes/0-6-2-alpha-2-rfc-0016-implementation.md`
- `.changes/0-6-2-alpha-3-draft-promote-routing.md`
- `.changes/0-6-3-draft-promote-ng6-actual-write.md`
- `docs/adrs/0088-test-suite-architecture.md`
- `.openxenon/drafts/sync-domain-glossary-simplification.md`
- `.openxenon/drafts/test-coverage-audit.md`
- `.openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md`