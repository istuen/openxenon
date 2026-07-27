---
redirectFrom:
  - /zh-cn/roadmap.html
title: 路线图
---

# 路线图

> OpenXenon 按 6 大场景（scene）组织能力地图。当前版本：v0.6.2-alpha.0。
>
> AI Agent 可用 `oxn roadmap suggest --goal "<goal>" --scene <scene>` 排序匹配相关 Asset。

## 三方协作模型

OpenXenon 是工程师与 AI Agent 协作工具，为协作提供边界与证据。三方各司其职：

| 方 | 角色 | 典型动作 |
|---|---|---|
| **工程师** | Asset 管理者 + Proof 审查者 | `oxn asset create` / `oxn work create` / `oxn work status` |
| **AI Agent** | 工作执行者（via Skill） | `oxn work context` / `oxn work run` / `oxn work submit` |
| **OXN Engine** | 被动接收方（响应 CLI） | 验证 ProbeOutcome + 记录 frozen.json / trace.jsonl |

OXN 彻底不判——只记录客观事实（ProbeOutcome 三态：COMPLETED / DEVIATED / INCONCLUSIVE），判定权归工程师。

## 6 大场景

OpenXenon 的能力按 6 个场景（scene）组织，每个场景映射到对应的 Domain + Workflow + Blueprint 组合：

| 场景 | 描述 | 关键 Asset |
|---|---|---|
| **doc** | 写 / 读 / 改文档，查 OXN 是什么 | oxn-domain、doc-author、doc-prod-workflow |
| **dev** | 改代码 / 加 CLI / 演进 Asset | oxn-work-domain、dev-workflow、add-cli-subcommand |
| **debug** | Bug 修复 / frozen 异常 / hash 失配 | oxn-engine-domain、oxn-proof-domain、fix-issue |
| **test** | 写测试 / 跑测试套件 / 分析覆盖率 | oxn-work-domain、dev-workflow |
| **release** | 版本迁移 / 发版切版 / changelog | oxn-engine-domain、migrate-version、release-cut |
| **onboard** | 新人入门 / 项目全景 | oxn-domain、oxn-engine-domain、dev-workflow |

### scene: doc — 文档工程

写 / 读 / 改文档，查 OXN 是什么，找章节。

| kind | name | description |
|---|---|---|
| domain | oxn-domain | 顶层词汇边界 + 产品定位 + IAP 三阶段 |
| domain | oxn-asset-domain | Asset 生命周期 + 5 类 AssetKind + Paper 结构 |
| domain | oxn-cli-domain | CLI + i18n + Skill + VitePress 站点配置 |
| workflow | doc-author | 通用文档撰写流水线（6 slot） |
| workflow | doc-publish | Doc site build + GitHub Pages deploy |
| blueprint | doc-prod-workflow | 产品手册撰写组合模板 |
| blueprint | doc-dev-workflow | 开发手册撰写组合模板 |
| blueprint | doc-rfc-workflow | RFC/ADR 提升组合模板（drafts → docs/rfc） |

### scene: dev — 代码开发

改代码 / 加 CLI 子命令 / 演进 Asset。

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

### scene: debug — 故障修复

frozen.json 异常 / Probe DEVIATED / hash 失配 / 回归。

| kind | name | description |
|---|---|---|
| domain | oxn-engine-domain | L0-L3 架构边界（防 Kernel IO）+ IAPError 错误契约 |
| domain | oxn-proof-domain | ProbeOutcome 三态 + InterferenceFlag + 验证 ≠ 评判 |
| workflow | fix-issue | Bug 复现 + 定位 + 修复 + 验证 |

### scene: test — 测试工程

写测试 / 跑测试套件 / 分析覆盖率。

| kind | name | description |
|---|---|---|
| domain | oxn-work-domain | Work/Task/Part 在 Align 阶段的执行模型 |
| domain | oxn-engine-domain | L0-L3 架构约束 + 跨平台一致性 + 命名规范 |
| workflow | dev-workflow | 复用 dev-workflow（test 是 develop 阶段的 verify slot） |

### scene: release — 发版管理

版本迁移 / 发版切版 / changelog。

| kind | name | description |
|---|---|---|
| domain | oxn-engine-domain | Monorepo 双包边界（packages/cli + packages/engine） |
| domain | oxn-cli-domain | zh-CN locale + t() 翻译 |
| workflow | migrate-version | 跨版本迁移 |
| workflow | release-cut | 切版本 + changelog |

### scene: onboard — 新人入门

新贡献者第一天 / 项目全景。

| kind | name | description |
|---|---|---|
| domain | oxn-domain | 顶层产品定位 + 三方协作模型 |
| domain | oxn-engine-domain | L0-L3 架构核心 |
| domain | oxn-asset-domain | Asset create/evolve/archive 词汇 |
| workflow | dev-workflow | 第一个跑通的 workflow |

## 场景速查

| 目标关键词 | 场景 |
|---|---|
| write / read / doc / chapter / manual / guide | `doc` |
| code / cli / subcommand / implement / refactor / evolve / asset / git / branch | `dev` |
| bug / error / fail / frozen / mismatch / regression / hash / deviation | `debug` |
| test / coverage / assertion | `test` |
| version / release / cut / changelog / migrate | `release` |
| new / start / overview / project / architecture | `onboard` |

## CLI 用法

```bash
# 列出所有 Roadmap
oxn roadmap list

# 查看完整 Roadmap
oxn roadmap show oxn-system

# 查看单个场景
oxn roadmap show oxn-system --scene dev

# AI Agent：场景内排序匹配
oxn roadmap suggest --goal "Add new CLI subcommand" --scene dev --top 3

# Asset 变更后：检测 dangling link（手动，默认 dry-run）
oxn roadmap sync oxn-system --scene doc --dry-run
oxn roadmap sync oxn-system --scene doc --apply   # 实际修改
```

## 自举验证

OpenXenon 用 OpenXenon 管理自己的开发过程：

| 级别 | 定义 | 状态 |
|---|---|---|
| L1 编译自举 | `bun run build` → `oxn` 可执行 | ✅ |
| L2 资产自举 | Domain / Blueprint / Work / Task 全链路跑通 | ✅ |
| L2+ DSL 自举 | Grammar → Schema → Validator → Generator 联动 | ✅ |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 进行中 |

## 版本与变更

当前版本：**v0.6.2-alpha.0**（见 `package.json`）。

变更日志片段存放在 `.changes/` 目录，按版本号组织。发布新版本时运行：

```bash
bun run version:check
bun run version:sync
```

## → 参考

- [Introduction](./introduction.md) — OpenXenon 的愿景与定位
- [IAP 范式与协作通道](./concepts/iap-paradigm.md) — 核心范式深入
- [CLI 参考](./reference/cli-user-guide.md) — 完整 oxn 命令清单
