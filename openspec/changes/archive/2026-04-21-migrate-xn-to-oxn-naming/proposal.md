## Why

当前代码架构与 README 文档存在命名不一致：
- CLI 命令使用 `xn`，但 README 规范用 `oxn`
- 目录用 `.xenonix`，但 README 规范用 `.openxenon`
- 数据库用 `.db`，但 README 规范用 `.oxn`

需要统一命名以匹配正式规范。

## What Changes

- CLI 命令：`xn` → `oxn`
- 目录名：`.xenonix` → `.openxenon`
- 数据库文件：`*.db` → `*.oxn`
- Skills 文件：`xn-*.ts` → `oxn-*.ts`

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `oxn-naming-migration`: 将现有命名迁移至规范

## Impact

- `package.json` - bin 定义
- `src/core/global.ts` - 全局目录常量
- `src/core/project.ts` - 项目目录常量
- `src/skills/xn-*.ts` - 7 个 skills 文件
- 测试文件 - 需同步更新