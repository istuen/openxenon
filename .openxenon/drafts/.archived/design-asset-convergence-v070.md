# Design: Asset 收敛 v2（v0.7.0）

- **DraftType**: design（设计稿）
- **状态**: draft（grilling session 收束，待 promote 为 RFC）
- **创建日期**: 2026-08-09
- **主题**: v0.6.4 收敛完成（38 → 32 Asset，-15.8%）后，再次分析剩余收敛空间，制定 v0.7.0 收敛计划（32 → 25 Asset，-22%）。
- **关联**:
  - `.openxenon/drafts/design-asset-convergence-v064.md`（v0.6.4 收敛历史）
  - `.openxenon/drafts/design-asset-structure-unification.md`（Asset 结构 v2 收编）
  - `oxn-asset-domain.md`（5 AssetKind 权威）
  - `oxn-work-domain.md`（SlotFoldingRule Axiom）
  - `oxn-proof-domain.md`（frozen.json + trace.jsonl SSOT）
  - `oxn-engine-domain.md`（L0-L3 架构 + 错误契约 SSOT）
- **Grilling 来源**: 2026-08-09 `/grilling` session v2 收束（4 explore agent 全量扫描 + 5 项决策锁定）

---

## 1. 背景与目标

### 1.1 v0.6.4 已落地（38 → 32 Asset，5 PR）

| PR | 内容 | Δ |
|---|---|---|
| PR-A | roadmap → assetmap 全面改名 + parser 修复 | 类型 + parser |
| PR-B | Q5 删 insight + Q6 probe 合 proof | -2 Domain |
| PR-C | Q8 折 4 Workflow 到 dev-workflow | -4 Workflow |
| PR-D | Q7 references 语法统一 | references 解析 |
| PR-E | Q1 Probe ≠ Asset 物理归位 + Q3 AssetType → EngineModuleType | 物理路径 + 类型消歧 |

**Commit**: `eb463c6`（62 files, +2048/-433）

### 1.2 v0.6.4 后剩余问题（9 项，由 4 explore agent 扫描得出）

| # | 问题 | 严重度 |
|---|---|---|
| D1 | `oxn-draft-domain` ↔ `oxn-draft-promote-domain` 双向引用违反 Inv5DagNoCycles | 高 |
| D2 | 3 条 invariant 字面重复（FrozenImmutable / TraceAppendOnly / ProbeFromBlueprint） | 高 |
| D3 | 2 组同名 Axiom 同义（VersionHygiene / AssetMap）跨域重复 | 高 |
| D4 | Kernel / Infra / Daemon 三 Axiom 在 engine + proof + domain 重复 | 高 |
| D5 | 8 条错误处理 ForbiddenConstructs 在 cli + proof + work 重复 | 高 |
| D6 | oxn-domain.md:42 Proof 三件套 vs proof-domain 四件套内容冲突 | 高 |
| D7 | Scope / Part / Flag 三个 Critical Name Collision（work + proof 语义冲突） | 高 |
| D8 | Philosophy 占位 Axiom | 中 |
| D9 | IntentPoolRetired 在 proof domain 与 IntentPoolDeprecated 在 project domain 同义 | 中 |
| D10 | Boundary 是 Asset 别名 | 中 |
| D11 | ForbiddenDraftAsAsset 与 ForbiddenDraftPromoteAsAsset 几乎重复（D1 合并自然消解） | 中 |
| D12 | AssetMap 4 个装饰性 scene（debug/test/release/onboard） | 中 |
| D13 | bug-fix-blueprint 未接入 AssetMap scene-debug（79 次代码引用但 0 Asset 引用） | 中 |
| D14 | 10 个 Domain frontmatter 带 version 字段违反版本号中性原则 | 高 |

### 1.3 目标

让 Asset 体系在 v0.7.0 完成以下收敛：

1. **数量收敛**：32 → **25** Asset（-7，-22%）
2. **Critical Name Collision**：3 → 0
3. **循环引用**：1 → 0
4. **Workflow 孤儿**：6 项目 + 1 builtin（保留）→ 6 项目（含 1 builtin）
5. **版本号中性**：10 Domain 全部 frontmatter `version` 字段删除
6. **AssetMap 装饰性 scene**：4 → 标注 stub

## 2. 5 项决策锁定

