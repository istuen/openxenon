# Artifact（产物）

Artifact 是 AI 助手构建的执行结果，也是 Core 验证的对象。

## 定义

Artifact 是 AI 助手根据 `target` 和 `action` 执行操作后产出的物理实体，包括：

- 文件（新建、修改）
- 目录结构
- 命令执行结果
- 其他可观测的变更

## 在交互流程中的位置

```
AI 调用 taskNext
    │
    ▼
Core 返回 target + action
    │
    ▼
AI 执行操作
    │
    ▼
AI 构建 Artifact ←── 这里产生产物
    │
    ▼
AI 调用 taskVerify
    │
    ▼
Core 用 Probe 观测 Artifact
    │
    ▼
Core 返回判定结果
```

## Artifact 与 Probe 的关系

Probe 是观测 Artifact 的"传感器"：

| Probe 类型 | 观测对象 | 判定逻辑 |
|-----------|---------|---------|
| `fs_exists` | 文件系统 | Artifact 中是否存在指定文件 |
| `fs_match` | 文件内容 | Artifact 中文件内容是否匹配 |
| `shell_exec` | 进程状态 | Artifact 是否能正确运行 |

## 示例

**Stage 定义**：

```yaml
target:
  description: "创建用户模型文件"
action:
  description: "使用 Prisma 创建 User 模型"
probes:
  - ref: fs_exists
    parameters:
      pattern: "src/models/user.ts"
```

**AI 执行后产生的 Artifact**：

```
src/
└── models/
    └── user.ts    ← Artifact
```

**Probe 观测**：

```bash
# Infra 执行
glob("src/models/user.ts")  # → ["src/models/user.ts"]

# Kernel 判定
found.length > 0  # → PASSED
```

## Artifact 的追溯

所有 Artifact 的构建过程记录在 task-trace.yaml 中：

```yaml
- type: STAGE_START
  stageId: create-user-model
  timestamp: 1704067200

- type: PROBE_RESULT
  probeType: fs_exists
  pattern: "src/models/user.ts"
  result: PASSED
  timestamp: 1704067210

- type: STAGE_COMPLETE
  stageId: create-user-model
  status: PASSED
  timestamp: 1704067215
```

## 资产化价值

- **可追溯**：每个 Artifact 都有完整的构建记录
- **可复盘**：失败时可回溯 Artifact 构建过程
- **可验证**：Artifact 是客观物理实体，不可伪造
