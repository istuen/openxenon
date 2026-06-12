## 1. 统一状态值为大写

- [x] 1.1 修改 `src/api/handlers/task-stop.ts:31` 将 `'failed'` 改为 `'FAILED'`
- [x] 1.2 检查其他调用 `updateTaskStatus` 的地方是否使用小写，一并修复
- [x] 1.3 验证 `oxn task stop` 后任务状态正确更新为 FAILED

## 2. 修复 Core 直接使用 process.cwd() 获取项目路径

- [x] 2.1 修改 `src/api/socket-server.ts`，直接使用 `process.cwd()` 获取项目路径
- [x] 2.2 不依赖 CLI 传递 projectPath 参数
- [ ] 2.3 验证 `oxn api step-start` 不再返回 "Invalid project" 错误

## 3. 实现任务目录创建

- [x] 3.1 在 `src/api/handlers/task-start.ts` 中添加任务目录创建逻辑
- [x] 3.2 在任务目录中创建初始 `step-manifest.json`
- [ ] 3.3 验证 `oxn task start` 后 `.openxenon/tasks/<task-id>/` 目录被正确创建

## 4. 验证整体流程

- [ ] 4.1 测试 `oxn task start` 后任务状态正确更新为 RUNNING
- [ ] 4.2 测试 `oxn task stop` 后任务状态正确更新为 FAILED
- [ ] 4.3 测试完整流程无错误
