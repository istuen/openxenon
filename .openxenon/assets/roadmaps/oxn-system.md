---
entity: roadmap
version: 3
name: oxn-system
abstract: |
  OpenXenon scene-based routing: 6 builtin scenes (doc / dev / debug / test / release / onboard) map goals to Domain + Workflow + Blueprint (composition). AI Agent reads this Roadmap + calls oxn roadmap suggest --goal --scene to locate relevant Assets.
  v0.7+：文档按三情态分离（Asset/RFC/Doc），RFC 体系取代旧 ADR + OXP 双层；8 个 Domain + 12 RFC（8 主题 + 4 meta）为 AI 必读。
oxn-source-sha: pending
synced-at: 2026-07-26
---

# Roadmap: oxn-system

> 6 builtin scenes. Use `oxn roadmap show oxn-system --scene <scene>` to view one scene.
> AI Agent: `oxn roadmap suggest --goal "<goal>" --scene <scene>` for ranked matches.
> After Asset create/edit: `oxn roadmap sync oxn-system --scene <scene> --dry-run` (manual hint, NOT auto-sync).
>
> 当前自举范围（2026-07-26 v0.7 Phase 5）：**dev** 和 **doc** 是 2 个能自举跑起来的 scene；其余 4 个（debug/test/release/onboard）作为导航存在，引用已收敛到活跃 `oxn-*-domain` + 12 RFC。
>
> **v0.7+ 文档架构**：RFC（规定性，12 个）取代旧 ADR + OXP 双层；详见 [RFC-0009 文档三情态分离](../../../../docs/rfc/zh-cn/RFC-0009-doc-three-modalities.html)。

## Scenes

### scene: doc
> Scenario: write/read documentation, ask what OXN is, find chapters.

| kind | name | description |
|---|---|---|
| domain | oxn-domain | 顶层词汇边界 + 产品定位 + IAP 三阶段 |
| domain | oxn-asset-domain | Asset 生命周期 + 5 类 AssetKind + Paper 结构 |
| domain | oxn-cli-domain | CLI + i18n + Skill + VitePress 站点配置 |
| domain | oxn-project-domain | 工程术语：RFC + Built-in Asset + 三情态（v0.7+ 新增，定义 OXN 自身工程元词汇） |
| workflow | doc-author | 通用文档撰写流水线（6 slot） |
| workflow | doc-publish | Doc site build + GitHub Pages deploy |
| blueprint | doc-prod-workflow | 产品手册撰写组合模板 |
| blueprint | doc-dev-workflow | 开发手册撰写组合模板 |
| blueprint | doc-rfc-workflow | RFC 提升组合模板 v0.2（drafts → docs/rfc/zh-cn/RFC-XXXX-<theme>.md，OXP 废除） |

### scene: dev
> Scenario: modify code, add CLI subcommand, evolve Asset.

| kind | name | description |
|---|---|---|
| domain | oxn-work-domain | Work/Task/Slot/Part/Probe/Round/IAP 三阶段 |
| domain | oxn-asset-domain | AssetKind + 生命周期 + references DAG |
| domain | oxn-engine-domain | L0-L3 分层 + Kernel/Infra 司法行政分离 |
| domain | oxn-proof-domain | Proof/ProbeOutcome/outcome/Report |
| workflow | dev-workflow | 通用开发流程（retrieve → design → develop → test） |
| workflow | asset-create | Asset 创建流水线 |
| workflow | asset-evolve | Asset 演进流水线 |
| workflow | asset-archive | Asset 归档流水线 |
| workflow | add-cli-subcommand | 新增 oxn CLI 子命令 |
| workflow | refactor-safe | 安全重构 + L0-L3 守卫 |
| workflow | git-workflow | Git worktree 分支工作流 |
| workflow | ts-retrieve-design-develop-test | TypeScript 四阶段（retrieve/design/develop/test） |
| workflow | explore-analyze-report | 代码库探索 → 分析 → 报告 |
| workflow | fix-issue | 问题诊断 → 定位 → 修复 → 验证 |
| workflow | migrate-version | 跨版本迁移 |
| workflow | release-cut | 切版本 + changelog |

### scene: debug
> Scenario: frozen.json anomaly, Probe DEVIATED, hash mismatch, regression.

| kind | name | description |
|---|---|---|
| domain | oxn-engine-domain | L0-L3 架构边界（防 Kernel IO）+ IAPError 错误契约 |
| domain | oxn-proof-domain | ProbeOutcome 三态 + InterferenceFlag + 验证 ≠ 评判 |
| workflow | fix-issue | Bug 复现 + 定位 + 修复 + 验证 |

### scene: test
> Scenario: write tests, run test suite, analyze coverage.

| kind | name | description |
|---|---|---|
| domain | oxn-work-domain | Work/Task/Part 在 Align 阶段的执行模型 |
| domain | oxn-engine-domain | L0-L3 架构约束 + 跨平台一致性 + 命名规范 |
| workflow | dev-workflow | 复用 dev-workflow（test 是 develop 阶段的 verify slot） |

### scene: release
> Scenario: version migration, release cut, changelog.

| kind | name | description |
|---|---|---|
| domain | oxn-engine-domain | Monorepo 双包边界（packages/cli + packages/engine） |
| domain | oxn-cli-domain | zh-CN locale + t() 翻译 |
| workflow | migrate-version | 跨版本迁移 |
| workflow | release-cut | 切版本 + changelog |

### scene: onboard
> Scenario: new contributor first day, full project overview.

| kind | name | description |
|---|---|---|
| domain | oxn-domain | 顶层产品定位 + 三方协作模型 |
| domain | oxn-engine-domain | L0-L3 架构核心 |
| domain | oxn-asset-domain | Asset create/evolve/archive 词汇 |
| workflow | dev-workflow | 第一个跑通的 workflow |

---

## Usage

```bash
# List all Roadmaps
oxn roadmap list

# View full Roadmap
oxn roadmap show oxn-system

# View single scene
oxn roadmap show oxn-system --scene dev

# AI Agent: suggest in a scene
oxn roadmap suggest --goal "Add new CLI subcommand" --scene dev --top 3

# After Asset change: detect dangling links (manual, dry-run by default)
oxn roadmap sync oxn-system --scene doc --dry-run
oxn roadmap sync oxn-system --scene doc --apply   # actually modify
```

## Scene quick-reference

| Goal keywords | scene |
|---|---|
| write / read / doc / chapter / manual / guide | `doc` |
| code / cli / subcommand / implement / refactor / evolve / asset / git / branch | `dev` |
| bug / error / fail / frozen / mismatch / regression / hash / deviation | `debug` |
| test / coverage / assertion | `test` |
| version / release / cut / changelog / migrate | `release` |
| new / start / overview / project / architecture | `onboard` |
