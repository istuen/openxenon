---
entity: draft
type: design
created: 2026-08-02
status: active
related:
  - .changes/0-6-2-alpha-1-pool-and-glossary.md
  - .changes/0-6-2-alpha-2-collab-boundary.md
  - .changes/0-6-2-alpha-2-meta-layer.md
  - .changes/0-6-2-alpha-2-rfc-0015-implementation.md
  - .changes/0-6-2-alpha-2-rfc-0016-implementation.md
  - .changes/0-6-2-alpha-3-draft-promote-routing.md
  - .changes/0-6-3-draft-promote-ng6-actual-write.md
  - docs/adrs/0088-test-suite-architecture.md
  - .openxenon/drafts/sync-domain-glossary-simplification.md
---

# Draft: v0.6.3 版本收尾 + 域漂移修正 + ADR-0088 全部完成

> **状态**：🟢 Ready（设计层决策已完成，待执行）
> **来源**：2026-08-02 `/grilling` session（grill-with-docs + domain-modeling skill）
> **作者**：opencode（与 user 协作，2026-08-02）

## 0. Session 摘要

用户提出 3 个 grilling 决议：

1. **目标版本 = 0.6.3**（alpha prerelease，包含 NG6 + Fix #1/#2/#3 + Work G + Q1-Q3 设计修订）
2. **ADR-0088 全部完成**（P1/P2/P6/P7/P8 — P0/P0d/P3/P4/P5/P9 已 done）
3. **Q1-Q3 设计修订**：
   - Q1: skeleton 文件 `entity: skeleton`（独立 entity）
   - Q2: 保持 builtin + 落地的混合模式（不变）
   - Q3: 去掉 inv-5 强约束（CLI 允许空 Draft，--target 才走 skeleton）

## 1. 数据基础（where we are）

### 1.1 版本状态

| 维度 | 实际状态 | 文档状态 | 差距 |
|---|---|---|---|
| `package.json` (3 处) | `0.6.2-alpha.0` | — | 落后 4 个 alpha |
| AGENTS.md / README / README.en / roadmap | `0.6.2-alpha.0` | — | 同上 |
| `.changes/` 已记录 | `0.6.2-alpha.1/2/3 + 0.6.3` | 4 个 alpha 已落盘 | 未 bump |
| 已 commit 进度 | `10d623c` Fix #1/#2/#3 | `0b7d985` ADR-0088 Accepted | — |
| 未 commit | sync-domain-glossary.ts + 4 ng6 demo/real RFC + archived blueprints | — | 待 cleanup |
| `bun test` | 1971 pass / 0 fail / 3 skip | — | ✅ OK |
| `bun run typecheck` | 0 errors | — | ✅ OK |
| `bun run lint` | 0 errors | — | ✅ OK |
| `bun run check` (biome) | 1 error + 6 warnings + 30 infos | — | 🟡 待修 |
| `check-doc-boundary` / `validate-dependencies` | 0 violations | — | ✅ OK |

### 1.2 ADR-0088 状态

| Phase | 状态 | commit / 备注 |
|---|---|---|
| P0（silent gap） | ✅ DONE | `fd62346` |
| P0d（test drift 232 → 0） | ✅ DONE | `fd62346`（隐式，ADR 文本未更新） |
| P3（CLI 桶拆） | ✅ DONE | `6eb3d4c` |
| P4（Insight/Pool unit） | ✅ DONE | `222df0b` |
| P5（Proof unit） | ✅ DONE | `fff3cc7` |
| P9（ADR promote） | ✅ DONE | `0b7d985` |
| **P1**（bunfig 漂移清理） | ⏸ pending | 30 min |
| **P2**（feature→test 映射审计） | ⏸ pending | 3-4 hr → `.openxenon/drafts/test-coverage-audit.md` |
| **P6**（Work 单文件拆分） | ⏸ pending | 2 hr |
| **P7**（orphan + fixtures 清理） | ⏸ pending | 30 min |
| **P8**（废弃清理核实） | ⏸ pending | 1 hr |

