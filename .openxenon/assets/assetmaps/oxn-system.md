---
entity: assetmap
version: 3.1.0
name: oxn-system
abstract: |
  OpenXenon scene-based routing v3.1: 6 builtin scenes (doc / dev / debug / test / release / onboard) map goals to Domain + Workflow + Blueprint (composition). AI Agent reads this Roadmap + calls oxn roadmap suggest --goal --scene to locate relevant Assets.
  0.6.x+：文档按三情态分离（Asset/RFC/Doc），RFC 体系取代旧 ADR + OXP 双层；8 个 Domain + 12 RFC（8 主题 + 4 meta）为 AI 必读。
  v3.0.0 (2026-08-08): 收编为 Asset 结构 v2（## Scenes + ## Usage + ## SceneQuickRef）；保留 roadmap 目录命名兼容 v0.7.4（RFC-0013 D4：代码枚举值仍为 `roadmap`，目录 `assetmaps/`）。
  v3.1.0 (2026-08-09): Axiom 正文简化——移除 inline 表格与 bash 代码块，每 Axiom 仅含 `- 一行/一段文字` bullets。
oxn-source-sha: d64d46c08cfc02bc3a20bd319d599a390f20d090
synced-at: 2026-08-09
---

# AssetMap: oxn-system

> 6 builtin scenes. Use `oxn assetmap show oxn-system --scene <scene>` to view one scene.
> AI Agent: `oxn assetmap suggest --goal "<goal>" --scene <scene>` for ranked matches.
> After Asset create/edit: `oxn assetmap sync oxn-system --scene <scene> --dry-run` (manual hint, NOT auto-sync).
>
> 当前自举范围（2026-07-26 0.6.2-alpha.0 Phase 5）：**dev** 和 **doc** 是 2 个能自举跑起来的 scene；其余 4 个（debug/test/release/onboard）作为导航存在，引用已收敛到活跃 `oxn-*-domain` + 12 RFC。
>
> **0.6.x+ 文档架构**：RFC（规定性，12 个）取代旧 ADR + OXP 双层；详见 [RFC-0009 文档三情态分离](../../../../docs/rfc/zh-cn/RFC-0009-doc-three-modalities.html)。

## Scenes

### scene-doc
- desc: write/read documentation, ask what OXN is, find chapters.
- domain: oxn-domain — 顶层词汇边界 + 产品定位 + IAP 三阶段
- domain: oxn-asset-domain — Asset 生命周期 + 5 类 AssetKind + Paper 结构
- domain: oxn-cli-domain — CLI + i18n + Skill + VitePress 站点配置
- domain: oxn-project-domain — 工程术语：RFC + Built-in Asset + 三情态（0.6.x+ 新增，定义 OXN 自身工程元词汇）
- workflow: doc-author — 通用文档撰写流水线（6 slot）
- workflow: doc-publish — （🆕 v0.7.0 RFC-0027 PR-H：删除；VitePress 部署由 CI 完成，doc-author.publish slot 涵盖）

### scene-dev
- desc: modify code, add CLI subcommand, evolve Asset.
- domain: oxn-work-domain — Work/Task/Slot/Part/Probe/Round/IAP 三阶段
- domain: oxn-asset-domain — AssetKind + 生命周期 + references DAG
- domain: oxn-engine-domain — L0-L3 分层 + Kernel/Infra 司法行政分离
- domain: oxn-proof-domain — Proof + ProbeOutcome/outcome/Report（🆕 v0.6.4: Insight 术语收编）
- workflow: dev-workflow — 通用开发流程（🆕 v0.6.4 PR-C: 9 slot，含 cli-add / ts-implement / refactor / git-branch 4 个折入的专用 slot；E3 c slot 由上下文推断）
- workflow: asset-create — Asset 生命周期统一流水线 v3（🆕 v0.7.0 RFC-0027 PR-H：mode 参数化覆盖 create/skeleton/evolve/archive 4 个原独立 Workflow）
- workflow: asset-evolve — （🆕 v0.7.0 RFC-0027 PR-H：合并到 asset-create --mode evolve）
- workflow: asset-archive — （🆕 v0.7.0 RFC-0027 PR-H：合并到 asset-create --mode archive）
- workflow: explore-analyze-report — （🆕 v0.7.0 RFC-0027 PR-H：删除；用 `oxn draft create --type report` 替代）
- workflow: fix-issue — 问题诊断 → 定位 → 修复 → 验证
- workflow: migrate-version — 跨版本迁移
- workflow: release-cut — 切版本 + changelog

### scene-debug
- desc: frozen.json anomaly, Probe DEVIATED, hash mismatch, regression.
- domain: oxn-engine-domain — L0-L3 架构边界（防 Kernel IO）+ IAPError 错误契约
- domain: oxn-proof-domain — ProbeOutcome 三态 + InterferenceFlag + Insight→Draft 涌现（🆕 v0.6.4: 合并 Probe + Insight）
- workflow: fix-issue — Bug 复现 + 定位 + 修复 → 验证

### scene-test
- desc: write tests, run test suite, analyze coverage.
- domain: oxn-work-domain — Work/Task/Part 在 Align 阶段的执行模型
- domain: oxn-engine-domain — L0-L3 架构约束 + 跨平台一致性 + 命名规范
- workflow: dev-workflow — 复用 dev-workflow（test 是 develop 阶段的 verify slot）

### scene-release
- desc: version migration, release cut, changelog.
- domain: oxn-engine-domain — Monorepo 双包边界（packages/cli + packages/engine）
- domain: oxn-cli-domain — zh-CN locale + t() 翻译
- workflow: migrate-version — 跨版本迁移
- workflow: release-cut — 切版本 + changelog

### scene-onboard
- desc: new contributor first day, full project overview.
- domain: oxn-domain — 顶层产品定位 + 三方协作模型
- domain: oxn-engine-domain — L0-L3 架构核心
- domain: oxn-asset-domain — Asset create/evolve/archive 词汇
- workflow: dev-workflow — 第一个跑通的 workflow

## Usage

- 列全部 AssetMap：`oxn assetmap list`
- 查完整 AssetMap：`oxn assetmap show oxn-system`
- 查单个 scene：`oxn assetmap show oxn-system --scene dev`
- AI Agent 按 scene 推荐：`oxn assetmap suggest --goal "<goal>" --scene dev`
- Asset 变更后查悬挂链接（手动 dry-run）：`oxn assetmap sync oxn-system --scene doc --dry-run`
- Asset 变更后应用悬挂链接修复：`oxn assetmap sync oxn-system --scene doc --apply`
- AI Agent 命令模板：`oxn assetmap suggest --goal "<goal>" --scene <scene>` —— 详见 CLI 文档

## SceneQuickRef

- write / read / doc / chapter / manual / guide → `doc`
- code / cli / subcommand / implement / refactor / evolve / asset / git / branch → `dev`
- bug / error / fail / frozen / mismatch / regression / hash / deviation → `debug`
- test / coverage / assertion → `test`
- version / release / cut / changelog / migrate → `release`
- new / start / overview / project / architecture → `onboard`