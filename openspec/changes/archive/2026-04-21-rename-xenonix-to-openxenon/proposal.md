## Why

当前代码中使用 `Xenonix` 作为项目名和品牌名，但根据 OpenXenon 术语规范，应该使用 `OpenXenon` 作为正式品牌名。package.json 中的项目名也需要更新。

## What Changes

- package.json: `xenonix` → `openxenon`
- 接口名: `XenonixSkill` → `OpenXenonSkill`
- 所有代码中的品牌引用
- 文档中的品牌引用

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `openxenon-branding`: 将 Xenonix 品牌名统一为 OpenXenon

## Impact

- `package.json` - name 字段
- `src/skills/types.ts` - 接口名
- `src/skills/index.ts` - 导出
- `src/core/skill-compiler.ts` - 类型引用
- `src/adapters/*.ts` - 类型引用
- `src/cli.ts` - description
- `src/server.ts` - 日志
- `src/commands/daemon.ts` - 日志输出
- `src/skills/oxn-*.ts` - 文档
- 文档文件 - docs/, openspec/