# 7. 从源码构建

## 环境要求

- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

## 构建步骤

### 1. 克隆仓库

```bash
git clone https://forgejo.isteed.dev/issac/openxenon.git
cd openxenon
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 运行开发模式

```bash
# 直接运行 CLI（无需编译）
pnpm dev -- --help

# 或运行测试
pnpm test
```

### 4. 构建可执行文件

```bash
# 为当前平台构建
pnpm build

# 为所有平台构建
pnpm build:all

# 或分别构建
pnpm build:linux   # Linux x64
pnpm build:macos   # macOS x64
pnpm build:windows # Windows x64
```

### 5. 运行构建产物

```bash
./dist/oxn --help
```

## 开发脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 以开发模式运行 CLI |
| `pnpm build` | 构建当前平台的可执行文件 |
| `pnpm build:all` | 构建所有平台的可执行文件 |
| `pnpm test` | 运行测试套件 |
| `pnpm test:watch` | 监听模式运行测试 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm clean` | 清理构建产物和依赖 |

## 项目结构

```
openxenon/
├── src/
│   ├── cli/          # CLI 命令实现
│   ├── daemon/       # Daemon（0.2 目标）
│   ├── kernel/       # 核心逻辑层（纯函数）
│   ├── infra/        # 基础设施层
│   └── skills/       # Skill 源码（AI 读取）
├── docs/
│   ├── manual/       # 用户文档
│   └── architecture.md # 架构设计
└── dist/             # 构建产物
```

## 贡献指南

1. Fork 仓库并创建分支
2. 遵循项目代码风格（TypeScript strict mode）
3. 确保 `pnpm typecheck` 和 `pnpm test` 通过
4. 提交 Pull Request

## 下一章

上一章介绍了 [故障排查](./06-troubleshooting.md)。