| # | 问题 | 决策 | 资产影响 |
|---|---|---|---|
| Q-A | D1 合并 draft domain ↔ draft-promote domain | **是** | Domain -1 |
| Q-B | D7 重命名 Scope / Part / Flag | **是** | 3 Axiom rename + cascade |
| Q-C | Workflow A-F 全删激进 | **是** | 项目 Workflow -6 |
| Q-D | 版本号中性方案 A（删 frontmatter version） | **是** | 10 Domain frontmatter |
| **Q-E** | **builtin `md-author-workflow` 删除** | **不删** | builtin Workflow 保留（已知孤儿，兼容项） |

## 3. 数量收敛目标（v0.7.0）

| AssetKind | v0.6.4 起点 | v0.7.0 最终 | Δ |
|---|---|---|---|
| Domain | 10 | **9** | -1 |
| Workflow（项目内） | 12 | **6** | -6 |
| Workflow（builtin） | 1 | **1** | 0（保留兼容） |
| Stack | 3 | **3** | 0 |
| Blueprint | 4 | **4** | 0 |
| AssetMap | 1 | **1** | 0 |
| **Asset 总数** | **32** | **25** | **-7（-22%）** |
| Domain Axiom（净） | ~324 | ~310 | -14 |
| Domain Inv（净） | ~324 | ~321 | -3（字面合并） |
| Critical Name Collision | 3 | **0** | -3 |
| 循环引用 | 1 | **0** | -1 |
| Workflow 孤儿（项目） | 6 | **0** | -6 |
| scene-test/onboard 重复 | 2 | 0（标注 stub） | -2 |
| bug-fix-blueprint 孤儿 | 1 | 0（scene-debug 接入） | -1 |

## 4. PR 分解（4 PR，按依赖排序）

```
PR-F（Domain 收敛）
  └─► PR-G（Critical Name Collision，依赖 PR-F proof domain Axiom 改完）
        └─► PR-H（Workflow 删除，依赖 PR-G frozen.json schema）
              └─► PR-I（AssetMap stub + 接入，最后做）
```

## 5. 各 PR 文件清单

### PR-F：Domain 层收敛（~1.5 day，风险中）

**触发点**：D1 合并 draft domain
**变更清单**：
1. **D1**：合并 `oxn-draft-domain.md` ↔ `oxn-draft-promote-domain.md` → 1 文件 ~372 行
   - 保留 `oxn-draft-domain.md`，将 promote 内容并入 `## PromoteRoute` 段
   - 删 `oxn-draft-promote-domain.md`
   - references 单向化：`draft-domain` → `oxn-asset-domain` + `oxn-project-domain`
2. **D2**：3 条字面重复 Inv（FrozenImmutable / TraceAppendOnly / ProbeFromBlueprint）归 `oxn-proof-domain`（canonical），删 `oxn-work-domain` 对应 Inv
   - proof domain 编号：现有 36 → 36（数量不变，权威转移）
   - work domain Inv22/23/25 → 改为引用 proof domain 对应 Inv
3. **D3**：VersionHygiene Axiom 归 `oxn-project-domain`（canonical），`oxn-cli-domain:34` 改为引用
4. **D3**：AssetMap Axiom 归 `oxn-asset-domain`（canonical），`oxn-project-domain:125` 改为引用
5. **D4**：Kernel / Infra / Daemon 三 Axiom 归 `oxn-engine-domain`（L0-L3 架构 SSOT）
   - `proof-domain.md:44/47/41` Kernel/Infra/Scope 改为引用
   - `oxn-domain.md:60` Daemon 改为引用
6. **D5**：8 条错误处理 ForbiddenConstructs（HARD_FAIL / SOFT_FAIL / VerdictAsException / FailureAsCrash / OXN_INTERNAL_ERROR_AS_IAP / StackTraceToAI / HARD_HALT_AS_IAP / Flag）归 `oxn-engine-domain` 的错误契约段
   - cli + proof + work 三个 domain 的 ForbiddenConstructs 删除 8 项
7. **D8**：删 `Philosophy` 占位 Axiom（`oxn-engine-domain.md:45`）
8. **D9**：`IntentPoolRetired` Axiom 归 `oxn-project-domain`，删 proof 对应
   - proof domain ForbiddenConstructs 删除 `IntentPool` / `pool-writer` / `writePoolEntry` 3 项
9. **D10**：删 `Boundary` Axiom（`oxn-domain.md:48`，合并到 Asset 定义）
10. **D11**：`ForbiddenDraftAsAsset` Axiom 合并（D1 自然消解）
11. **D14**：删 10 个 Domain frontmatter `version` 字段
    - oxn-asset / oxn-cli / oxn-domain / oxn-draft / oxn-engine / oxn-project / oxn-proof / oxn-work
    - NpmSupplyChainAdvisory（advisory 类型，作为参考保留 version 字段）

