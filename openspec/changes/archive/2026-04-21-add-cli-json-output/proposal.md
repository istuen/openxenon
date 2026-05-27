## Why

OpenXenon CLI 当前使用 citty 框架构建，手动使用 `console.log(JSON.stringify(...))` 输出 JSON。没有统一的 `--json` 参数支持，脚本和工具调用时无法方便地获取结构化数据。

## What Changes

- 在 CLI 入口添加全局 `--json` 参数
- 改造命令输出逻辑，支持 JSON 格式输出
- 使用 zod 定义 CLI 输出 Schema，验证数据结构

## Capabilities

### New Capabilities
- `cli-json-output`: CLI 全局支持 `--json` 参数输出 JSON 格式
- `cli-output-schema`: 使用 zod 定义 Task-Blueprint-Stage 的输出 Schema

### Modified Capabilities
- 无

## Impact

- 修改 `src/cli.ts` 添加全局参数
- 可能需要创建 `src/types/schemas/` 存放 zod Schema
- 需要检查所有子命令的输出逻辑