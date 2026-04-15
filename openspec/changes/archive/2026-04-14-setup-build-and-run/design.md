## Context

Xenonix 是一个面向大语言模型的工程化控制引擎，已完成核心架构设计，包括类型定义、数据库操作、文件监听和验证系统。当前项目结构包含 `src/`、`tests/`、`docs/` 等目录，但缺乏项目配置文件，无法安装依赖、打包和运行。

**当前状态**：
- 源码结构完整（src/types, src/core, src/db, src/watcher, src/verification）
- 测试文件就绪（tests/）
- 文档完善（docs/, README.md）
- 缺乏 package.json、tsconfig.json、.gitignore 等配置文件
- 缺乏 CLI 入口和构建脚本

**约束**：
- 运行时：Bun（追求冷启动毫秒级、单一可执行文件）
- 包管理器：pnpm（快速、磁盘空间高效）
- 类型系统：TypeScript Strict Mode
- 构建产物：单一可执行文件（支持跨平台）

## Goals / Non-Goals

**Goals:**

- 创建完整的 package.json，定义项目元数据、依赖和脚本
- 使用 pnpm 安装项目依赖
- 配置 tsconfig.json，启用 TypeScript Strict Mode
- 创建 CLI 入口文件，支持 `xn` 命令
- 配置 Bun 构建，打包为单一可执行文件
- 添加开发、构建、测试、清理等脚本
- 创建 .gitignore，排除构建产物和依赖目录

**Non-Goals:**

- 不涉及 CLI 命令的具体实现（如 `xn init`, `xn daemon` 等）
- 不涉及 API 端点的实现
- 不涉及 Proof 探针的具体实现
- 不涉及 CI/CD 配置

## Decisions

### 1. 包管理器选择

**决策：使用 pnpm 作为包管理器**

**理由：**
- 磁盘空间高效：使用硬链接和符号链接，避免重复下载
- 安装速度快：并行安装，性能优于 npm 和 yarn
- 严格的依赖管理：避免幽灵依赖（phantom dependencies）
- lockfile 稳定：pnpm-lock.yaml 可预测且可重现

**备选方案：**
- 方案 B: 使用 npm - 拒绝理由：磁盘空间占用大，安装速度慢
- 方案 C: 使用 yarn - 拒绝理由：yarn 1 的幽灵依赖问题，yarn 2 的 PnP 兼容性问题

### 2. 构建工具选择

**决策：使用 Bun 内置构建功能**

```bash
bun build ./src/cli.ts --compile --outfile dist/xn
```

**理由：**
- Bun 原生支持 TypeScript，无需额外编译步骤
- 支持打包为单一可执行文件（`--compile`）
- 毫秒级构建速度
- 支持跨平台构建（Linux、macOS、Windows）
- 零配置，开箱即用

**备选方案：**
- 方案 B: 使用 esbuild - 拒绝理由：需要额外配置，不支持直接生成可执行文件
- 方案 C: 使用 webpack - 拒绝理由：配置复杂，构建速度慢
- 方案 D: 使用 tsx + ncc - 拒绝理由：流程复杂，需要多个工具配合

### 3. CLI 框架选择

**决策：使用 Citty 作为 CLI 框架**

```typescript
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'xn',
    version: '1.0.0',
    description: 'Xenonix CLI - 工程化控制引擎'
  },
  subCommands: {
    init: () => import('./commands/init'),
    daemon: () => import('./commands/daemon'),
    // ...
  }
})

runMain(main)
```

**理由：**
- Unjs 生态下的极简工具
- 类型推导完美，TypeScript 支持优秀
- 支持嵌套子命令（`xn daemon start`）
- 自动生成帮助信息
- 轻量级，零外部依赖

**备选方案：**
- 方案 B: 使用 Commander.js - 拒绝理由：类型支持不如 Citty
- 方案 C: 使用 yargs - 拒绝理由：配置冗长，类型推导弱
- 方案 D: 自己实现 - 拒绝理由：重复造轮子，增加维护成本

