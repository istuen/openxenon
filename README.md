# OpenXenon

> 探索工程师意图如何成为 AI 工程里的资产。

一个实验性框架，尝试用物理约束让 AI 的工程行为可验证。
我们还在摸索：约束到底能提升多少 AI 的执行质量？资产化能否让 AI 越用越好？

## 当前状态

⚠️ **0.1 — 探索阶段**

- [x] AI 能在 Forge 约束下生成 Draft 资产
- [x] 内置资产编译进二进制，随处可用
- [x] CLI 直连模式（不依赖 Daemon）
- [ ] 自举验证（L2）：AI 完成完整的 Forge→Task→Verify 循环
- [ ] 质量度量：约束是否真的提升了 AI 的执行质量

## 核心假设

| # | 假设 | 验证方式 | 当前信心 |
|---|------|----------|----------|
| H1 | AI 在约束下生成的资产质量高于自由生成 | 对比有无约束的 Draft 通过率 | 待验证 |
| H2 | 资产可以积累和复用，不是一次性的 | 度量跨任务的资产复用率 | 待验证 |
| H3 | 工程师意图可以系统性地转化为可验证资产 | 完成 L3 质量自举 | 待验证 |
| H4 | 物理约束架构（三权分立）是必要的 | 去掉约束后 AI 执行质量下降 | 待验证 |

**如果 H4 被证伪——去掉约束 AI 也一样好——那整个项目的存在价值就是零。这正是探索的意义：验证假设，而不是预设结论。**

## 自举验证

| 级别 | 定义 | 状态 |
|------|------|------|
| L1 编译自举 | `pnpm build` 产出的二进制能执行 `oxn forge probe` | ✅ |
| L2 资产自举 | AI 通过 Skills 完成 Forge→Draft→Promote→Task→Verify 全链路 | ⚠️ 待验证 |
| L3 质量自举 | OpenXenon 自身的开发过程通过 OpenXenon 管理 | 0.2 目标 |

**0.1 的目标 = L2 通过。**

## 快速开始

```bash
pnpm install && pnpm build
./dist/oxn init
./dist/oxn arsenal list
./dist/oxn forge probe
```

## CLI 速查

| 命令 | 描述 | 依赖 Daemon |
|------|------|-------------|
| `oxn init` | 初始化项目，建立物理围栏 | ❌ |
| `oxn forge <type>` | 查看元 Forge 约束（probe/proof/stage/blueprint/all） | ❌ |
| `oxn forge <type> -s -n <name>` | 锻造并保存 Draft 资产 | ❌ |
| `oxn arsenal list` | 列出标准资产 | ❌ |
| `oxn arsenal inspect` | 查看资产内容 | ❌ |
| `oxn arsenal promote` | DRAFT → CANONICAL | ❌ |
| `oxn arsenal search` | 搜索资产（通过 Daemon Registry） | ✅ |
| `oxn task submit` | 提交 Blueprint 创建任务 | ❌ |
| `oxn task next` | 获取下一个待执行 Stage | ❌ |
| `oxn task verify` | 提交 Stage 验证 | ❌ |
| `oxn task status` | 获取任务状态 | ❌ |
| `oxn export` | 导出 task-trace.yaml | ❌ |
| `oxn gc` | 清理已完成任务的旧资产 | ❌ |
| `oxn daemon` | 管理全局 Core 引擎生命周期 | — |

**全局选项**: `-v, --verbose` | `-j, --json`

0.1 阶段仅 `arsenal search` 需要 Daemon，其余全部 CLI 直连可用。

## 架构概要

```
工程师意图 ──▶ Forge（约束）──▶ AI 生成 Draft ──▶ Schema 校验 ──▶ Promote ──▶ Canonical 资产
                                                                    │
                                                                    ▼
Blueprint ──▶ Stage ──▶ Probe（物理观测）──▶ Kernel（纯函数评判）──▶ Verdict
```

三层物理隔离：

- **Kernel（兰姆达真空）**：纯函数，零副作用，只做符号归约
- **Infra（图灵机边界）**：唯一触碰物理硬件的组件
- **Arsenals（出厂 ROM）**：内置资产，编译进二进制

详见 [architecture.md](docs/architecture.md)。

## License

MIT
