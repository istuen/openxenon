## Why

当前 `src/cli/commands/` 中的命令定义可能耦合了业务逻辑。CLI 命令应该只负责：
1. 解析命令行参数
2. 调用正确的 handler
3. 格式化输出

不应该包含任何业务逻辑（task 执行、probe 评判等）。

## What Changes

1. 分析当前 `src/cli/commands/*.ts`
2. 移除任何业务逻辑（直接调用 Daemon/engine/kernel）
3. 统一使用 handler 层作为入口

## Impact

- CLI 层更薄，职责更清晰
- 便于 CLI 独立测试和 Mock

## High Risk

- 低风险，重构而非功能变更
