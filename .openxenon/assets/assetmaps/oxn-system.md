---
entity: assetmap
version: 3.2.0
name: oxn-system
abstract: |
  OpenXenon scene-based routing v3.2: 6 builtin scenes (doc / dev / debug / test / release / onboard) map goals to Domain + Workflow + Blueprint (composition). AI Agent reads this AssetMap + calls `oxn assetmap suggest --goal --scene` to locate relevant Assets.
  v0.7+：文档按四层 SSOT 全景（Asset / RFC / Doc / Meta）组织，CONTEXT-MAP.md 已退役（RFC-0028）。8 个 oxn-* Domain（含 oxn-draft-domain）是定义性 SSOT，AI Agent 按 scene 按需引用，不存在固定必读清单。RFC-0001..0027 按 L3 回源引用（裁决冲突查 Domain Axiom，决策溯源查 RFC）。NpmSupplyChainAdvisory 是探索成果（入侵检测），不入常规索引。
  v3.0.0 (2026-08-08): 收编为 Asset 结构 v2（## Scenes + ## Usage + ## SceneQuickRef）；保留 roadmap 目录命名兼容 v0.7.4（RFC-0013 D4：代码枚举值仍为 `roadmap`，目录 `assetmaps/`）。
  v3.1.0 (2026-08-09): Axiom 正文简化——移除 inline 表格与 bash 代码块，每 Axiom 仅含 `- 一行/一段文字` bullets。
  v3.2.0 (2026-08-10): 移除 "8 Domain + 12 RFC 必读" 陈旧表述（v0.7 RFC-0028 退役 CONTEXT-MAP + RFC-0018 §D1 简化裁决）；同步场景/导航/Usage 段。
oxn-source-sha: d64d46c08cfc02bc3a20bd319d599a390f20d090
synced-at: 2026-08-10
---

# AssetMap: oxn-system

> 6 builtin scenes. Use `oxn assetmap show oxn-system --scene <scene>` to view one scene.
> AI Agent: `oxn assetmap suggest --goal "<goal>" --scene <scene>` for ranked matches.
> After Asset create/edit: `oxn assetmap sync oxn-system --scene <scene> --dry-run` (manual hint, NOT auto-sync).
>
> 当前自举范围（2026-07-26 0.6.2-alpha.0 Phase 5；v0.7.0 巩固）：**dev** 和 **doc** 是 2 个能自举跑起来的 scene；其余 4 个（debug/test/release/onboard）作为导航存在，引用收敛到活跃 `oxn-*-domain`（8 个）+ RFC L3 回源（RFC-0001..0027 共 27 个，按需）。
>
> **v0.7+ 文档架构**：RFC（规定性，27 个 + errata）取代旧 ADR + OXP 双层；四层 SSOT 全景（Asset / RFC / Doc / Meta）；详见 [RFC-0009 文档三情态分离](../../../../docs/rfc/zh-cn/RFC-0009-doc-three-modalities.html) + [RFC-0018 项目工程元层](../../../../docs/rfc/zh-cn/RFC-0018-project-engineering-meta.html) + [RFC-0028 CONTEXT-MAP 退役](../../../../docs/rfc/zh-cn/RFC-0028-context-map-deprecation.html)。

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
- blueprint: bug-fix-blueprint — Bug 修复组合模板 4 阶段（diagnose→locate→fix→verify；🆕 v0.7.0 RFC-0027 PR-I 接入 79 次代码引用补 0 Asset 引用）

### scene-test
- desc: write tests, run test suite, analyze coverage.（🆕 v0.7.0 RFC-0027 PR-I（D12）：导航 stub, v0.7.0+ 激活）
- domain: oxn-work-domain — Work/Task/Part 在 Align 阶段的执行模型
- domain: oxn-engine-domain — L0-L3 架构约束 + 跨平台一致性 + 命名规范
- workflow: dev-workflow — 复用 dev-workflow（test 是 develop 阶段的 verify slot）

### scene-release
- desc: version migration, release cut, changelog.（🆕 v0.7.0 RFC-0027 PR-I（D12）：导航 stub, v0.7.0+ 激活）
- domain: oxn-engine-domain — Monorepo 双包边界（packages/cli + packages/engine）
- domain: oxn-cli-domain — zh-CN locale + t() 翻译
- workflow: migrate-version — 跨版本迁移
- workflow: release-cut — 切版本 + changelog

### scene-onboard
- desc: new contributor first day, full project overview.（🆕 v0.7.0 RFC-0027 PR-I（D12）：导航 stub, v0.7.0+ 激活）
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