# OpenXenon

[English](./README.en.md) [简体中文](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## 什么是 OpenXenon

> **OpenXenon 是工程师与 AI Agent 协作工具，为协作提供边界与证据。**

OpenXenon 是一款面向 AI Agent 的人机协作工具。
它作为 Skills 注入现有的 AI Agent 工作台（如 Cursor、OpenCode、Codex、Claude Code）中。
它专注于为工程师与 AI Agent 的协作提供**边界**（Asset 资产约束）与**证据**（Proof 客观事实记录）。
OXN 不评判"工作是否合格"——判定权归工程师，OXN 只提供不可篡改的证据让工程师基于事实决策。

## 为什么做 OpenXenon

在开始用 AI Agent 编程时，其表现令人惊艳。在出色完成工作之余，确实能让人感受到“数字助手”带来的美妙体验。
但当这位“数字助手”进入深度与长时间的持续开发时，情况开始变化：上下文漂移、擅改工作范围外的代码、甚至虚假完成等意外情况不断冒出。
在耗费大量精力为其纠正与返工后，我开始思考：“如何让 AI 模型能构建真正符合意图的软件工程？”
特别是“数字助手”会越来越聪明，但其底层的概率原理决定了意外状况依然会重复出现。
工程师如何信任 AI 的工作成果，同时又能让其充分释放能力？这正是 OpenXenon 探索的方向。

## 5 分钟上手

### 安装

```bash
git clone https://github.com/istuen/openxenon.git
cd openxenon
bun install
```

> [!TIP]
> 仓库 v0.5+ 起不再发布到 npm。需要 git clone + bun install 本地开发。`dist/cli.js` 是 Bun 编译产物，可通过 `bun run build` 构建。


### 在项目注入 OpenXenon 空间与 Skills



```bash
# cd youer/project
oxn init --ai opencode
```

### 在 AI Agent 中调用

```
/oxn-work 验证 src/index.ts 是否存在（v0.6 之后入口已改为 packages/cli/src/index.ts）
```

## AI Agent 集成

`oxn init --ai <agent>` 一步生成对应 Skill，AI 助手即可调用 `oxn` CLI。

| AI Agent        | 初始化命令               | Skill     | 状态   |
| --------------- | ------------------------ | --------- | ------ |
| **OpenCode**    | `oxn init --ai opencode` | `/oxn-work` | ✓ 支持 |
| **Claude Code** | `oxn init --ai claude`   | `/oxn-work` | ✓ 支持 |
| **Codex**       | `oxn init --ai codex`    | `/oxn-work` | ✓ 支持 |
| **Cursor**      | `oxn init --ai cursor`   | `/oxn-work` | ✓ 支持 |

> v0.6 起 Skills 收敛为唯一 `/oxn-work`（IAP 范式统一入口）。原 `oxn-cli` / `oxn-proof` 已删除。

## IAP 范式

### 协作流水线（工程师 ↔ AI Agent ↔ OXN Engine）

| 阶段 | 角色 | 产出 | 锁定机制 |
|---|---|---|---|
| **Intent**（定意图） | 工程师 | Domain / Blueprint / Stack | `term` / `ban` / `invariant` 锁定边界（planLock + content_hash）|
| **Align**（跑对齐） | AI Agent | Work / Task / Part | Blueprint `slot` 锁定路径，AI 不得修改 Asset |
| **Proof**（出证据） | OXN Engine | Proof（`frozen.json` + `outcome` 聚合结构）| 不可篡改（chmod 0o444 + content_hash）|

> **OXN Engine 记录事实，不评判合格**——它记录"发生了什么"（脚本退出码、测试覆盖率、文件路径等客观事实），不评判"工作合格不合格"。"合格"判定属于工程师，基于 outcome 聚合结构（各状态 Probe 数量）自行判断。

### E1-E4 四结构实体（v0.6 哲学层）

| 实体  | 中文     | 性质                | 主导权  |
| ----- | -------- | ------------------- | ------- |
| E1 Asset  | 静态边界 | Domain / Blueprint / Stack | 工程师 |
| E2 Work   | 动态协作 | IAP + Round 多轮循环 | 工程师 ↔ AI Agent |
| E3 Engine | 独立公证 | 探针 + frozen.json + hash | OXN Engine |
| E4 Insight | 涌现层 | 1+1>2 整体论 + **行为特征观测** | AI 推理 |

> **E1-E4 + L0-L3**：理念层 E1-E4 解释 *为什么*，代码层 L0-L3 解释 *依赖方向*。
> 详见 [Core Concepts](./docs/zh-cn/core-concepts.md) 与 [Architecture](./docs/zh-cn/architecture.md)。

### Work 三模式 + Round 多轮

```
Work (my-feature)
├── 模式 A: Asset   — Intent 资产化（Domain/Blueprint/Stack 落盘）
├── 模式 B: Develop — Align 实战（Round 多轮 IAP 循环）
└── 模式 C: Proof   — 独立验收（frozen.json 不可篡改）

Round: oxn work next-round <name>   # 显式开启下一轮 IAP
        oxn work finalize <name>     # 汇总所有 round
```

## 架构

v0.6 起 OXN 采用 **Monorepo 双包** 结构（[v0.6 Monorepo RFC](./.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-monorepo-packages.md)）：

```
openxenon/
├── packages/
│   ├── engine/         ← L1 Infra + L2 Engine (12+ modules)
│   │                    @openxenon/engine (12+ 子模块)
│   │                    Asset / Intent / Align / Proof / Insight / Pool / Work
│   │                    errors / infra / kernel / oxl
│   └── cli/             ← L3 CLI (薄组合调用层)
│                        @openxenon/cli (38 子命令 + 8 locales)
└── src/                 ← 保留: daemon/ + builtin/ + watcher/
```

| 层级 | 物理位置 | 职责 |
|---|---|---|
| L0 Kernel | `packages/engine/src/kernel/` | 类型/常量/verdicts/catalog (Lambda 真空，**严禁概率性数学模型**) |
| L1 OXL+Infra | `packages/engine/src/{oxl,infra}/` | DSL 解析 + 文件系统 + socket + frozen |
| L2 Engine | `packages/engine/src/{Asset,Intent,Align,Proof,Insight,Pool,Work}/` | 6+1 DDD 模块, 纯函数导出 |
| L3 Tools | `packages/cli/src/commands/` + `src/daemon/` + `packages/cli/src/skills/` | CLI 薄壳 + 守护进程 + AI Skills |

> **OXN Engine 是控制结构，不是执行环境**。沙箱、CI/CD、测试通过库调用，Probe 采集结果作为证据。Engine 不关心怎么执行，只关心执行结果是否被客观记录。

## 文档

- 📖 **[文档](./docs/index.md)**
- 🟦 **[AI 协作者入口](./docs/zh-cn/llm-prompt.md)**（**仅 AI 读**）

## 路线图

| 版本 | 目标 | 状态 |
|---|---|---|
| **v0.1.8** | IAP 范式 / 打造闭环 / 自举实践 | ✓ 已发布 npm |
| **v0.2.0** | Proof First / Infra Probe | ✓ 已发布 npm |
| **v0.3.0** | MD-Native 资产 / Daemon | ✓ 已发布 npm |
| **v0.4.0** | OXL 1.3 + 三层架构 | ✓ 已发布 npm |
| **v0.5.0** | Proof Insight Loop | ⚠️ 未发布 npm（v0.5+ 暂停发布）|
| **v0.6.0** | **E1-E4 + L0-L3 + Monorepo 双包** | ⚠️ 未发布 npm（v0.5+ 暂停发布）|

> v0.6 是**架构重塑**版：从 IAP 三轴叙事重构为 E1-E4 四结构实体 + L0-L3 工程分层 + Monorepo 双包（`packages/engine` + `packages/cli`）。详见 [v0.6 IAP Refactor RFC](./.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md) 与 [Changelog](./.changes/0-6-0-iap-refactor.md)。

## 参与贡献

> 当前版本: 0.6.2-alpha.0

欢迎通过 [GitHub Issues](https://github.com/istuen/openxenon/issues) 提交 bug 报告，功能建议与交流。

## 许可证

[MIT](./LICENSE)
