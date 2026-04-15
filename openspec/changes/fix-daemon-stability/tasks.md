## 1. 健康检查端点

- [ ] 1.1 在 `src/api/handlers/` 添加 `health.ts` 健康检查处理器
- [ ] 1.2 实现 GET `/api/v1/health` 返回 `{ "status": "ok" }`
- [ ] 1.3 在 `src/api/handlers/index.ts` 注册健康检查路由

## 2. 健康检查机制

- [ ] 2.1 创建 `src/daemon/health-check.ts` 健康检查模块
- [ ] 2.2 实现 `waitForHealth()` 函数，轮询健康检查端点
- [ ] 2.3 设置 5 秒超时和 100ms 轮询间隔
- [ ] 2.4 返回健康检查结果和耗时

## 3. 启动流程修改

- [ ] 3.1 修改 `src/daemon/process.ts` 的 `startDaemon()` 函数
- [ ] 3.2 启动后等待健康检查通过
- [ ] 3.3 健康检查失败时清理 PID 文件并返回错误
- [ ] 3.4 报告健康检查耗时

## 4. 异常处理增强

- [ ] 4.1 修改 `src/server.ts` 添加 `uncaughtException` 处理器
- [ ] 4.2 修改 `src/server.ts` 添加 `unhandledRejection` 处理器
- [ ] 4.3 确保所有异常路径都清理 PID 文件
- [ ] 4.4 修改 `saveDaemonAddress()` 包装 try-catch
- [ ] 4.5 修改 `clearDaemonAddressFromDb()` 包装 try-catch

## 5. 测试验证

- [ ] 5.1 手动测试：启动 daemon 并验证健康检查
- [ ] 5.2 手动测试：模拟启动失败，验证 PID 文件清理
- [ ] 5.3 手动测试：`xn api base` 功能正常