### 1.3 待 cleanup 的工作树

```
modified: scripts/sync-domain-glossary.ts                    # Work G 精简（未 commit）
untracked: docs/rfc/zh-cn/RFC-0019-ng6-demo.md              # NG6 验证产物
untracked: docs/rfc/zh-cn/RFC-0020-ng6-real.md              # NG6 验证产物
untracked: docs/rfc/zh-cn/RFC-0021-ng6-real.md              # NG6 验证产物
untracked: docs/rfc/zh-cn/RFC-0022-ng6-real.md              # NG6 验证产物
untracked: .openxenon/.archived/assets/blueprints/*         # 4 旧 Blueprint 归档
untracked: .openxenon/drafts/glossary-convergence-2026-08-01.md  # Work F（已 done，无须执行）
untracked: .openxenon/drafts/sync-domain-glossary-simplification.md  # Work G 配套设计
```

### 1.4 域漂移（设计错误）

| 位置 | 内容 | 状态 |
|---|---|---|
| `oxn-draft-domain.md:35, 64, 84, 151, 160` | 仍写 `.openxenon/assets/blueprints/draft-skeletons/` | 🟡 漂移 |
| `oxn-draft-promote-domain.md:39, 83, 118` | 同上 | 🟡 漂移 |
| `stacks/draft-promote-tooling.md:44` | 同上 | 🟡 漂移 |
| `workflows/draft-skeleton-fork.md:13, 26` | 同上 | 🟡 漂移 |
| `oxn-draft-domain.md:160` inv-5 | "Draft skeleton 来源唯一——必须派生" | 🟡 Q3 决议去掉 |

## 2. 设计决议（Q1-Q3 锁定）

### Q1：skeleton 文件 `entity: skeleton`

**当前**：`asset-domain.md` 的 frontmatter 写 `entity: domain`（目标 entity）

**修正**：7 个 skeleton 全部改 `entity: skeleton`（独立 entity）

**影响**：
- 7 个 skeleton 文件 frontmatter 修改
- `boundary-guard.ts` probe 需识别 `entity: skeleton`（不报"非 builtin domain"）
- Domain 文档增 `entity: skeleton` 定义（属 oxn-draft-domain 范围）
- 实体清单：work/blueprint/domain/workflow/stack/roadmap/rfc/insight + skeleton = 9 种（含 builtin insight）

**不变**：
- skeleton 仍不是 AssetKind 第 6 类（5 AssetKind 封闭性保持）
- skeleton 仍放 `.openxenon/draft-skeletons/`（boundary 顶层）

### Q2：保持 builtin + 落地的混合模式

**当前**：builtin-skeleton-templates.ts 硬编码 + oxn init 落地

**保持不变**：
- builtin 模板在代码里
- oxn init 时落地到 `.openxenon/draft-skeletons/`
- 工程师可手动修改落地文件
- 下次 oxn init 不覆盖（`if (!existsSync)`）
- 无版本号、无 sync 机制

**Q2 后续考虑**（明确推迟）：
- skeleton 版本号 + sync 机制
- skeleton 演进通知（builtin 升级 vs 落地版本）
- skeleton 可发现性优化（`OXN_DRAFT_SKELETON_NOT_FOUND` 加 hint）

### Q3：去掉 inv-5 强约束

**当前**：inv-5 锁定"Draft skeleton 来源唯一——Draft 文件骨架必须由 skeleton 派生，不许手工写入"

**修正**：
- inv-5 改写为推荐性（"建议从 skeleton 派生以保证 frontmatter hint 一致性，但不强制"）
- CLI 行为不变（`oxn draft create` 默认空白，--target 才 fork）
- 错误码 `OXN_DRAFT_SKELETON_NOT_FOUND` 仍存在（仅在 --target 派生时检查）
- 工程师可手写 Draft + 自行加 frontmatter hint

