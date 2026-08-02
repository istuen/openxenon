---
version: 0.6.3
prerelease: false
date: 2026-08-02
type: feature
scope: draft-promote-actual-write
status: shipped
---

# 0.6.3: Draft Promote 实际写文件（RFC-0019 NG6 落地）

## 主题

v0.6.2-alpha.3 的 `oxn draft promote` 仅返回 dispatch 信息（subTarget + targetPath），不实际写目标文件。v0.6.3 起支持 `--commit` 标志，**真正写目标文件**，完成 RFC-0019 NG6 决议。

## 范围

### 新增

**Engine 模块**：
- `packages/engine/src/Draft/promote-dispatch.ts` — 7 sub-target 实际写文件
  - 自动 RFC-XXXX 编号（基于 `docs/rfc/zh-cn/` 扫描 max+1）
  - 5 AssetKind per-kind frontmatter（domain PascalCase / 其他 kebab-case）
  - Work 含 entity=work + workId + intent
  - 冲突检测（默认拒绝覆盖）
  - 事务语义（写失败回滚）

**Engine 扩展**：
- `packages/engine/src/Draft/promote.ts` 增 3 字段：
  - `commit?: boolean` — 默认 false（v0.6.2-alpha.3 兼容）
  - `force?: boolean` — 默认 false（拒绝覆盖）
  - `rfcNumber: string | null` — 仅 target=rfc 有意义
  - `phases.commit?: { filePath, bytesWritten, created }` — 实际写文件结果
- 3 新错误码：`OXN_DRAFT_PROMOTE_TARGET_EXISTS` / `OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED` / `OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID`

**CLI 扩展**：
- `oxn draft promote --commit` — v0.6.3 NG6
- `oxn draft promote --force` — 覆盖已存在的目标文件
- 输出区分 v0.6.2-alpha.3 vs v0.6.3 模式

**测试**（17 件）：
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts`
  - 6 RFC 测试（编号 / 递增 / 默认起始 / force / 自动创建子目录）
  - 7 Asset 测试（5 kind + PascalCase + 冲突）
  - 2 Work 测试（路径 + 子目录）
  - 2 edge case（unknown combo + trim）

### 修复

- `docs/rfcs/zh-cn/RFC-0019-draft-promote-routing.md` 从 `docs/rfcs/`（错误路径）move 到 `docs/rfc/zh-cn/`（canonical 路径）

### v0.6.3 patch — Fix #1/#2/#3（commit `10d623c`）

#### Fix #1：`oxn init` 落地 7 skeleton 模板

- 新模块 `packages/cli/src/init/builtin-skeleton-templates.ts`（279 行）
- 包含 7 个模板：`rfc` / `asset-{domain|workflow|stack|blueprint|roadmap}` / `work`
- `oxn init` 自动写入 `.openxenon/draft-skeletons/`（boundary **顶层**）
- 修正 v0.6.2-alpha.3 设计错误：原放 `.openxenon/assets/blueprints/draft-skeletons/`（blueprint index 误拾取 + 概念错位）
- 解决新项目 `OXN_DRAFT_SKELETON_NOT_FOUND` 错误
- 新路径与 `.openxenon/drafts/` 平行（语义对齐：skeleton 是 Draft 的前置模板）

#### Fix #2：`.oxnrc` `draftPromote` 配置 + `--target-dir` flag

- 新 ProjectConfig 字段 `draftPromote.{rfcDir, assetDirs[5], workDir}`
- 新 CLI flag：`oxn draft promote --target-dir <path>`
- 优先级：`--target-dir` > `.oxnrc` > hardcoded default
- 合并 `.oxnrc` + `.openxenon/config.json` 读取
- 7 新测试覆盖（targetDirOverride + config）

#### Fix #3：retarget 保留工程师 frontmatter

- `oxn draft retarget --new-target X` 调用时保留工程师已填的 frontmatter 字段
- 仅替换 `promote-target` / `promote-kind` hint
- retarget 测试 2 件更新

### Work G：sync-domain-glossary.ts 精简

按 `.openxenon/drafts/sync-domain-glossary-simplification.md` 草案（2026-08-01 grilling 决议）：

- **删除** `isContradicting()` / `extractTokens()` / `firstSentence()` 函数
- **删除** `E_GLOSSARY_DUPLICATE_TERM` 错误码 + 冲突检测段
- **删除** `MergedTerm.conflictDomains` 字段
- **保留** `--strict` 但语义改为"desc 字符串完全相同才算违规"
- **保留** `glossary-ref` 注入 Domain 文件
- **保留** 多 Domain 合并（不再报警，列 `domains:` 列表）
- 净减少 **-188 行 / +56 行**（净 -132 行）
- sync dry-run 验证：10 Domain / 93 term headings → 76 去重 term / 16 多 Domain

### Q1-Q3 设计修订（`/grilling` 2026-08-02 决议）

#### Q1：`entity: skeleton` 独立 entity

- 7 个 skeleton 模板 frontmatter 改为 `entity: skeleton`（不再用目标 entity）
- `boundary-guard.ts` probe 加 `entity: skeleton` 白名单
- `oxn-draft-domain.md` 增 `### Skeleton` term + inv
- 修正概念错位：skeleton 是"模板"不是"实例"

#### Q3：去掉 inv-5 强约束

- `oxn-draft-domain.md:160` inv-5 从"Draft skeleton 来源唯一——必须派生"改为推荐性
- `OXN_DRAFT_SKELETON_NOT_FOUND` 错误信息改推荐性 hint
- CLI 行为不变（默认空白 + `--target` 派生）
- 提升 Draft 自由度：工程师可手写 Draft

### 测试统计