**Domain 版本号同步更新**：
- oxn-asset-domain v1.1.0 → v1.2.0
- oxn-engine-domain v1.0.0 → v1.1.0
- oxn-project-domain v1.0.0 → v1.1.0
- oxn-proof-domain v1.2.0 → v1.3.0
- oxn-work-domain v1.1.0 → v1.2.0
- oxn-draft-domain v1.0.0 → v1.1.0（合并 promote 内容）

**changelog**：`.changes/0-7-0-asset-convergence-pr-f.md`

---

### PR-G：Critical Name Collision 修复（~1 day，风险中）

**触发点**：D7 重命名 Scope / Part / Flag

**变更清单**：

| # | 旧名 | 新名 | 位置 |
|---|---|---|---|
| 1 | `Scope` | `ReferenceScope` | `oxn-proof-domain.md:41` Axiom |
| 2 | `Part` | `BuiltinPart` | `oxn-proof-domain.md:38` Axiom |
| 3 | `Flag`（术语层） | `InterferenceFlag` | proof-domain ForbiddenConstructs + 引用方 |

**引用 cascade（~6 文件）**：
- `packages/engine/src/oxl/scope/oxn-scope.ts` — Scope type 保留 `ReferenceScope` 为 export alias（向后兼容 deprecated，v0.8 移除）
- `packages/engine/src/oxl/scope/oxn-builtin-registry.ts` — `_type` 字段
- `packages/engine/src/oxl/md-bridge/reference-checker.ts:47,113` — kind 联合
- `packages/engine/src/Proof/probe-lint.ts` — probe scope 解析
- `packages/engine/src/kernel/verdicts/{catalog,verdict}.ts` — Flag → InterferenceFlag
- `packages/engine/src/Proof/proof-frozen-writer.ts` — frozen.json schema Flag 字段

**向后兼容**：`Scope` / `Part` 保留为 `ReferenceScope` / `BuiltinPart` 的 export alias（v0.7 标记 deprecated，v0.8 移除）

**changelog**：`.changes/0-7-0-asset-convergence-pr-g.md`

---

### PR-H：Workflow 层收敛（~1.3 day，风险高）

**触发点**：6 个项目 Workflow 删除（builtin `md-author-workflow` 不动）

**变更清单**：

| # | 删除 Workflow | 折入目标 | 工作量 |
|---|---|---|---|
| 1 | `draft-skeleton-fork.md` | asset-create 加 `--mode skeleton` 选项 | 0.3 day |
| 2 | `doc-publish.md` | VitePress 部署走 CI（已在 CI 配置），保留 `doc-author.publish` slot | 0.1 day |
| 3 | `explore-analyze-report.md` | 用 `oxn draft create --type report` 替代 | 0.1 day |
| 4 | `asset-archive.md` | asset-create 加 `--mode archive` 选项 | 0.2 day |
| 5 | `asset-evolve.md` | asset-create 加 `--mode evolve` 选项 | 0.2 day |
| 6 | `oxn-workflow.md`（root 优化） | 改为单 slot dispatcher，引用 dev-workflow + doc-author | 0.2 day |
| — | **保留** `md-author-workflow.md`（builtin） | 不动（兼容保留） | 0 |

**asset-create mode 化**：
```yaml
# v0.7.0: asset-create 支持 --mode 参数化
asset-create --mode create    # 默认：fork 同 kind 模板
asset-create --mode skeleton  # 从 .openxenon/draft-skeletons/ fork（吸收 draft-skeleton-fork）
asset-create --mode evolve    # 读 current → plan → apply（吸收 asset-evolve）
asset-create --mode archive   # check-references → confirm → move-to-archived（吸收 asset-archive）
```