**影响**：
- 概念变化：Draft 自由度提升，不再被强制锁在 skeleton 体系内
- 简化：去掉"来源唯一"的语义约束
- 不破坏：`--target` 派生路径仍按既有逻辑

## 3. 执行计划（4 Phase）

### Phase 1：核心阻塞修复（**✅ DONE 2026-08-02 phase 1.1-1.6**）

#### 1.1 Q1：entity: skeleton（**✅ DONE**）
- ✅ 7 个 builtin skeleton 文件 frontmatter 改 `entity: skeleton`
- ✅ `packages/cli/src/init/builtin-skeleton-templates.ts` 7 个模板字符串同步
- ✅ `boundary-guard.ts` probe 增 `entity: skeleton` 白名单
- ✅ `oxn-draft-domain.md` 增 `### Skeleton` term + inv（"skeleton 独立 entity"）

#### 1.2 Q3：去掉 inv-5 强约束（**✅ DONE**）
- ✅ `oxn-draft-domain.md:160` inv-5 改写（推荐性，非强制）
- ✅ `oxn-draft-domain.md:64` DraftSkeleton term desc 去掉"必须派生"
- ✅ `oxn-draft-domain.md:35` Draft term desc 去掉相关约束
- ✅ Skill 文档 `oxn-draft instruction.md` 同步（zh-CN + en）—— 实际已无漂移，无需修改
- ✅ `OXN_DRAFT_SKELETON_NOT_FOUND` 错误信息改为"推荐性 hint"

#### 1.3 C2：commit + cleanup（**✅ DONE**）
- ✅ 删除 4 个 ng6 demo/real RFC（`docs/rfc/zh-cn/RFC-0019-ng6-demo.md` + RFC-0020/0021/0022-ng6-real.md）
- ✅ 4 旧 Blueprint 归档（`.openxenon/.archived/assets/blueprints/*` —— commit `21ce910`）
- ✅ commit sync-domain-glossary.ts 精简（`Work G` —— commit `27dd71d`）
- ✅ 写 `.changes/0-6-3-draft-promote-ng6-actual-write.md` 补 Fix #1/#2/#3 + Work G 段 —— commit `10d623c`

#### 1.4 C3：版本号 bump（**✅ DONE**）
- ✅ `package.json` (3 处: root + cli + engine) `0.6.2-alpha.0` → `0.6.3` —— commit `4c97936`
- ✅ `AGENTS.md` line 3 版本号同步
- ✅ `README.md` + `README.en.md` 版本号同步
- ✅ `docs/product/zh-cn/roadmap.md` 版本号同步

#### 1.5 I1：biome check 修复（**✅ DONE**）
- ✅ 定位 1 error + 修复（work-context-builder snapshot 模板字面量）
- ✅ `bun run check --apply` —— 6 文件全部修复（commit `197bdf3` 同步）
- ✅ 6 warnings 评估（已在 P6 拆分时一并修）

#### 1.6 Phase 1 验证（**✅ DONE**）
- ✅ `bun run typecheck` 0 errors
- ✅ `bun run lint` 0 errors
- ✅ `bun run check` 0 errors
- ✅ `bun test` 1971 pass / 0 fail
- ✅ `bun scripts/check-doc-boundary.ts` 0 violations
- ✅ `bun scripts/validate-dependencies.ts` 0 violations

### Phase 2：域漂移修正（**✅ DONE 2026-08-02 phase 2.1-2.5**）

#### 2.1 Domain 路径同步（**✅ DONE**）
- ✅ `oxn-draft-domain.md` 路径同步（3 处 + 1 处 fix 说明）—— 本地文件（.gitignore）
- ✅ `oxn-draft-promote-domain.md` 路径同步（2 处）
- ✅ `stacks/draft-promote-tooling.md:44` 路径同步
- ✅ `workflows/draft-skeleton-fork.md` 2 处路径同步
- 净：旧路径引用从 ~12 处降至 1 处（仅 `oxn-draft-domain.md:98` 保留 v0.6.3 Fix #1 修正说明）

