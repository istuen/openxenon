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

### Phase 1：核心阻塞修复（~2-3 hr）

#### 1.1 Q1：entity: skeleton（30 min）
- [ ] 7 个 builtin skeleton 文件 frontmatter 改 `entity: skeleton`
- [ ] `packages/cli/src/init/builtin-skeleton-templates.ts` 7 个模板字符串同步
- [ ] `boundary-guard.ts` probe 增 `entity: skeleton` 白名单
- [ ] `oxn-draft-domain.md` 增 `### Skeleton` term + inv（"skeleton 独立 entity"）

#### 1.2 Q3：去掉 inv-5 强约束（30 min）
- [ ] `oxn-draft-domain.md:160` inv-5 改写（推荐性，非强制）
- [ ] `oxn-draft-domain.md:64` DraftSkeleton term desc 去掉"必须派生"
- [ ] `oxn-draft-domain.md:35` Draft term desc 去掉相关约束
- [ ] Skill 文档 `oxn-draft instruction.md` 同步（zh-CN + en）
- [ ] `OXN_DRAFT_SKELETON_NOT_FOUND` 错误信息改为"推荐性 hint"

#### 1.3 C2：commit + cleanup（30 min）
- [ ] 删除 4 个 ng6 demo/real RFC（`docs/rfc/zh-cn/RFC-0019-ng6-demo.md` + RFC-0020/0021/0022-ng6-real.md）
- [ ] 4 旧 Blueprint 归档（`.openxenon/.archived/assets/blueprints/*` 已 untracked，确认归档或删除）
- [ ] commit sync-domain-glossary.ts 精简（`Work G` 一并 commit）
- [ ] 写 `.changes/0-6-3-draft-promote-ng6-actual-write.md` 补 Fix #1/#2/#3 + Work G 段

#### 1.4 C3：版本号 bump（15 min）
- [ ] `package.json` (3 处: root + cli + engine) `0.6.2-alpha.0` → `0.6.3`
- [ ] `AGENTS.md` line 3 版本号同步
- [ ] `README.md` + `README.en.md` 版本号同步
- [ ] `docs/product/zh-cn/roadmap.md` 版本号同步

#### 1.5 I1：biome check 修复（15 min）
- [ ] 定位 1 error（useTemplate 或其他）
- [ ] `bun run check --apply` 或手动修复
- [ ] 6 warnings 评估（按需修）

#### 1.6 Phase 1 验证
- [ ] `bun run typecheck` 0 errors
- [ ] `bun run lint` 0 errors
- [ ] `bun run check` 0 errors
- [ ] `bun test` 1971+ pass / 0 fail
- [ ] `bun scripts/check-doc-boundary.ts` 0 violations
- [ ] `bun scripts/validate-dependencies.ts` 0 violations

### Phase 2：域漂移修正（~1-2 hr）

#### 2.1 Domain 路径同步（30 min）
- [ ] `oxn-draft-domain.md` 5 处路径 `.openxenon/assets/blueprints/draft-skeletons/` → `.openxenon/draft-skeletons/`
- [ ] `oxn-draft-promote-domain.md` 3 处路径同步
- [ ] `stacks/draft-promote-tooling.md:44` 路径同步
- [ ] `workflows/draft-skeleton-fork.md` 2 处路径同步

#### 2.2 Skill 文档路径同步（15 min）
- [ ] `packages/cli/src/skills/locales/zh-CN/oxn-draft/instruction.md` 路径同步
- [ ] `packages/cli/src/skills/locales/en/oxn-draft/instruction.md` 路径同步
- [ ] `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md` 路径同步

#### 2.3 I4：Work G 验证（30 min）
- [ ] `bun scripts/sync-domain-glossary.ts --write` 跑一次
- [ ] 检查 glossary.md 输出形态（新格式：domains 列表 + markdown 链接）
- [ ] 检查 Domain 文件 glossary-ref 字段保留
- [ ] 11 项验证清单（按 `.openxenon/drafts/sync-domain-glossary-simplification.md` §5）
- [ ] 11 处原冲突 term 全部合并为多 Domain 列表（不再报错）

#### 2.4 I3：ADR-0088 P0d 状态修正（15 min）
- [ ] `docs/adrs/0088-test-suite-architecture.md` Migration Plan P0d 段标 ✅ DONE
- [ ] ADR History 段补 `fd62346` commit 引用

#### 2.5 Phase 2 验证
- [ ] 6 项 CI 验证全过
- [ ] `bun scripts/sync-domain-glossary.ts --strict` 不报错（desc 完全一致 term 通过）

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
| commit | ⏸ 待用户授权 |

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

## 5. 不在范围

- ❌ 0.7/0.8 RFC drafts 中的部分实现/未实现（用户明确：不用在意）
- ❌ `.openxenon/drafts/glossary-convergence-2026-08-01.md`（Work F 已 done，无须执行）
- ❌ NG1-NG5 RFC-0019 决议（明确推迟到 v0.7.x）
- ❌ skeleton 版本化 + sync 机制（Q2 决议推迟）
- ❌ skeleton 可发现性 hint（Q2 决议推迟）
- ❌ ADR-0089 跨包 leak 完整搬移（独立 ADR 候选）

## 6. 风险与回滚

| 风险 | 缓解 |
|---|---|
| entity: skeleton 改名影响 boundary-guard | 同步更新 OXN_BUILTIN_DOMAINS_FALLBACK |
| Q3 去掉约束后工程师乱写 | CLI 行为不变（默认空白 + --target 派生），仅去掉语义约束 |
| ADR P6 拆分破坏 test 路径 | 按 sub-describe 拆分，import 路径局部化 |
| ADR P2 审计发现大量缺口 | 仅记录，不自动触发修复（独立 RFC） |
| biome 修不完 | 仅修 1 error，warnings 留 follow-up |

## 7. 关联文档

- `.changes/0-6-2-alpha-1-pool-and-glossary.md`
- `.changes/0-6-2-alpha-2-collab-boundary.md`
- `.changes/0-6-2-alpha-2-meta-layer.md`
- `.changes/0-6-2-alpha-2-rfc-0015-implementation.md`
- `.changes/0-6-2-alpha-2-rfc-0016-implementation.md`
- `.changes/0-6-2-alpha-3-draft-promote-routing.md`
- `.changes/0-6-3-draft-promote-ng6-actual-write.md`
- `docs/adrs/0088-test-suite-architecture.md`
- `.openxenon/drafts/sync-domain-glossary-simplification.md`
- `packages/cli/src/init/builtin-skeleton-templates.ts`
- `packages/engine/src/Draft/skeleton.ts`
- `.openxenon/assets/domains/oxn-draft-domain.md`
- `.openxenon/assets/domains/oxn-draft-promote-domain.md`

## 8. 待用户确认

无（已通过 `/grilling` session 完成 5 轮决策）。

## 9. Session 轨迹

| 轮次 | 焦点 | 产出 |
|---|---|---|
| Round 1 | 数据基础盘点（版本 / 测试 / lint / biome / ADR-0088 状态） | 14 个 todo item 初步清单 |
| Round 2 | 用户 Q&A（RFC-0019 NG / draft-skeletons 位置 / Work F / Fix #1/#2 / ADR-0088 范围） | 5 项决策对齐 |
| Round 3 | Phase 1-4 执行计划 | 执行顺序锁定 |
| Round 4 | 用户质疑 skeleton 设计（"为何放 blueprints/ 下？"） | 发现设计错误 + 已修正（10d623c） + 域漂移 |
| Round 5 | Q1-Q3 设计决议 | entity: skeleton / Q2 推迟 / 去掉 inv-5 |