## 1. 创建存档分支

- [x] 1.1 确保 dev 分支所有工作已提交
- [x] 1.2 创建 `archive/post-mvp-features` 分支
- [x] 1.3 验证存档分支包含完整代码

## 2. 评估代码范围

### 2.1 API Handlers

MVP 保留：task-submit, step-verify, task-next, task-start, task-status, task-stop, task-trace, health, proofs-list, task-list-handler, step-start, workspace-init

### 2.2 CLI Commands

MVP 保留：init, task, api, trace, inspect, proof-list, migrate, force-pass, rollback

### 2.3 Builtin Proofs

MVP 保留：fs_exists, fs_content_match, exec_exit_zero

### 2.4 Core 模块

MVP 保留：blueprint-loader, blueprint-persister, staging, arsenal-probe-router, proof-dispatcher, stage/executor, stage/dispatcher, manifest, built-in-proofs-registry

## 3. 执行清理

- [x] 3.1 删除 API handlers 中的未来功能文件
- [x] 3.2 删除 CLI commands 中的未来功能文件（daemon, draft*, gc*, export*）
- [x] 3.3 删除未使用的 builtin proofs（fs_not_exists, fs_parseable, exec_stdout_match, db_query_bool, env_exists, http_status）
- [x] 3.4 删除未使用的 core 模块（sample-handler.ts）
- [x] 3.5 更新 `src/api/handlers/index.ts` 导出
- [x] 3.6 更新 `src/commands/index.ts` 导出

## 4. 测试验证

- [ ] 4.1 运行 `bun test` 确保 MVP 测试通过
- [ ] 4.2 手动测试核心 API：task-submit → step-verify → task-trace
- [ ] 4.3 验证 CLI 基本命令可用

## 5. 提交变更

- [ ] 5.1 提交清理后的代码
- [ ] 5.2 打 tag：`v0.1.0-alpha`
- [ ] 5.3 推送 archive 分支到远程（如有）