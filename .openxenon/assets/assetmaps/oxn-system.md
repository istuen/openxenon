---
entity: assetmap
version: 3.2.0
name: oxn-system
abstract: |
  OpenXenon scene-based routing: 6 builtin scenes (doc / dev / debug / test / release / onboard) map goals to Domain + Workflow + Blueprint (composition). AI Agent reads this AssetMap + calls `oxn assetmap suggest --goal --scene` to locate relevant Assets.
  v0.7+：文档按四层 SSOT 全景（Asset / RFC / Doc / Meta）组织，CONTEXT-MAP.md 已退役。8 个 oxn-* Domain（含 oxn-draft-domain）是定义性 SSOT，AI Agent 按 scene 按需引用，不存在固定必读清单。NpmSupplyChainAdvisory 是探索成果（入侵检测），不入常规索引。
  注意：目录命名沿用 `assetmaps/`（兼容 v0.7.4 roadmap 目录），代码枚举值仍为 `roadmap`。
oxn-source-sha: d64d46c08cfc02bc3a20bd319d599a390f20d090
synced-at: 2026-08-10
---

# AssetMap: oxn-system

> 6 builtin scenes. Use `oxn assetmap show oxn-system --scene <scene>` to view one scene.
> AI Agent: `oxn assetmap suggest --goal "<goal>" --scene <scene>` for ranked matches.
> After Asset create/edit: `oxn assetmap sync oxn-system --scene <scene> --dry-run` (manual hint, NOT auto-sync).
>
> 当前自举范围（2026-07-26 0.6.2-alpha.0 Phase 5；v0.7.0 巩固）：**dev** 和 **doc** 是 2 个能自举跑起来的 scene；其余 4 个（debug/test/release/onboard）作为导航存在，引用收敛到活跃 `oxn-*-domain`（8 个）。
>
> **v0.7+ 文档架构**：四层 SSOT 全景（Asset / RFC / Doc / Meta）；AssetMap 仅导航 Asset 层。

## Scenes

### scene-doc
- desc: write/read documentation, ask what OXN is, find chapters.
- domain: oxn-domain — 顶层词汇边界 + 产品定位 + IAP 三阶段
- domain: oxn-asset-domain — Asset 生命周期 + 5 类 AssetKind + Paper 结构
- domain: oxn-cli-domain — CLI + i18n + Skill + VitePress 站点配置
- domain: oxn-project-domain — 工程术语：RFC + Built-in Asset + 三情态（0.6.x+ 新增，定义 OXN 自身工程元词汇）
- workflow: doc-author — 通用文档撰写流水线（6 slot）
- workflow: doc-publish — （已删除；VitePress 部署由 CI 完成，doc-author.publish slot 涵盖）

### scene-dev
- desc: modify code, add CLI subcommand, evolve Asset.
- domain: oxn-work-domain — Work/Task/Slot/Part/Probe/Round/IAP 三阶段
- domain: oxn-asset-domain — AssetKind + 生命周期 + references DAG
- domain: oxn-engine-domain — L0-L3 分层 + Kernel/Infra 司法行政分离
- domain: oxn-proof-domain — Proof + ProbeOutcome/outcome/Report
- workflow: dev-workflow — 通用开发流程
- workflow: asset-create — Asset 生命周期统一流水线 v3（mode 参数化覆盖 create/skeleton/evolve/archive 4 个原独立 Workflow）
- workflow: asset-evolve — （合并到 asset-create --mode evolve）
- workflow: asset-archive — （合并到 asset-create --mode archive）
- workflow: explore-analyze-report — （已删除；用 `oxn draft create --type report` 替代）
- workflow: fix-issue — 问题诊断 → 定位 → 修复 → 验证
- workflow: migrate-version — 跨版本迁移
- workflow: release-cut — 切版本 + changelog

### scene-debug
- desc: frozen.json anomaly, Probe DEVIATED, hash mismatch, regression.
- domain: oxn-engine-domain — L0-L3 架构边界（防 Kernel IO）+ IAPError 错误契约
- domain: oxn-proof-domain — ProbeOutcome 三态 + InterferenceFlag + Insight→Draft 涌现
- workflow: fix-issue — Bug 复现 + 定位 + 修复 → 验证
- blueprint: bug-fix-blueprint — Bug 修复组合模板 4 阶段（diagnose→locate→fix→verify）

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