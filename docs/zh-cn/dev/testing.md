---
title: 测试策略
---

# 测试策略

> Y 方案测试布局 + per-test concurrent + E2E 串行。

## 测试规模

- **~1487 个测试 / 119 个文件**
- 运行：`bun test`（默认并行）
- 单文件：`bun test packages/cli/src/__tests__/work-migrate-e2e.test.ts`

## Y 方案布局

| 目录 | 类型 | 说明 |
|---|---|---|
| `packages/engine/src/<mod>/__tests__/` | 模块单元 | 每个 DDD 模块的单元测试 |
| `tests/architectural/` | 架构守卫 | L0-L3 宪法越界检测 |
| `tests/integration/` | 跨层集成 | 跨模块 / 跨层交互 |
| `packages/cli/src/__tests__/*-e2e.test.ts` | CLI E2E | 黑盒命令行测试 |

## 并发策略

`bunfig.toml` 配置：

- **大多数套件**：`concurrentTestGlob` 启用 per-test concurrent（文件内并发）
- **E2E 和 `tests/integration/**`**：刻意**串行**（共享 `/tmp/oxn-…` 与 `.openxenon/` 缓存）
- `retry = 1`：吸收已知的 `work-migrate-e2e` 抖动

## 测试约定

- 生成文件与测试文件已被 `tsconfig` 与 biome 排除
- 不要在测试文件中加入生产代码
- `__tests__/` 下的测试文件在依赖脚本中豁免（`isInTestsDirectory`）

## 参考

- [AGENTS.md §测试布局](../../../AGENTS.md#测试布局y 方案) — 完整布局
