## 1. 分析当前 commands

- [x] 1.1 列出所有 `src/cli/*.ts` 命令文件
- [x] 1.2 检查每个文件是否直接导入了 `engine`、`kernel`、`daemon` 等模块 - 无业务逻辑导入
- [x] 1.3 确认业务逻辑应该在哪里 - handlers 通过 socket-client 与 daemon 通信

## 2. 重构 commands

- [x] 2.1 CLI commands 已经只调用 handler 层（无直接 daemon 调用）
- [x] 2.2 task commands 尚未实现，无需重构
- [x] 2.3 其他命令（forge, draft 等）已是薄层，只做本地文件操作

## 3. 移除非法导入

- [x] 3.1 `grep -r "from.*engine\|from.*daemon" src/cli/` 返回空
- [x] 3.2 只有 kernel 路径工具导入，符合架构

## 4. 验证

- [x] 4.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 4.2 `grep -r "from.*(engine|daemon)" src/cli/` 返回空
- [x] 4.3 CLI 命令结构符合薄层架构
