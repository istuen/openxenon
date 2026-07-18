---
title: 入门
---

# 入门（环境 + 仓库布局）

> 搭建 OpenXenon 开发环境，理解仓库结构。

## 环境要求

- **Bun** ≥ 1.0（包管理器 + 运行时 + 测试器）
- **Node.js** ≥ 18（部分工具链兼容）
- **Git**（lefthook pre-commit 集成）

## 快速开始

```bash
git clone https://github.com/istuen/openxenon.git
cd openxenon
bun install --frozen-lockfile
bun run build          # build:clean + build:dist
bun test               # ~1487 个测试
bun run lint           # ESLint 架构守卫
bun run typecheck      # tsc --noEmit
```

## 仓库布局

```
openxenon/
├── packages/
│   ├── cli/            @openxenon/cli     L3 薄壳（citty + i18next）
│   └── engine/         @openxenon/engine  L0-L2 + daemon
├── src/
│   ├── builtin/        运行时加载的 .md 资产（probes / blueprints）
│   ├── daemon/         守护进程（残留，待迁入 engine）
│   └── watcher/        文件监听（残留，待迁入 engine）
├── docs/               对外 SSOT（产品手册 + 开发手册）
├── .openxenon/         工程工作台（Asset / 工作流 / 运行时产物）
├── scripts/            构建 + 校验脚本
└── .changes/           版本 changelog 片段
```

## 工具链

| 工具 | 用途 | 命令 |
|---|---|---|
| Biome | 格式化 + lint | `bun run check` / `bun run format` |
| ESLint | 架构守卫（L0-L3 越界检测） | `bun run lint` |
| TypeScript | 类型检查 | `bun run typecheck` |
| Bun test | 测试（~1487 个） | `bun test` |
| Lefthook | Git hooks（pre-commit / pre-push） | `bun run prepare` 安装 |

## 参考

- [AGENTS.md §构建/校验](../../../AGENTS.md#构建--校验) — 完整命令参考
- [架构总览](./architecture) — E1-E4 + L0-L3 全景
