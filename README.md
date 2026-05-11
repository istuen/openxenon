# OpenXenon
> 演化工程意图，收敛 AI 推理，实现软件交付。

面向大语言模型的工程化控制引擎。通过物理约束和机械验证，将不可靠的 AI 能力转化为可靠、可追溯的软件实体。

## 快速开始

```bash
# 1. 安装 CLI
pnpm install -g @istuen/openxenon

# 2. 启动全局 Core
oxn daemon start

# 3. 初始化项目
oxn init

# 4. 在 AI 助手中输入 /oxn-task 开始工作
```

## CLI 速查

| 命令 | 描述 |
|------|------|
| `oxn daemon start` | 启动全局 Core |
| `oxn init` | 初始化项目围栏 |
| `oxn task new <name>` | 创建任务 |
| `oxn task submit <id>` | 提交任务到 Core |
| `oxn task status <id>` | 查看任务状态 |
| `oxn arsenal list` | 列出标准资产 |
| `oxn arsenal promote <path>` | DRAFT → CANONICAL |

完整命令参考：[docs/manual/04-cli-ref.md](docs/manual/04-cli-ref.md)

## 文档导航

| 文档 | 说明 |
|------|------|
| [docs/manual/01-intro.md](docs/manual/01-intro.md) | 系统介绍 |
| [docs/manual/02-concepts.md](docs/manual/02-concepts.md) | 核心概念（Blueprint、Arsenal、Stage、Proof） |
| [docs/manual/03-lifecycle.md](docs/manual/03-lifecycle.md) | 完整生命周期 + 交互流程图 |
| [docs/manual/04-cli-ref.md](docs/manual/04-cli-ref.md) | CLI 完整参考 |
| [docs/manual/05-arsenal.md](docs/manual/05-arsenal.md) | Arsenal 资产生成 |
| [docs/manual/06-troubleshooting.md](docs/manual/06-troubleshooting.md) | 故障排查 |
| [docs/manual/07-dev.md](docs/manual/07-dev.md) | 从源码构建 |
| [docs/architecture.md](docs/architecture.md) | 架构设计（单一真相源） |

## 从源码构建

### 环境要求
- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/istuen/openxenon.git
cd openxenon

# 安装依赖
pnpm install

# 构建
pnpm build

# 运行
./dist/oxn --help
```

### 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式运行 CLI |
| `pnpm build` | 构建当前平台 |
| `pnpm test` | 运行测试 |
| `pnpm typecheck` | TypeScript 类型检查 |