## Context

### 当前状态

OpenXenon 目前的任务执行架构：

```
CLI (写) → project.oxn (SQLite) → 任务/蓝图/阶段表
                    ↑
Daemon (读) ← core.oxn (SQLite) ← 全局任务表
```

问题：
1. CLI 在 `project.oxn` 创建 Task 记录，但硬盘上对应 YAML 可能还未生成
2. Daemon 从 `core.oxn` 读取任务状态，根据 ID 查找文件时频繁报错
3. 两个 SQLite 数据库需要严格同步，但缺乏同步机制
4. 违反 OpenXenon "文件系统即真理源" 的核心哲学

### 技术约束

- **技术栈**：TypeScript + Bun
- **运行环境**：macOS (darwin)
- **IPC 方式**：Unix Domain Socket (`~/.openxenon/daemon.sock`)

## Goals / Non-Goals

**Goals:**
- 实现"文件系统优先"的任务执行架构
- CLI 直接操作文件系统，不再依赖数据库存储任务状态
- Daemon 改为无状态探针执行器，接收 Payload 后直接操作文件
- 消除数据库同步问题，提升架构稳定性

**Non-Goals:**
- 不在本次变更中实现跨项目索引（那是未来 `core.oxn` 的唯一合法用途）
- 不改变探针（Probe）本身的实现逻辑
- 不改变 Arsenal 标准资产的管理方式

## Decisions

### Decision 1：任务目录结构

**选择**：采用 `.openxenon/tasks/{task_id}/` 目录结构

```
.openxenon/
├── config.json              # 极简配置（mode: PRODUCTION/SANDBOX）
└── tasks/
    └── {task_id}/
        ├── blueprint.yaml        # AI 编写的执行蓝图（输入）
        ├── step-manifest.json    # AI 实时更新的意图和尝试次数
        └── task-trace.yaml       # Daemon 写入的执行案卷（输出）
```

**替代方案考虑**：
- **方案 B**：保持 task_id 只作为数据库主键，文件存放在统一目录
  - 缺点：ID 与文件路径无直接关联，调试困难
- **方案 C**：使用扁平的单一 YAML 文件存储所有状态
  - 缺点：并发写入冲突，难以追踪单个步骤的状态变更

### Decision 2：CLI → Daemon 通信协议

**选择**：CLI 发送完整 Payload，Daemon 无状态执行

```typescript
// CLI 发给 Daemon 的 Payload
interface DaemonPayload {
  command: "EXECUTE_TASK" | "EXECUTE_STEP" | "VERIFY_STEP"
  project_root: string          // 绝对路径
  task_id: string              // "task_001"
  blueprint?: BlueprintYAML     // 直接把 YAML 解析成对象塞进来
  step_id?: string             // 仅 EXECUTE_STEP 时需要
  policy: "PRODUCTION" | "SANDBOX"
}
```

**替代方案考虑**：
- **方案 B**：保持 ID + 数据库查询
  - 缺点：引入同步问题，违背文件系统优先原则
- **方案 C**：Daemon 直接读取文件系统（CLI 只发 task_id）
  - 缺点：需要额外文件系统扫描逻辑，增加 Daemon 复杂度

### Decision 3：状态判断逻辑

**选择**：CLI 直接读取 `task-trace.yaml` 的 `status` 字段判断状态

```typescript
// 伪代码：判断任务状态
function getTaskStatus(taskDir: string): TaskStatus {
  const tracePath = path.join(taskDir, 'task-trace.yaml')
  if (!fs.existsSync(tracePath)) return 'NOT_FOUND'

  const trace = yaml.parse(fs.readFileSync(tracePath))
  return trace.status  // RUNNING / COMPLETED / FAILED / ESCAPED
}
```

**替代方案考虑**：
- **方案 B**：保持数据库查询状态
  - 缺点：需要同步，违背文件系统优先原则
- **方案 C**：使用额外 JSON 文件存储实时状态
  - 缺点：增加文件数量，trace 文件本身已足够

### Decision 4：移除数据库的时机

**选择**：立即删除 `project.oxn` 的任务表，不保留迁移期

**理由**：
- 当前系统处于 MVP 阶段，无历史数据需要迁移
- 任务执行与数据库耦合是架构缺陷，不是功能特性
- 立即移除反而减少技术债务

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 探针执行过程中异常退出，trace 文件写入不完整 | 使用 writeFileSync 原子写入，崩溃前最后一步才写 status |
| 并发执行同一任务导致文件写入冲突 | task_id 使用 UUID，同一任务不会并发执行 |
| YAML/JSON 解析失败导致 Daemon 崩溃 | Payload 包含 schema version，版本不匹配时拒绝执行 |
| 移除数据库后失去"跨项目查询"能力 | 未来可通过 `oxn index` 命令扫描文件系统生成索引 |

## Migration Plan

### Phase 1：基础设施准备（本次变更范围外）
- [ ] 确保 `oxn init` 生成正确的目录结构
- [ ] 确保 `oxn arsenal` 相关命令不依赖数据库

### Phase 2：实现变更（本次变更范围）
1. **修改 Daemon 通信协议**
   - [ ] 修改 `src/server.ts` 解析新 Payload 格式
   - [ ] 实现 `EXECUTE_TASK` 命令处理器

2. **修改 CLI 任务命令**
   - [ ] `oxn task new` 改为创建目录和 blueprint.yaml
   - [ ] `oxn task start` 改为发送 Payload 给 Daemon
   - [ ] `oxn task status` 改为读取 task-trace.yaml

3. **数据清理**
   - [ ] 删除 `project.oxn` 中的 `tasks`、`blueprints`、`stages` 表
   - [ ] 删除相关 ORM 代码

### Phase 3：验证（本次变更范围外）
- [ ] 在测试项目上完整运行一次任务执行流程
- [ ] 验证 trace 文件正确生成
- [ ] 验证 CLI 命令正常响应

## Open Questions

1. **step-manifest.json 的具体 Schema 是什么？**
   - 需要与探针执行逻辑配合定义

2. **如果 Daemon 崩溃，已执行的步骤如何恢复？**
   - 当前设计：重新发送 Payload，Daemon 幂等处理

3. **是否需要保留"任务历史"的概念？**
   - 当前设计：每次执行生成新的 task_id，历史通过 Git 版本控制管理