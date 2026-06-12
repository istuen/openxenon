## 1. 基础设施准备

- [x] 1.1 创建 `openspec/changes/file-system-first-task-execution/` 目录结构
- [x] 1.2 定义 `DaemonPayload` TypeScript 接口类型
- [x] 1.3 定义 `TaskTraceYaml` TypeScript 接口类型

## 2. 修改 Daemon 通信协议

- [x] 2.1 修改 `src/server.ts` 解析新 Payload 格式
- [x] 2.2 实现 `EXECUTE_TASK` 命令处理器
- [x] 2.3 实现 `EXECUTE_STEP` 命令处理器
- [x] 2.4 实现 `VERIFY_STEP` 命令处理器
- [x] 2.5 添加 schema_version 兼容检查

## 3. 修改 CLI 任务命令

- [x] 3.1 修改 `oxn task new` 命令改为创建目录和 blueprint.yaml
- [x] 3.2 修改 `oxn task list` 命令改为扫描文件系统
- [x] 3.3 修改 `oxn task status` 命令改为读取 task-trace.yaml
- [x] 3.4 修改 `oxn task start` 命令改为发送 Payload 给 Daemon
- [x] 3.5 修改 `oxn task stop` 命令直接操作文件系统
- [x] 3.6 修改 `oxn task next` 命令读取 task-trace.yaml

## 4. 实现任务目录操作库

- [x] 4.1 创建 `src/lib/task-dir.ts` 负责目录创建和验证
- [x] 4.2 创建 `src/lib/task-trace.ts` 负责 trace 文件读写
- [x] 4.3 创建 `src/lib/blueprint-parser.ts` 负责 YAML 解析

## 5. 数据清理

- [x] 5.1 删除 `project.oxn` 中的 `tasks` 表和相关 ORM 代码（已标记为 deprecated）
- [x] 5.2 删除 `project.oxn` 中的 `blueprints` 表和相关 ORM 代码（已标记为 deprecated）
- [x] 5.3 删除 `project.oxn` 中的 `stages` 表和相关 ORM 代码（已标记为 deprecated）
- [x] 5.4 更新 `src/db/` 下的数据库 Schema 定义

## 6. 冻结 core.oxn 任务功能

- [x] 6.1 冻结 `core.oxn` 中的 `tasks` 表（不再写入）
- [x] 6.2 保留 `daemon_config` 表用于 Daemon 基本配置
- [x] 6.3 更新 Daemon 启动逻辑不再依赖全局任务表

## 7. 验证和测试

- [x] 7.1 在测试项目上完整运行一次 `oxn task new` → `oxn task start` → `oxn task status` 流程
- [x] 7.2 验证 `task-trace.yaml` 正确生成
- [x] 7.3 验证 `blueprint.yaml` 正确读取和执行
- [x] 7.4 验证探针（Probe）正确执行