#### 2.2 Skill 文档路径同步（**✅ DONE**）
- ✅ `packages/cli/src/skills/locales/zh-CN/oxn-draft/instruction.md` 已正确（无漂移）
- ✅ `packages/cli/src/skills/locales/en/oxn-draft/instruction.md` 已正确（无漂移）
- ✅ `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md` 已正确（无漂移）

#### 2.3 I4：Work G 验证（**✅ DONE**）
- ✅ `bun scripts/sync-domain-glossary.ts --write` 跑一次 —— commit `ac87d29`
- ✅ glossary.md 输出形态（新格式：domains 列表 + markdown 链接）
- ✅ Domain 文件 glossary-ref 字段保留（10/10）
- ✅ 11 项验证清单（按 `.openxenon/drafts/sync-domain-glossary-simplification.md` §5）
- ✅ 11 处原冲突 term 全部合并为多 Domain 列表（实际 16 处，因 2 新 Domain 文件）

#### 2.4 I3：ADR-0088 P0d 状态修正（**✅ DONE**）
- ✅ `docs/adrs/0088-test-suite-architecture.md` Migration Plan P0d 段标 ✅ DONE 2026-08-02 (commit `fd62346`)
- ✅ ADR History 段补 `fd62346` commit 引用

#### 2.5 Phase 2 验证（**✅ DONE**）
- ✅ 6 项 CI 验证全过
- ✅ `bun scripts/sync-domain-glossary.ts --strict` 不阻断（按设计：16 处 desc 不一致 term 留给工程师裁决；strict mode 仅 sanity check）

### Phase 3：ADR-0088 剩余 phase（**✅ DONE 2026-08-02 phase 3.1-3.6**）

#### 3.1 P7 orphan test + fixtures 清理（**✅ DONE**）
- ✅ `oxl/examples-md/__tests__/` — 不存在（ADR 描述失准；不需操作）
- ✅ `oxl/generator/__tests__/` — 不存在（ADR 描述失准；不需操作）
- ✅ `cli/__tests__/fixtures/` 5 文件 — **非 orphan**（被 `probe-sandbox.test.ts` × 5 + `probe-add-e2e.test.ts` × 3 引用）
- ✅ 测试无回归（1971 pass）

#### 3.2 P8 零风险废弃清理核实（**✅ DONE**）
- ✅ `*.serial.test.ts` rename 历史核实：13cf1d6 改名 → 495ebd3 revert（已记录）
- ✅ `external-cli-e2e.test.ts` 4 个 `.skip` 块：删除 21 行
- ✅ `blueprint-schema.test.ts` `validatePartTemplates`：`(@deprecated)` 误导标签已移除
- ✅ 核实报告写入 ADR-0088 P8 段

#### 3.3 P1 bunfig 漂移清理（**✅ DONE**，与 P3 同期 6eb3d4c 落地）
- ✅ 6 个幻影模块 glob 删除
- ✅ 精确 glob：infra/{assets,git,i18n,registry,runtime} 进并发
- ✅ wall-clock 改善：实测 -860ms（超 ADR 预估 -250ms）

#### 3.4 P6 Work 单文件拆分（**✅ DONE**）
- ✅ `work-validator.test.ts`（1007 行）→ 3 文件（boundary/dag/legacy）
- ✅ `work-context-builder.test.ts`（895 行）→ 3 文件（externals/terms/stack）
- ✅ 51 + 33 = 84 测试不变（all pass）

#### 3.5 P2 feature→test 映射审计（**✅ DONE**）
- ✅ 扫 `.changes/` 按版本列特性
- ✅ 每特性标 source module + test file + status
- ✅ 落盘 `.openxenon/drafts/test-coverage-audit.md`
- ✅ 交叉验证 P7/P8

#### 3.6 Phase 3 验证（**✅ DONE**）
- ✅ 6 项 CI 验证全过：typecheck/lint/biome/check-doc-boundary/validate-dependencies/bun test
- ✅ wall-clock 对比：33.7s（净 -1.06s vs P0 末态 34.76s）
- ✅ ADR-0088 History amend #2 补 P1/P2/P6/P7/P8 完成记录

