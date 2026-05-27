## Why

当前 `src/` 目录结构是"传统 CRUD 后端 + 数据库同步 Bug"的活化石。在已确立"零数据库、纯文件物理边界、CLI 负责 YAML 转 JSON"的宪法下，至少 40% 的文件在物理上不应该存在，或被放在了错误的进程边界里。这导致：

1. **CLI 与 Daemon 越界**：`commands/api/` 绕过 IPC 直接调用 persister，导致 `project.oxn` 和 `core.oxn` 不同步
2. **状态管理混乱**：存在多个"持久化器"（blueprint-persister、registry、projects）实质是对 JSON 文件的 CRUD，等同于 SQLite
3. **过度工程**：runtimes/、adapters/、interfaces/ 为"未来换 Node.js"准备，v0.1.0 不需要
4. **IPC 边界模糊**：验证层独立于 Daemon，逻辑分散

## What Changes

### 目录重构
- `types/` → `common/`：类型桶改为邻接原则，被多处引用的枚举、常量、Schema 才进 common
- `commands/api/` → 删除，CLI 命令只做"翻译"（读 YAML → JSON → Socket）
- `core/blueprint-persister.ts` → 删除（违反"状态即文件"宪法）
- `core/registry.ts`、`core/projects.ts` → 删除（JSON 文件 CRUD，等同 SQLite）
- `core/config.ts` → 删除（违反"零数据库"宪法）
- `runtimes/`、`adapters/` → 删除（过度抽象）
- `verification/` → 合并到 `daemon/engine/`
- `core/built-in-proofs/` → 合并到 `daemon/probes/`
- `forges/`、`templates/` → `meta/`（资源集中）

### 新架构（src/）
```
src/
├── cli.ts                     # CLI 入口
├── common/                    # [共享] 极简领域层
│   ├── enums.ts              # TaskStatus, ProbeType 等
│   ├── constants.ts          # 路径后缀名常量
│   ├── types/                # 被多处引用的类型
│   └── schemas/              # Zod 结构校验
├── commands/                  # [阳面] 纯翻译官
│   ├── init.ts               # mkdir .openxenon + copy meta/
│   ├── task.ts, task-submit.ts, task-start.ts...  # 读 YAML → JSON → Socket
│   ├── forge.ts              # 读 meta/*.yaml → 输出约束
│   └── arsenal.ts            # mv draft → canonical
├── daemon/                    # [阴面] 无状态裁决引擎
│   ├── ipc/                  # Unix Socket 通信层
│   ├── engine/               # DAG 调度 + Stage 执行
│   ├── probes/               # 探针物理实现
│   ├── radar/                # 逃逸检测（纯内存）
│   └── trace/                # 案卷写入（唯一落盘点）
├── skills/                   # AI Skill 导出
└── meta/                     # 元蓝图 YAML 资源
```

### 数据流（替代旧架构）
```
旧（死路）:
CLI → blueprint-persister → SQLite → Socket → Daemon → 查库 → 找不到 → 崩溃 💥

新（通透）:
CLI → 读 YAML → JSON.stringify → Socket → Daemon → 执行探针 → appendFileSync trace ✅
```

## Capabilities

### New Capabilities
- `zero-database-architecture`：零数据库架构，所有状态存储在 YAML 文件中
- `cli-as-translator`：CLI 作为纯翻译层，只负责 YAML → JSON → Socket 的转换
- `daemon-stateless-engine`：Daemon 作为无状态裁决引擎，接收 JSON 对象并执行
- `adjacent-types`：邻接类型原则，类型定义靠近其使用模块

### Modified Capabilities
- （无 spec 级行为变化，只是实现层面重构）

## Impact

### 删除的文件/目录
- `src/types/`（整个目录）
- `src/commands/api/`（整个目录）
- `src/core/blueprint-persister.ts`
- `src/core/registry.ts`
- `src/core/projects.ts`
- `src/core/config.ts`
- `src/runtimes/`（整个目录）
- `src/adapters/`（整个目录）
- `src/verification/`（整个目录）
- `src/forges/`（移动到 `src/meta/`）
- `src/templates/`（移动到 `src/meta/`）

### 移动的文件
- `core/built-in-proofs/` → `daemon/probes/`
- `core/stage/` → `daemon/engine/`
- `lib/task-trace.ts` → `daemon/trace/writer.ts`

### 裁剪预估
- 文件数：~100 → ~60（减少 40%）
- 代码行数：~9400 → ~6000（减少 36%）
- 目录深度：5层 → 3层（减少 40%）

### 高风险迁移点
- `commands/init.ts`：同时依赖 registry、config、projects，重写
- `api/handlers/task-submit.ts`：依赖 blueprint-persister，重写为纯 Socket 发送