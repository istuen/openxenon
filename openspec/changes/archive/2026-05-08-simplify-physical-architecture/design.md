## Context

当前 `src/` 目录是"传统 CRUD 后端 + 数据库同步 Bug"的活化石。在已确立"零数据库、纯文件物理边界、CLI 负责 YAML 转 JSON"的宪法下，存在以下问题：

**当前架构问题**：
- `commands/api/` 绕过 IPC 直接调用 persister，导致 `project.oxn` 和 `core.oxn` 不同步
- `core/blueprint-persister.ts`、`core/registry.ts`、`core/projects.ts` 本质是对 JSON 文件的 CRUD，等同于 SQLite
- `runtimes/`、`adapters/` 为"未来换 Node.js"准备，v0.1.0 不需要
- `verification/` 独立于 Daemon，逻辑分散

**约束**：
- 技术栈：TypeScript, Bun
- 宪法：零数据库、纯文件物理边界、CLI 作为翻译层
- 进程边界：CLI（阳面）vs Daemon（阴面）

## Goals / Non-Goals

**Goals:**
- 消除所有数据库（SQLite/JSON 文件 CRUD）
- 明确 CLI 与 Daemon 的物理边界（CLI 只做翻译，Daemon 只做裁决）
- 将类型定义从"类型桶"改为"邻接原则"
- 减少文件数 40%、代码行数 36%

**Non-Goals:**
- 不改变业务逻辑，只改变代码组织方式
- 不添加新功能，只做重构
- 不修改 IPC 协议（保持 JSON over Unix Socket）

## Decisions

### Decision 1: `types/` → `common/`

**选择**：`common/` 而非 `domain/`

**理由**：
- `domain/` 在 DDD 中有特定含义（聚合根、实体、值对象），但 OpenXenon 没有这种语义
- `common/` 更中性，表示"共享的"，与"邻接"原则一致
- 内部只放：被多处引用的枚举、常量、Zod Schema

**结构**：
```
common/
├── enums.ts           # TaskStatus, ProbeType, Action, BlueprintStatus
├── constants.ts       # 路径后缀名 (.oxn, canonical.yaml)
├── types/             # 被多处引用的类型（TaskDirectory 等）
└── schemas/           # Zod 结构校验
```

### Decision 2: CLI 只做"翻译"

**选择**：CLI 命令只读取 YAML 文件、转换为 JSON、通过 Socket 发送给 Daemon

**理由**：
- CLI 是"阳面"，只负责"翻译"（输入 → 协议）
- Daemon 是"阴面"，负责"裁决"（协议 → 执行 → 案卷）
- 违反此原则会导致状态不一致（如 `project.oxn` vs `core.oxn`）

**实现**：
```typescript
// commands/task-submit.ts（重写后）
export default defineCommand({
  async run(ctx) {
    const yamlContent = await readFile('canonical.yaml', 'utf-8')
    const blueprint = YAML.parse(yamlContent)
    const payload = {
      action: 'TASK_SUBMIT',
      blueprint,
      projectPath: process.cwd()
    }
    await socketClient.send(payload)
  }
})
```

### Decision 3: Daemon 无状态裁决引擎

**选择**：Daemon 接收 JSON 对象，执行探针，写入 trace，不做任何持久化

**理由**：
- 状态存储在物理边界（`.openxenon/` 目录下的 YAML 文件）
- Daemon 是"裁决者"，不是"存储者"
- 案卷（trace）是唯一落盘物，且是 append-only

**结构**：
```
daemon/
├── ipc/               # Socket 接收 + 路由
├── engine/            # DAG 调度 + Stage 执行
├── probes/            # 探针物理实现
├── radar/             # 逃逸检测（纯内存 HashMap）
└── trace/             # 案卷写入（appendFileSync）
```

### Decision 4: 删除 `commands/api/` 目录

**选择**：将 `commands/api/*.ts` 拍平到 `commands/` 目录

**理由**：
- `commands/api/` 是越界逻辑，CLI 命令不应该直接调用 persister
- 删除后，CLI 命令统一走 Socket 与 Daemon 通信

### Decision 5: 合并 `verification/` 到 `daemon/engine/`

**选择**：将 `verification/` 下的文件合并到 `daemon/engine/`

**理由**：
- 验证（跑探针）是 Daemon 的核心引擎，不应该被单独成目录
- 减少目录层级

### Decision 6: 合并 `built-in-proofs/` 到 `daemon/probes/`

**选择**：将 `core/built-in-proofs/` 移动到 `daemon/probes/`

**理由**：
- 探针实现应该紧邻执行引擎
- 保持"邻接原则"

## Risks / Trade-offs

[Risk] 重写 `commands/init.ts` 可能引入回归
→ **Mitigation**：分阶段执行，先重写核心逻辑，最后处理 init

[Risk] 删除 `projects.json` 导致项目列表功能失效
→ **Mitigation**：项目边界信息存储在 `.openxenon/config.json`，仍是文件

[Risk] 类型迁移可能引发循环依赖
→ **Mitigation**：严格遵循"邻接原则"，只有被多处引用的类型才进 common/

## Migration Plan

### Phase 1: 创建新目录结构
```bash
mkdir -p src/common/{types,schemas}
mkdir -p src/daemon/{ipc,engine,probes,radar,trace}
mkdir -p src/meta
```

### Phase 2: 迁移 `common/` 层
- 从 `types/core.ts` 迁移枚举到 `common/enums.ts`
- 从 `types/arsenal/blueprint.ts` 迁移 Schema 到 `common/schemas/blueprint.schema.ts`

### Phase 3: 迁移 `daemon/` 层
- 移动 `api/socket-server.ts` → `daemon/ipc/server.ts`
- 合并 `verification/` 到 `daemon/engine/`
- 合并 `built-in-proofs/` 到 `daemon/probes/`

### Phase 4: 重写 `commands/` 层
- 删除 `commands/api/`
- 重写 `commands/init.ts`（移除 registry、config 依赖）
- 重写 `commands/task-submit.ts`（改为纯 Socket 发送）

### Phase 5: 清理
- 删除 `types/`、`core/` 中被废弃的文件
- 删除 `runtimes/`、`adapters/`、`verification/`

## Open Questions

1. **项目列表功能**：`projects.json` 删除后，如何管理多个项目？
   - 方案：扫描 `.openxenon/config.json` 文件
   - 状态：待定

2. **Arsenal 导出/导入**：是否保持当前的文件拷贝逻辑？
   - 状态：保持

3. **Skill 编译**：是否保持当前逻辑？
   - 状态：保持