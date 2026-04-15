## 1. 命令实现

- [x] 1.1 在 `src/commands/daemon.ts` 添加 `restartCommand` 定义
- [x] 1.2 实现 restart 逻辑：停止 -> 启动（忽略"未运行"错误）
- [x] 1.3 在 subCommands 中注册 restart 命令

## 2. 测试验证

- [x] 2.1 手动测试：daemon 运行时执行 restart
- [x] 2.2 手动测试：daemon 未运行时执行 restart
- [x] 2.3 手动测试：验证健康检查耗时显示