### 4. TypeScript 配置

**决策：使用 Strict Mode + ESNext**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**理由：**
- `strict: true` 启用所有严格类型检查
- `target: ESNext` 使用最新 JavaScript 特性
- `moduleResolution: bundler` 适配 Bun 构建
- `noEmit: true` 因为 Bun 负责编译，tsc 只做类型检查
- `bun-types` 提供 Bun 特定类型的类型定义

### 5. 项目结构

**决策：采用标准 CLI 项目结构**

```
xenonix/
├── src/
│   ├── cli.ts                 # CLI 入口
│   ├── commands/              # CLI 命令实现
│   │   ├── init.ts
│   │   ├── daemon.ts
│   │   └── ...
│   ├── core/                  # 核心逻辑
│   ├── db/                    # 数据库操作
│   ├── types/                 # 类型定义
│   ├── verification/          # 验证系统
│   └── watcher/               # 文件监听
├── tests/                     # 测试文件
├── docs/                      # 文档
├── package.json               # 项目配置
├── tsconfig.json              # TS 配置
├── .gitignore                 # Git 忽略规则
└── README.md                  # 项目说明
```

### 6. NPM Scripts 设计

**决策：定义清晰的脚本命令**

```json
{
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun build ./src/cli.ts --compile --outfile dist/xn",
    "build:linux": "bun build ./src/cli.ts --compile --target=bun-linux-x64 --outfile dist/xn-linux",
    "build:macos": "bun build ./src/cli.ts --compile --target=bun-darwin-x64 --outfile dist/xn-macos",
    "build:windows": "bun build ./src/cli.ts --compile --target=bun-windows-x64 --outfile dist/xn.exe",
    "build:all": "bun run build:linux && bun run build:macos && bun run build:windows",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist node_modules",
    "prepublishOnly": "bun run build"
  }
}
```

## Risks / Trade-offs

**风险 1: Bun 稳定性**
- 风险：Bun 相对较新，可能存在未知 bug
- 缓解：保持 Bun 版本更新，测试覆盖关键路径

**风险 2: 跨平台兼容性**
- 风险：单一可执行文件在不同平台可能有差异
- 缓解：在 Linux、macOS、Windows 上分别测试

**风险 3: Citty 生态成熟度**
- 风险：Citty 相对小众，社区支持有限
- 缓解：评估备选方案（Commander.js），必要时可迁移

**权衡: 简单性 vs 功能性**
- 选择：优先简单性，牺牲部分高级功能
- 理由：CLI 工具的核心价值在于易用性

**权衡: 构建速度 vs 包大小**
- 选择：优先构建速度，接受稍大的可执行文件
- 理由：开发者体验优先，分发时可接受几 MB 的文件大小

## Migration Plan

**部署步骤：**

1. 创建 package.json 和 tsconfig.json
2. 安装依赖：`pnpm install`
3. 创建 CLI 入口文件（src/cli.ts）
4. 创建基础命令结构（src/commands/）
5. 运行类型检查：`pnpm typecheck`
6. 运行测试：`pnpm test`
7. 本地构建：`pnpm build`
8. 测试可执行文件：`./dist/xn --help`

**回滚策略：**
- 删除 package.json、tsconfig.json、.gitignore
- 删除 node_modules、dist 目录
- 恢复到纯 TypeScript 源码状态

## Open Questions

1. 是否需要支持全局安装（`pnpm install -g`）？
   - 当前决策：先支持本地构建，后续可发布到 npm

2. 是否需要支持 TypeScript 项目引用（Project References）？
   - 当前决策：暂不需要，项目规模较小

3. 是否需要配置 ESLint/Prettier？
   - 当前决策：暂不配置，依赖 Bun 的内置格式化

4. 是否需要配置 Husky 提交钩子？
   - 当前决策：暂不配置，依赖 CI 进行代码质量检查
