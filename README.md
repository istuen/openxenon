# OpenXenon

> 探索如何让工程师与 AI 更有效地协作——在沉淀经验、控制成本的前提下，做有质量的软件工程。

AI 模型是推测性的、不可控的、会出现幻觉，但执行效率和探索能力极高。
工程师懂业务需求和技术实现，并持续积累经验。
OpenXenon 要解决的问题是：**如何把工程师的经验转化为 AI 能理解并执行的指令，同时降低 Token 成本。**

## 当前状态

⚠️ **0.1 — 探索阶段**

- [x] AI 能在 Forge 约束下生成 Draft 资产
- [x] 内置资产编译进二进制，随处可用
- [x] CLI 直连模式（不依赖 Daemon）
- [ ] 自举验证（L2）：Forge→Task→Verify 全链路跑通

## 自举验证

| 级别 | 定义 | 状态 |
|------|------|------|
| **L1 编译自举** | `pnpm build` 产出的二进制能执行 `oxn forge probe` | ✅ |
| **L2 资产自举** | Forge→Draft→Promote→Task→Verify 全链路跑通 | ⚠️ 待验证 |
| **L3 质量自举** | OpenXenon 自身的开发过程通过 OpenXenon 管理 | 0.2 目标 |

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
| `oxn init` | 初始化项目，建立项目围栏 | ❌ |
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
| `oxn daemon` | 管理 Daemon 进程生命周期 | — |

**全局选项**: `-v, --verbose` | `-j, --json`

0.1 阶段仅 `arsenal search` 需要 Daemon，其余全部 CLI 直连可用。

## 架构概要

```
工程师经验 ──▶ Forge（约束定义）──▶ AI 生成 Draft ──▶ Schema 校验 ──▶ Promote ──▶ Canonical 资产
                                                                                    │
                                                                                    ▼
Blueprint ──▶ Stage ──▶ Probe（执行观测）──▶ Kernel（纯函数判定）──▶ Verdict
```

三层分离：

- **Kernel**：纯函数，零副作用，只做逻辑判定
- **Infra**：唯一触碰文件系统和进程的组件
- **Arsenals**：内置资产，编译进二进制

详见 [architecture.md](docs/architecture.md)。

## License

MIT
