# OpenXenon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-orange)](https://bun.sh)

> **OpenXenon 是把领域知识结构化为 AI Agent 协作确定性源的工具。**（D24，RFC-0032）

OpenXenon 通过工程师定义 Asset（Domain / Workflow / Stack，由 Blueprint 组合），作为 AI Agent 在 Work 约束的协作边界，由 Probe 检查 AI Agent 产物（D27，RFC-0032）。

- 🇨🇳 **完整中文文档**：[product/zh-cn/introduction](https://github.com/istuen/openxenon/blob/main/docs/product/zh-cn/introduction.md) · [VitePress 站点](https://istuen.github.io/openxenon/product/zh-cn/)
- 🇬🇧 **English docs**：[product/en/introduction](https://github.com/istuen/openxenon/blob/main/docs/product/en/architecture.md) · [VitePress site](https://istuen.github.io/openxenon/product/en/)
- 🤖 **AI Agent 入口**：见 [AGENTS.md](./AGENTS.md) + `oxn init --ai <agent>` 部署 Skill

## 5 分钟上手

```bash
git clone https://github.com/istuen/openxenon.git
cd openxenon
pnpm install --frozen-lockfile   # 包管理 pnpm；构建/测试 Bun
bun run build                     # 编译 oxn CLI 到 dist/
oxn init --ai opencode            # 注入 OpenXenon 空间 + AI Skill
```

随后在 AI Agent 中调用：

```
/oxn-work 验证 src/index.ts 是否存在
```

## 核心范式（Asset + Work，D8/D10 RFC-0032）

| 实体 | 角色 | 产出 | 锁定机制 |
|---|---|---|---|
| **Asset** | 工程师 | Domain / Workflow / Stack / Blueprint / AssetMap | `term` / `ban` / `invariant` 锁定边界 |
| **Work** | 工程师 ↔ AI | Work / Task / Part（DAG） | submit 时刻算 hash 指纹 + DRIFT 事件（可观测不阻断，RFC-0033 D3/D4） |
| **Probe** | AI Agent（经 CLI） | ProbeOutcome（记 Work trace） | 工具能力，不产 frozen（D27） |

> IAP（Intent/Align/Proof）退役到理念叙事层（D10，RFC-0032）；实现术语为 Asset/Work/Probe。OXN 不评判合格——判定权归工程师。

## 架构

```
openxenon/
├── packages/
│   ├── engine/         ← L0-L2 引擎（Asset / Work / Probe / Draft）
│   └── cli/             ← L3 CLI（oxn 命令族）
├── src/                 ← 保留: builtin/ + watcher/
├── docs/                ← 文档（VitePress 站点源）
├── dev/                 ← 维护者手册
├── .openxenon/          ← 工程工作台（Asset / Work / Draft / Probe）
└── .opencode/           ← AI Skill 编译产物
```

详见 [架构总览](docs/dev/zh-cn/architecture.md) + [v0.6 RFC-0018](docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md)。

## 路线图

| 版本 | 目标 | 状态 |
|---|---|---|
| **v0.1.8** | IAP 范式 / 打造闭环 / 自举实践 | ✓ 已发布 npm |
| **v0.2.0** | Proof First / Infra Probe | ✓ 已发布 npm |
| **v0.3.0** | MD-Native 资产 / Daemon | ✓ 已发布 npm |
| **v0.4.0** | OXL 1.3 + 三层架构 | ✓ 已发布 npm |
| **v0.5.0** | Proof Insight Loop | ⚠️ v0.5+ 暂停发布 |
| **v0.6.x** | E1-E4 + L0-L3 + Monorepo 双包 | ⚠️ v0.5+ 暂停发布 |

详细变更见 [`.changes/`](.changes/)。

## 贡献

[GitHub Issues](https://github.com/istuen/openxenon/issues) · 详细开发指南见 [`docs/dev/zh-cn/`](docs/dev/zh-cn/) · 维护者操作见 [`dev/`](dev/)

## 许可证

[MIT](./LICENSE)