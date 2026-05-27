## Why

当前 `src/daemon/probes/*.probe.ts` 中的探针实现是**硬编码的 TypeScript 代码**，每个探针类型（如 `fs_exists`、`shell_exec`）都对应一个独立的 `.probe.ts` 文件。这违反了兰姆达演算"用结构替代过程"的核心原则。

问题：
1. **扩展性差**：新增探针必须修改代码（添加新的 `.probe.ts` 文件）
2. **违反 FP 原则**：探针本质应该是"数据"（YAML 定义），不是"过程"（TS 代码）
3. **物理边界模糊**：`probes/` 在 `daemon/` 下，但探针执行是纯逻辑，不应属于"应用外壳"

## What Changes

### 核心改造：通用探针解释器

**旧架构（硬编码）**：
```
daemon/probes/
├── fs-exists.probe.ts    ← 每个探针一个TS文件（硬编码！）
├── fs-match.probe.ts
└── shell-exec.probe.ts
```

**新架构（通用解释器）**：
```
kernel/probes/
└── executor.ts           ← 只有一个通用求值器

arsenals/probes/           ← 探针定义变成YAML数据
├── fs-exists/canonical.yaml
├── fs-match/canonical.yaml
└── shell-exec/canonical.yaml
```

### 目录重构

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `src/common/` | `src/kernel/` | 兰姆达核心，纯数学逻辑 |
| `src/daemon/probes/` | 删除 | 探针逻辑合并到 kernel |
| `src/meta/` | `src/arsenals/` | 出厂ROM，只读标准数据 |
| `src/lib/` | `src/infra/` | 图灵机边界，物理副作用 |
| `src/commands/` | `src/cli/` | 应用外壳，命令行编排 |

### executor.ts 逻辑

通用探针解释器读取 YAML 中的 `type` 字段，分发到对应底层动作：

```typescript
// 纯函数：输入探针YAML type，输出执行函数
const dispatchProbe = (probe: Probe, infra: Infra): ProbeResult => {
  switch (probe.type) {
    case 'fs_exists': return infra.fs.exists(probe.pattern)
    case 'shell_exec': return infra.process.exec(probe.command)
    // 不需要新增代码！写新的YAML即可！
  }
}
```

## Capabilities

### New Capabilities
- `probe-executor-interpreter`：通用探针解释器，通过 YAML type 分发执行
- `kernel-infra-architecture`：kernel/infra/arsenals 分离架构

### Modified Capabilities
- （无 spec 级行为变化）

## Impact

### 删除的文件/目录
- `src/daemon/probes/*.probe.ts`（探针硬编码逻辑）
- `src/common/`（重命名为 `src/kernel/`）
- `src/meta/`（重命名为 `src/arsenals/`）
- `src/lib/`（重命名为 `src/infra/`）
- `src/commands/`（重命名为 `src/cli/`）

### 新增的目录/文件
- `src/kernel/probes/executor.ts`（通用探针解释器）
- `src/arsenals/probes/`（探针 YAML 定义）
- `src/infra/fs.ts`、`infra/socket.ts`、`infra/process.ts`

### 裁剪预估
- 探针相关代码：~200 行 → ~50 行（减少 75%）
- 无需为新探针修改核心代码