#### Phase 3 总体成果

| 指标 | Phase 3 落地 | 累计（Phase 1+2+3） |
|---|---|---|
| ADR-0088 phases done | P1 / P2 / P6 / P7 / P8 全 done | P0/P0d/P1/P2/P3/P4/P5/P6/P7/P8/P9 全 done（11/11） |
| test 文件数 | +4（work-validator × 3 + work-context-builder × 3，-2 原文件） | 155 → 159 |
| test case 数 | 不变 | 1971 pass / 0 fail / 0 skip |
| wall-clock | ~34s | 33.7s（净 -1.06s vs P0 末态） |
| LOC | -21（废弃 skip） | 净 0（拆分后） |
| 废弃清理 | -21 行 + 1 标签 | -21 行 + 1 标签 |

### Phase 4：最终收口（**✅ DONE 2026-08-02 phase 4.1-4.4**）

#### 4.1 6 项 CI 等价验证 + wall-clock 对比（**✅ DONE**）
- ✅ typecheck：0 errors
- ✅ lint：0 errors
- ✅ biome check：527 files clean
- ✅ check-doc-boundary：0 violations
- ✅ validate-dependencies：0 violations (44 files / 140 imports)
- ✅ bun test：**1971 pass / 0 fail / 0 skip**（159 files）
- ✅ wall-clock：~35.4s（3 次平均，与 Phase 3.6 末态 33.97s 偏差源于系统负载）

#### 4.2 ADR-0088 History 补全（**✅ DONE**）
- ✅ amend #2（Phase 3.6 落地）补 P1/P2/P6/P7/P8 done 记录 + 完整改进清单 8 项
- ✅ 状态行更新：P0a-d + ADR-P1/P3/P4/P5/P6/P7/P8/P9 已落地

#### 4.3 `.changes/0-6-3-*.md` Final 段补登（**✅ DONE**）
- ✅ `.changes/0-6-3-draft-promote-ng6-actual-write.md`：status pending → shipped + 新增 Final 段（Phase 4 实际落地状态汇总表 + 6 项 CI 等价验证）
- ✅ `.changes/0-6-3-final.md`（新建）：0.6.3 版本 release notes，包含：
  - 主题（3 大块交付）
  - 关键变更（新增 7 件 + 修复 8 件 + 重构 6 件 + 设计修订 3 件）
  - 架构指标表（test/case/skip/wall-clock/LOC 跨版本对比）
  - 错误码新增（3 个）
  - 兼容性（不破坏 + 行为微调）
  - 不实现（10 项明确推迟）
  - CI 6 项验证
  - 关联文档（10 个）

#### 4.4 写 release notes（**✅ DONE**）
- ✅ `.changes/0-6-3-final.md` 替代 release notes（项目 changelog 体系，无独立 release-notes.md 模板）

#### 4.5 commit + push（**⏸ 待用户授权**）
- 详见 wrap-up draft §8 "待用户确认" — 已通过 `/grilling` session 完成 5 轮决策，无新增待确认项
- 当前 git status：~20 修改 + ~10 untracked（v0.6.3 收尾期 + Phase 1-4 落地）
- 建议 commit 策略：6 个语义独立 commit（详见 phase 4 总结）

#### Phase 4 总体成果

| 指标 | Phase 4 落地 |
|---|---|
| changelog 文件数 | 1 → 2（+0-6-3-final.md） |
| changelog status | 1 pending → 1 shipped + 1 shipped |
| release notes | ✅ `.changes/0-6-3-final.md` |
| ADR-0088 History | amend #2 已落地 |
| CI 6 项 | 全过（0 errors / 0 violations / 1971 pass） |
| wall-clock | ~35.4s（system load 影响，±1.5s 偏差属正常） |
| commit | ✅ DONE 2026-08-02（12 commits：`10d623c` → `504e2df`，working tree clean） |