| 阶段 | 累计 |
|---|---|
| v0.6.2-alpha.3 | 1864 pass |
| v0.6.3 NG6 (+17) | 1881 pass / 0 fail / 3 skip |
| v0.6.3 patch Fix #1/#2 (+7) | 1888 pass / 0 fail / 3 skip |
| v0.6.3 final | **1971 pass / 0 fail / 3 skip** |

## Final 段（2026-08-02 实际落地状态 — Phase 4 补登）

> **状态**：🟢 Shipped（2026-08-02 Phase 1-4 全部完成）

### Phase 1-3 落地汇总（domain drift + ADR-0088 收尾）

| Phase | 任务 | commit / 备注 |
|---|---|---|
| Phase 1 | Fix #1-#3（10d623c）+ Q1/Q3 设计修订 + 域漂移 | `10d623c` + `0b7d985` |
| Phase 2 | Domain 路径同步（4 文件）+ Work G 验证 + ADR-0088 P0d 状态补正 | (Phase 2.1-2.4) |
| Phase 3 | ADR-0088 剩余 phases（P1/P2/P6/P7/P8 全 done） | (Phase 3.1-3.6) |
| Phase 4 | 最终收口 + 6 CI 等价验证 + ADR History amend #2 | (Phase 4.1-4.3) |

### 实际 ship 状态（与原 changelog 差异）

| 项 | 原计划 | 实际 ship | 备注 |
|---|---|---|---|
| test case 数 | 1971 pass / 0 fail / 3 skip | **1971 pass / 0 fail / 0 skip** | 3 废弃 `.skip` 已删（ADR-0088 P8） |
| test 文件数 | 155 files | **159 files** | +4（work-validator × 3 + work-context-builder × 3，-2 原文件） |
| wall-clock | 32.91s → 34.76s | **35.4s**（3 次平均） | +1.5s vs P0 末态（含 biome 严格化 + 拆分后 fixture 边界测试增加） |
| Q1 entity: skeleton | ✅ done | ✅ done | 7 skeleton 模板 `entity: skeleton` |
| Q3 inv-5 推荐性 | ✅ done | ✅ done | `OXN_DRAFT_SKELETON_NOT_FOUND` 改推荐性 hint |
| sync-domain-glossary | 11 项验证 | ✅ done | 实际 16 处冲突 term 合并（2 Domain 文件新增） |
| ADR-0088 P2 audit | 3-4 hr 估算 | ✅ done | 落盘 `.openxenon/drafts/test-coverage-audit.md` |

### 端到端验证（demo）

| Test | Result |
|---|---|
| RFC draft → `oxn draft promote --commit` | ✅ `docs/rfc/zh-cn/RFC-0020-ng6-real.md` 实际写入（已删） |
| Asset+domain → `oxn draft promote --commit` | ✅ `.openxenon/assets/domains/Ng6DomainTest.md` 实际写入 (PascalCase) |
| Asset+roadmap → `oxn draft promote --commit` | ✅ `.openxenon/assets/assetmaps/ng6-roadmap.md` 实际写入 (assetmaps 路径) |
| Work → `oxn draft promote --commit` | ✅ `.openxenon/works/ng6-work/work.md` 实际写入 (子目录自动创建) |
| `--force` 覆盖 | ✅ mtime 更新，`created: false` |

> 注：NG6 demo/real 验证产物（RFC-0019/0020/0021/0022-ng6-*）在 v0.6.3 收尾期已清理删除，避免污染 RFC 索引。

## 不破坏

- v0.6.2-alpha.3 行为不变：`oxn draft promote` 默认不写（仅返回 dispatch info）
- v0.6.2 4 命令 + 2 旧 promote 蓝图逻辑不动
- 4 归档 Blueprint 路径不变

## 不实现（明确推迟）

- NG1-NG5 全部延续 RFC-0019 锁定（v0.7.x 评估）

## RFC-0019 实施状态更新

| 决议 | 状态 |
|---|---|
| D1-D7 + G1-G7 | ✅ |
| NG1 (AI 推断) | ⏸ v0.7.x |
| NG2 (多人协同) | ⏸ v0.7.x |
| NG3 (changelog 集成) | ⏸ v0.7.x |
| NG4 (Per-target Probe) | ⏸ v0.7.x |
| NG5 (.openxenon/assets/ git) | ⏸ 团队治理 RFC |
| **NG6 (Promote 实际写文件)** | ✅ **v0.6.3 shipped** |

## 验证（CI 等价 6 条 — Phase 4 最终态）

```bash
bun run typecheck                                          # tsc --noEmit          → 0 errors
bun run lint                                               # eslint 架构守卫       → 0 errors
bun run check                                              # biome                 → 527 files clean
bun scripts/validate-dependencies.ts                       # L0-L3 依赖图          → 0 violations
bun scripts/check-doc-boundary.ts                          # 跨层守门              → 0 violations
bun test                                                   # 测试套件              → 1971 pass / 0 fail / 0 skip
```

wall-clock 实测：33.97s（Phase 3 末）→ 35.4s（Phase 4，3 次平均）—— 偏差源于系统负载，不是拆分成本。

## 关联文档

- RFC-0019-draft-promote-routing.md
- `.openxenon/assets/blueprints/draft-promote-router.md`
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md`
- `.openxenon/assets/domains/oxn-draft-promote-domain.md`
- `.openxenon/assets/domains/oxn-draft-domain.md`（Q1-Q3 设计修订）
- `.openxenon/drafts/sync-domain-glossary-simplification.md`（Work G 设计草案）
- `.openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md`（grilling session 总结）
- `.openxenon/drafts/test-coverage-audit.md`（ADR-0088 P2 审计产物）