**引用 cascade**：
- `promote-target-aware-workflow.md:41/42/97/113` 删 `draft-skeleton-fork` 引用，改 `asset-create`（`fork-template` slot 替代）
- `oxn-system.md:41-51` scene-dev 删 4 个孤儿 workflow 引用行
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/instruction.md` 更新 mode 说明
- `packages/cli/src/commands/asset.ts` 增 `--mode` 参数解析
- builtin skeleton 模板更新

**changelog**：`.changes/0-7-0-asset-convergence-pr-h.md`

---

### PR-I：AssetMap stub 标注 + bug-fix-blueprint 接入（~0.5 day，风险低）

**触发点**：D12 stub 标注 + D13 scene-debug 接入

**变更清单**：
1. `oxn-system.md:50-54` scene-debug 增 `blueprint: bug-fix-blueprint` 链接（接入 79 次代码引用）
2. `oxn-system.md:56-60` scene-test 描述加 `(导航 stub, v0.7.0 激活)`
3. `oxn-system.md:62-67` scene-release 描述加 `(导航 stub, v0.7.0 激活)`
4. `oxn-system.md:69-74` scene-onboard 描述加 `(导航 stub, v0.7.0 激活)`
5. `Roadmap/suggest.ts` 关键词消歧：`test` 词在 scene-test 优先（dev-workflow 的 test slot 不参与 scene routing）

**changelog**：`.changes/0-7-0-asset-convergence-pr-i.md`

---

## 6. 验证守门（每个 PR 必跑）

```bash
bun run typecheck
bun run check
bun test packages/engine packages/cli
bun scripts/check-asset-structure.ts
bun scripts/check-doc-boundary.ts
bun scripts/validate-dependencies.ts
bun scripts/sync-domain-glossary.ts --write
oxn assetmap show oxn-system --scene dev
oxn assetmap show oxn-system --scene debug
```

## 7. 风险登记表

| # | 风险 | 缓解措施 |
|---|---|---|
| R1 | D1 合并 draft domain 后，旧 promote-only 引用（如 `oxn-draft-domain.md:13`）需要全 cascade | sync-domain-glossary + skill locales 同步更新 |
| R2 | D7 Scope → ReferenceScope 重命名涉及 6 文件 cascade，旧名 export 保留为 alias 防破坏 | v0.7 deprecated alias + v0.8 移除 |
| R3 | PR-H 6 个 Workflow 删除涉及 builtin skeleton 与 skill locales | skill locales 同步更新；C3 已锁定接受破坏性 |
| R4 | PR-H asset-create mode 化后，CLI 参数解析可能影响 oxn-asset Skill 的命令示例 | Skill instruction.md 同步更新 |
| R5 | PR-I scene-debug 接入 bug-fix-blueprint 后，scene-debug 描述需要重写以反映 Blueprint + Workflow 双重角色 | 描述重写 + suggest.ts 关键词更新 |
| R6 | D14 删 10 Domain frontmatter version 后，OXN-外部引用方（如 VS Code 插件）若依赖 version 字段会报错 | changelog 标注 breaking change；提供 6 个月兼容期 |
| R7 | 4 PR 一次性合入可能引发集成冲突 | 按依赖顺序合并 + 每 PR 跑全量验证 |

## 8. 与现有架构原则的一致性

| 原则 | 一致性 |
|---|---|
| **5 AssetKind 封闭**（ADR-0053） | ✓ 维持封闭 |
| **3 边界 + Blueprint 组合 + AssetMap 索引**（ADR-0054） | ✓ 维持 |
| **AssetPaper 4 字段**（ADR-0051） | ✓ 维持 |
| **版本号中性原则**（AGENTS.md 第 47 行） | ✓ **强化**：删 10 个 Domain frontmatter version 字段 |
| **AI 自建 Asset 走 Draft → Promote**（ADR-0084） | ✓ 维持 |
| **SkillFoldingRule**（dev-workflow 9 slot） | ✓ PR-H asset-create mode 化与 SlotFoldingRule 协同 |
| **Probe ≠ Asset 显式化**（v0.6.4） | ✓ 维持 |

## 9. 累计落地进度（v0.6.4 → v0.7.0）

| 阶段 | Asset 总数 | Δ | 决策 |
|---|---|---|---|
| v0.6.3 起点 | 38 | — | 起点 |
| v0.6.4-alpha.0 | 32 | -6 | PR-A/B/C/D/E 全落地 |
| v0.7.0-alpha.0 | 25 | -7 | PR-F/G/H/I 全落地 |

## 10. 待开工

进入 build 模式后，按依赖顺序逐 PR 执行：

| 顺序 | PR | 内容 | 工作量 | 风险 |
|---|---|---|---|---|
| 1 | PR-F | Domain 收敛（D1-D14） | 1.5 day | 中 |
| 2 | PR-G | Critical Name Collision 修复 | 1 day | 中 |
| 3 | PR-H | Workflow 6 个删除 + asset-create mode 化 | 1.3 day | 高 |
| 4 | PR-I | scene stub 标注 + bug-fix-blueprint 接入 | 0.5 day | 低 |

**合计**：4.3 day