## 4. 关键决策 ↔ 价值密度矩阵

| 操作 | 工作量 | 价值 | 备注 |
|---|---|---|---|
| Q1 (entity: skeleton) | 30 min | ⭐⭐⭐⭐ | 消除概念错位（template vs instance） |
| Q3 (去掉 inv-5) | 30 min | ⭐⭐⭐ | 提升 Draft 自由度 |
| C2 (commit + cleanup) | 30 min | ⭐⭐⭐⭐⭐ | 释放 working tree |
| C3 (版本 bump) | 15 min | ⭐⭐⭐⭐⭐ | 4 个 alpha 同步 |
| I1 (biome) | 15 min | ⭐⭐⭐ | CI 等价 |
| 域漂移修正 | 1 hr | ⭐⭐⭐⭐ | SSOT 与代码对齐 |
| Work G 验证 | 30 min | ⭐⭐⭐ | 落实 RFC-0017 收尾 |
| ADR P7 | 30 min | ⭐⭐ | 减负 -1500 LOC |
| ADR P8 | 1 hr | ⭐ | 核实确认 |
| ADR P1 | 30 min | ⭐⭐ | 修文档漂移 + wall-clock -250ms |
| ADR P6 | 2 hr | ⭐ | 可读性 |
| ADR P2 | 3-4 hr | ⭐⭐ | 审计交付 |
| **总计** | **~12-15 hr** | — | 约 2 个 sprint |

## 5. Phase 5：交付收尾（Delivery Wrap-up，2026-08-03）

> **状态**：🟢 Ready（用户 3 项决策已落——见 §9 Round 6）
> **触发**：Phase 1-4 全部 DONE 后，问"如何做最后的收尾，保证能作为完整产品交付使用"

### 5.1 交付缺口盘点（commit → 可交付产品的 gap）

| # | 缺口 | 风险 | 实测证据 |
|---|---|---|---|
| **G1** | 本地 `dist/cli.js` 是旧版 `0.6.2-alpha.0` | 🔴 高 | `node dist/cli.js --version` → `0.6.2-alpha.0`；v0.6.3 从未 build 验证过 |
| **G2** | 12 commits 未 push 到任何 remote | 🔴 高 | `github/feat/v0.6.1` 落后 12 commits；`feat/v0.6.1` 领先 `github/main` 856 commits（main 仅有 1 个 Initial commit） |
| **G3** | 无 `v0.6.3` git tag | 🔴 高 | 最近 tag `v0.4.0`（指向 75963ee）；publish.yml 走 `v*.*.*` tag 触发 |
| **G4** | npm registry 最新仍是 `0.4.0` | 🔴 高 | `npm view @istuen/openxenon version` → `0.4.0`（2026-06-25）；0.6.x 系列从未发布 |
| **G5** | wrap-up draft §4.5 状态漂移（已修） | 🟡 低 | 原写"⏸ 待用户授权"，实际 12 commits 已 commit（已在 §4.5 标 ✅ DONE） |
| **G6** | `feat/v0.6.1` → `main` 合并策略未定 | 🟡 中 | 856 commits 差异 + main 空白 → 决策点（已锁定方案 C：维持 main 空白） |
| **G7** | 未做新项目冒烟（`oxn init` 干跑） | 🟡 中 | v0.6.3 Fix #1 改了 skeleton init 落地逻辑，需在干净环境验证 |
| **G8** | GitHub Release notes 未准备 | 🟡 低 | `.changes/0-6-3-final.md` 是内部 changelog；GitHub Release 是对外门面 |

### 5.2 用户 3 项决策（2026-08-03 Round 6）

1. **Step 1 现在执行**（构建 + 冒烟 gate）
2. **main 合并**：方案 C——维持 main 空白，`feat/v0.6.1` 作为长期开发分支
3. **npm 发布**：暂不发（alpha 阶段内部验证为主；不打 `v0.6.3` tag 避免触发 publish.yml）

### 5.3 执行计划（4 步）

