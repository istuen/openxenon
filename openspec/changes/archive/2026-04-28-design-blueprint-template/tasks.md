## 1. 创建 Blueprint 模板文件

- [x] 1.1 在 `src/templates/` 目录下创建 `blueprint.yaml` 模板文件
- [x] 1.2 定义 Task Information 区域结构（id, name, description, createdAt）
- [x] 1.3 定义 Stage Selection 区域结构（available, selected）
- [x] 1.4 定义 Stage Definitions 区域结构（steps, proof）
- [x] 1.5 提供示例内容展示各区域填写方式

## 2. Core tasks 表设计

- [x] 2.1 在 `src/db/schema/core.ts` 新增 tasks 表 Schema 定义
- [x] 2.2 实现 `src/db/operations/core-tasks.ts` 的 CRUD 操作
- [x] 2.3 迁移脚本不适用（无 space.oxn 需迁移）
- [x] 2.4 更新 Core 初始化逻辑，创建 tasks 表

## 3. 实现任务目录创建

- [x] 3.1 实现 `createTaskDirectory(projectPath, taskId)` 函数
- [x] 3.2 实现从模板复制并填充 Blueprint 的函数
- [x] 3.3 实现 Blueprint YAML 格式校验
- [x] 3.4 确保目录创建在 `.openxenon/tasks/<task-id>/` 下

## 4. 扩展 CLI 命令

- [x] 4.1 实现 `task new` 子命令：从模板创建新任务
- [x] 4.2 实现 `task list` 子命令：列出所有已登记任务
- [x] 4.3 实现 `task show` 子命令：查看指定任务的 Blueprint 内容
- [x] 4.4 实现 `task submit` 子命令：提交任务到 Core 进行追踪
- [x] 4.5 更新 `src/commands/index.ts` 导出新命令

## 5. 移除 space.oxn 依赖

- [x] 5.1 无需删除（space.ts 不存在）
- [x] 5.2 无需删除（space.ts 不存在）
- [x] 5.3 无需清理（无 space.ts 引用）
- [x] 5.4 无需清理（无 space 导出）

## 6. 测试验证

- [x] 6.1 运行 `bun test` 确保 MVP 测试通过（8/8 pass）
- [ ] 6.2 手动测试：`oxn task new` 创建任务
- [ ] 6.3 手动测试：`oxn task show` 查看 Blueprint
- [ ] 6.4 手动测试：`oxn task list` 列出任务
- [ ] 6.5 手动测试：`oxn task submit` 提交任务