## Context

当前 `src/daemon/probes/` 下的探针实现（如 `fs-exists.probe.ts`、`shell-exec.probe.ts`）是硬编码的 TypeScript 文件。每个探针类型对应一个独立文件，新增探针必须修改代码。这违反了兰姆达演算"用结构替代过程"的原则。

**目标**：将探针从"硬编码过程"变为"YAML数据 + 通用解释器"。

## Goals / Non-Goals

**Goals:**
- 创建通用探针解释器 `kernel/probes/executor.ts`
- 探针定义从 YAML 读取，不再硬编码
- 目录结构采用 kernel/infra/arsenals 分离

**Non-Goals:**
- 不改变探针执行的物理行为（结果不变）
- 不改变 IPC 协议
- 不修改 Daemon 的进程模型

## Decisions

### Decision 1: `kernel/probes/executor.ts` 作为通用解释器

**选择**：`executor.ts` 通过 `probe.type` 分发到对应实现，不包含具体探针逻辑。

```typescript
// kernel/probes/executor.ts
export type ProbeExecutor = (probe: Probe, infra: Infra) => ProbeResult

export const executeProbe: ProbeExecutor = (probe, infra) => {
  switch (probe.type) {
    case 'fs_exists':
      return infra.fs.exists(probe.pattern)
    case 'fs_not_exists':
      return infra.fs.notExists(probe.pattern)
    case 'fs_match':
      return infra.fs.match(probe.pattern, probe.matches)
    case 'shell_exec':
      return infra.process.exec(probe.command, probe.cwd)
    default:
      return { success: false, error: `Unknown probe type: ${probe.type}` }
  }
}
```

**理由**：
- 核心逻辑只有 20 行
- 新增探针只需修改 YAML，不改代码
- 符合兰姆达"用结构替代过程"

### Decision 2: `infra/` 只包含三个物理封装

**选择**：`infra/` 目录只包含对 OS 底层能力的极简封装：

```typescript
// infra/fs.ts - 封装文件系统的原子操作
export const fs = {
  exists: (path: string) => boolean,
  notExists: (path: string) => boolean,
  match: (path: string, pattern: RegExp) => boolean,
  read: (path: string) => string,
  atomicWrite: (path: string, content: string) => void,
  appendOnly: (path: string, line: string) => void
}

// infra/process.ts - 封装子进程管理
export const process = {
  exec: (command: string, cwd?: string) => { code: number, stdout: string, stderr: string }
}

// infra/socket.ts - 封装 Unix Socket 通信
export const socket = {
  send: (path: string, data: string) => void,
  receive: (path: string) => string
}
```

### Decision 3: 目录重命名

| 旧 | 新 | 说明 |
|----|----|------|
| `src/common/` | `src/kernel/` | 兰姆达核心 |
| `src/meta/` | `src/arsenals/` | 出厂 ROM |
| `src/lib/` | `src/infra/` | 图灵机边界 |
| `src/commands/` | `src/cli/` | 应用外壳 |

**理由**：
- `kernel/`：兰姆达演算核心，纯数学逻辑
- `infra/`：infrastructure，物理副作用边界
- `arsenals/`：兵工厂，出厂标准数据
- `cli/`：命令行接口

### Decision 4: 探针 YAML Schema

```yaml
# arsenals/probes/fs-exists/canonical.yaml
id: fs-exists
name: File System Exists Probe
type: fs_exists
description: 检查文件或目录是否存在
parameters:
  - name: pattern
    type: string
    description: 要检查的路径
spec:
  constraints:
    - "path 必须是字符串"
    - "path 不应为空"
```

## Risks / Trade-offs

[Risk] YAML 解析开销
→ **Mitigation**：探针定义在启动时缓存，不频繁解析

[Risk] switch-case 仍是 O(n) 查找
→ **Mitigation**：探针类型有限，switch 足够简单；未来可改为 Map 查找

## Migration Plan

### Phase 1: 创建 infra/ 目录
- 创建 `infra/fs.ts`、`infra/process.ts`、`infra/socket.ts`
- 将 `lib/task-dir.ts` 等工具迁移到 `kernel/` 或 `infra/`

### Phase 2: 创建 kernel/probes/executor.ts
- 实现通用探针解释器
- 使用 switch-case 分发

### Phase 3: 创建 arsenals/probes/ YAML
- 将现有探针逻辑转为 YAML 定义
- 探针实现由 executor.ts + infra/ 执行

### Phase 4: 目录重命名
- `common/` → `kernel/`
- `meta/` → `arsenals/`
- `lib/` → `infra/`
- `commands/` → `cli/`

### Phase 5: 删除旧代码
- 删除 `daemon/probes/*.probe.ts`
- 删除旧目录

## Open Questions

1. **探针参数校验**：是否需要单独的 Zod Schema？
2. **探针组合**：如何支持"先 fs_exists 再 shell_exec"的组合探针？