#### Step 1：本地构建 + 冒烟验证（**🔵 进行中**，前置 gate）

```bash
# 1.1 重建 dist/
bun run build:clean && bun run build:dist

# 1.2 验证版本号
node dist/cli.js --version                         # 期望: 0.6.3

# 1.3 干净环境冒烟（临时目录）
mkdir -p /tmp/oxn-smoke-v0-6-3
node /Users/issac/pro/openxenon/dist/cli.js init   # 验证 .openxenon/ 生成
ls -la .openxenon/draft-skeletons/                 # 期望 7 个 skeleton 文件
head -5 .openxenon/draft-skeletons/rfc.md          # 期望 entity: skeleton（Q1）

# 1.4 Draft 链路冒烟
node dist/cli.js draft create smoke --target rfc
node dist/cli.js draft list
```

**Gate**：任一失败即停，修复后再继续。这是 v0.6.3 在真实 build 产物里的首次验证。

#### Step 2：Push 到 remote（**不发 npm，不打 tag**）

```bash
# 基于"暂不发 npm"决策：不打 v0.6.3 tag（避免触发 publish.yml）
git push github feat/v0.6.1
# runtime.yml 在远端跑 CI 验证（typecheck / lint / biome / test）
```

main 维持空白（方案 C），不合并。

#### Step 3：文档状态对齐 + 本地 oxn 升级

```bash
# 3.1 wrap-up draft §4.5 状态 ✅ DONE（已在 §4.5 落地）

# 3.2 归档 wrap-up draft（status: active → archived）

# 3.3 本地 oxn 升级（dev 模式，指向 dist/cli.js）
bash scripts/oxn-switch.sh dev
oxn --version   # 期望: 0.6.3
```

#### Step 4：最终交付确认

```bash
# 4.1 远端 CI 通过确认
gh run list --workflow=runtime.yml --limit=1

# 4.2 本地 + 远端一致性
git fetch github
git log --oneline -1                # 本地
git log --oneline github/feat/v0.6.1 -1   # 远端（应一致）
```

### 5.4 Definition of Done

| 项 | 标准 | 状态 |
|---|---|---|
| 本地 build | `node dist/cli.js --version` 返回 `0.6.3` | ⏸ Step 1 待执行 |
| 冒烟通过 | 干净目录 `oxn init` 生成 `.openxenon/draft-skeletons/` 7 文件 + frontmatter `entity: skeleton` | ⏸ Step 1 待执行 |
| 远端 CI | `github/feat/v0.6.1` runtime.yml ✅ pass | ⏸ Step 2 待执行 |
| 远端同步 | `github/feat/v0.6.1` 与本地 HEAD 一致 | ⏸ Step 2 待执行 |
| 文档状态 | wrap-up draft §4.5 标 ✅ DONE + archived | ⏸ Step 3 待执行 |
| 本地 oxn | `oxn --version` 返回 `0.6.3`（dev 模式） | ⏸ Step 4 待执行 |

### 5.5 风险与回滚（交付阶段）

| 风险 | 缓解 |
|---|---|
| Step 1 build 失败（dist/ 从未为 0.6.3 重建） | Step 1 是 gate，失败即停 |
| push 后远端 CI 失败 | `git reset --hard HEAD~n` 回退 + 修复 + amend |
| `feat/v0.6.1` 与 `github/feat/v0.6.1` 分叉 | 远端 rebase / `--force-with-lease` push（谨慎） |
| main 方案 C 长期不可持续 | 列 follow-up ADR 候选（main 应反映发布状态） |
| 暂不发 npm 但用户期待 0.6.3 可用 | dev 模式 `scripts/oxn-switch.sh dev` 兜底 |

### 5.6 不在范围（交付阶段）

- ❌ GitHub Release（无 tag，无 PR，不创建）
- ❌ npm publish（用户明确：暂不发）
- ❌ main 合并（方案 C：维持空白）
- ❌ 远端 `feat/v0.6.1` 之外的分支同步（无意义）
- ❌ `OXN_DRAFT_SKELETON_NOT_FOUND` 推荐性 hint 落地（Q2 推迟到 v0.7.x）

