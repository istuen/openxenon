## Why

Xenonix 项目已完成核心架构设计和类型定义，但缺乏项目配置文件（package.json）和构建脚本，无法安装依赖、打包构建和运行。现在需要建立完整的项目构建流程，使项目可以作为一个可执行的 CLI 工具进行分发和使用。

## What Changes

- 创建 `package.json` 文件，定义项目元数据、依赖和脚本
- 使用 pnpm 作为包管理器安装项目依赖
- 配置 Bun 构建脚本，打包为单一可执行文件
- 创建 CLI 入口文件，支持 `xn` 命令
- 配置 TypeScript 编译选项（tsconfig.json）
- 添加开发、构建、测试等脚本命令
- 创建 .gitignore 文件

## Capabilities

### New Capabilities

- `package-config`: 项目配置管理能力，定义依赖、脚本和构建配置
- `cli-entry`: CLI 命令行入口能力，支持 `xn` 命令交互
- `build-system`: 构建系统配置能力，支持 Bun 打包为可执行文件

### Modified Capabilities

无现有能力需要修改。

## Impact

- 影响整个项目的构建和分发流程
- 引入 pnpm 作为包管理器
- 引入 Bun 作为构建工具和运行时
- 增加项目配置文件和构建产物
- 影响开发者的本地开发体验
