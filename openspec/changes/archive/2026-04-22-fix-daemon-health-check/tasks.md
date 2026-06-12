## 1. 修复 health-check.ts

- [x] 1.1 修复 socket 协议格式（换行符分隔的 JSON）
- [x] 1.2 添加响应数据解析和验证
- [x] 1.3 增加调试日志

## 2. 测试 daemon 命令

- [x] 2.1 测试 `oxn daemon start` 启动成功
- [x] 2.2 测试 `oxn daemon stop` 停止成功
- [x] 2.3 测试 `oxn daemon status` 查看状态

## 3. 测试 task 命令

- [x] 3.1 测试 `oxn task new` 输出模板
- [x] 3.2 测试 `oxn task list` 列出任务
- [x] 3.3-3.7 task status/start/stop/trace/next 添加 projectPath

## 4. 测试其他 CLI 命令

- [x] 4.1 测试 `oxn proof-list` 列出 Proof
- [x] 4.2 测试 `oxn init` 初始化项目
- [x] 4.3 测试 `oxn --help` 帮助信息
- [x] 4.4 测试 `oxn --json` 全局 JSON 输出
- [x] 4.5 测试 `oxn --verbose` 详细输出