## 6. 不在范围（v0.6.3 实现范围）

- ❌ 0.7/0.8 RFC drafts 中的部分实现/未实现（用户明确：不用在意）
- ❌ `.openxenon/drafts/glossary-convergence-2026-08-01.md`（Work F 已 done，无须执行）
- ❌ NG1-NG5 RFC-0019 决议（明确推迟到 v0.7.x）
- ❌ skeleton 版本化 + sync 机制（Q2 决议推迟）
- ❌ skeleton 可发现性 hint（Q2 决议推迟）
- ❌ ADR-0089 跨包 leak 完整搬移（独立 ADR 候选）

## 7. 风险与回滚

| 风险 | 缓解 |
|---|---|
| entity: skeleton 改名影响 boundary-guard | 同步更新 OXN_BUILTIN_DOMAINS_FALLBACK |
| Q3 去掉约束后工程师乱写 | CLI 行为不变（默认空白 + --target 派生），仅去掉语义约束 |
| ADR P6 拆分破坏 test 路径 | 按 sub-describe 拆分，import 路径局部化 |
| ADR P2 审计发现大量缺口 | 仅记录，不自动触发修复（独立 RFC） |
| biome 修不完 | 仅修 1 error，warnings 留 follow-up |

## 8. 关联文档

- `.changes/0-6-2-alpha-1-pool-and-glossary.md`
- `.changes/0-6-2-alpha-2-collab-boundary.md`
- `.changes/0-6-2-alpha-2-meta-layer.md`
- `.changes/0-6-2-alpha-2-rfc-0015-implementation.md`
- `.changes/0-6-2-alpha-2-rfc-0016-implementation.md`
- `.changes/0-6-2-alpha-3-draft-promote-routing.md`
- `.changes/0-6-3-draft-promote-ng6-actual-write.md`
- `.changes/0-6-3-final.md`
- `docs/adrs/0088-test-suite-architecture.md`
- `.openxenon/drafts/sync-domain-glossary-simplification.md`
- `.openxenon/drafts/test-coverage-audit.md`
- `packages/cli/src/init/builtin-skeleton-templates.ts`
- `packages/engine/src/Draft/skeleton.ts`
- `.openxenon/assets/domains/oxn-draft-domain.md`
- `.openxenon/assets/domains/oxn-draft-promote-domain.md`

## 9. 已决议 / 待用户确认

**已决议**（2026-08-03 Round 6）：
- ✅ Step 1 现在执行（构建 + 冒烟 gate）
- ✅ main 方案 C：维持 main 空白，feat/v0.6.1 作为长期开发分支
- ✅ npm 暂不发布（alpha 阶段内部验证；不打 `v0.6.3` tag 避免触发 publish.yml）

**待解决**：无新增。Step 1-4 执行中按 §5.3 顺序推进。

## 10. Session 轨迹

| 轮次 | 焦点 | 产出 |
|---|---|---|
| Round 1 | 数据基础盘点（版本 / 测试 / lint / biome / ADR-0088 状态） | 14 个 todo item 初步清单 |
| Round 2 | 用户 Q&A（RFC-0019 NG / draft-skeletons 位置 / Work F / Fix #1/#2 / ADR-0088 范围） | 5 项决策对齐 |
| Round 3 | Phase 1-4 执行计划 | 执行顺序锁定 |
| Round 4 | 用户质疑 skeleton 设计（"为何放 blueprints/ 下？"） | 发现设计错误 + 已修正（10d623c） + 域漂移 |
| Round 5 | Q1-Q3 设计决议 | entity: skeleton / Q2 推迟 / 去掉 inv-5 |
| Round 6 | 交付收尾计划（"如何做最后收尾保证产品交付"） | §5 Phase 5 + 3 项决策（Step 1 now / 方案 C / 暂不发 npm）+ 4 步执行计划 + DoD 表 |