## 1. 创建存档分支

- [ ] 1.1 确保 dev 分支所有工作已提交
- [ ] 1.2 创建 `archive/post-mvp-features` 分支
- [ ] 1.3 验证存档分支包含完整代码

## 2. 评估代码范围

### 2.1 API Handlers 评估

MVP 0.1 保留：
- `task-submit.ts` - Blueprint YAML 持久化
- `step-verify.ts` - Staging 验证
- `task-next.ts` - 获取下一个 Stage
- `task-start.ts` - 启动任务
- `task-status.ts` - 状态查询
- `task-stop.ts` - 停止任务
- `task-trace.ts` - 追踪导出
- `health.ts` - 健康检查
- `proofs-list.ts` - 探针列表
- `task-list-handler.ts` - 任务列表
- `step-start.ts` - 开始步骤
- `workspace-init.ts` - 工作空间初始化

可删除（未来功能）：
- `draft-apply.ts` / `draft-diff.ts` / `draft-extract.ts` / `draft-list.ts` / `draft.ts` - Draft 提案流程
- `export.ts` / `export-active.ts` / `export-archive.ts` - 导出功能

### 2.2 CLI Commands 评估

MVP 0.1 保留：
- `init` - 项目初始化
- `task` - 任务管理
- `api` - API 调用
- `trace` - 追踪
- `inspect` - 检查
- `proof-list` - 探针列表
- `migrate` - 数据库迁移
- `force-pass` - 极端情况强制通过
- `rollback` - 危险但必要

可删除（未来功能）：
- `daemon.ts` - 守护进程管理（复杂，MVP 简化）
- `draft.ts` / `draft-apply.ts` / `draft-diff.ts` / `draft-extract.ts` / `draft-list.ts` - 提案流程
- `gc.ts` / `gc-prune.ts` - 垃圾回收
- `export.ts` / `export-active.ts` / `export-archive.ts` - 导出

### 2.3 Builtin Proofs 评估

MVP 0.1 保留核心 4 个：
- `fs_exists.ts` - 文件存在检查
- `fs_content_match.ts` - 文件内容匹配
- `exec_exit_zero.ts` - 命令执行检查

可删除（未来功能）：
- `fs_not_exists.ts` - 文件不存在检查（可由 fs_exists 逻辑覆盖）
- `fs_parseable.ts` - 文件可解析检查
- `exec_stdout_match.ts` - 命令输出匹配
- `db_query_bool.ts` - 数据库查询
- `env_exists.ts` - 环境变量检查
- `http_status.ts` - HTTP 状态检查

### 2.4 Core 模块评估

MVP 0.1 保留：
- `blueprint-loader.ts` - Blueprint YAML 加载
- `blueprint-persister.ts` - Blueprint YAML 持久化
- `staging.ts` - Staging 缓冲
- `arsenal-probe-router.ts` - Probe 路由
- `proof-dispatcher.ts` - 验证分发
- `stage/executor.ts` - Stage 执行器
- `stage/dispatcher.ts` - Stage 调度器
- `manifest.ts` - Manifest 管理
- `built-in-proofs-registry.ts` - 探针注册表

可删除（未来功能）：
- `stage/sample-handler.ts` - Sample 偏差流
- `boundary.ts` / `boundary-project.ts` - 边界管理（简化）
- `registry.ts` - 项目注册
- `global.ts` - 全局配置

### 2.5 DB Operations 评估

检查 `src/db/operations/` 下哪些是 MVP 必需的，删除历史兼容代码。

## 3. 执行清理

- [ ] 3.1 删除 API handlers 中的未来功能文件
- [ ] 3.2 删除 CLI commands 中的未来功能文件
- [ ] 3.3 删除未使用的 builtin proofs
- [ ] 3.4 删除未使用的 core 模块
- [ ] 3.5 更新 `src/api/handlers/index.ts` 导出
- [ ] 3.6 更新 `src/commands/index.ts` 导出

## 4. 测试验证

- [ ] 4.1 运行 `bun test` 确保 MVP 测试通过
- [ ] 4.2 手动测试核心 API：task-submit → step-verify → task-trace
- [ ] 4.3 验证 CLI 基本命令可用

## 5. 提交变更

- [ ] 5.1 提交清理后的代码
- [ ] 5.2 打 tag：`v0.1.0-alpha`
- [ ] 5.3 推送 archive 分支到远程（如有）
