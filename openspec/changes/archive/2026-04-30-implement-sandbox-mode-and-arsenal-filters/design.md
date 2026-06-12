## Context

当前 OpenXenon 没有沙箱概念，所有项目都以"生产模式"运行。AI 在实验新框架时面临熔断风险，无法安全探索。同时，Arsenal 资产只能在全局和项目间流转，无法方便地在任意项目间共享。

## Goals / Non-Goals

**Goals:**
- 实现沙箱模式，区分生产/实验环境
- 单一数据源：space.oxn 是唯一数据源，mode 字段直接写在 space.oxn 头部
- 实现 arsenal export/import 跨项目共享资产
- 统一资产流转命令格式

**Non-Goals:**
- 不实现 Task 状态持久化（继续用 space.oxn）
- 不实现模板系统（后续可能加）
- 不改变现有 Project → Global 的流转逻辑
- 不引入 config.json 配置文件（避免同步问题）

## Decisions

### Decision 1: space.oxn 使用 SQLite config 表

```
.openxenon/
└── space.oxn  # SQLite 数据库：config 表 + task 表
```

**config 表结构（key-value）：**
```sql
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
INSERT INTO config VALUES ('mode', 'SANDBOX');  -- 或 'PRODUCTION'
```

**未来可扩展：**
```sql
INSERT INTO config VALUES ('radar.lenient', 'true');
INSERT INTO config VALUES ('assets.allowDraft', 'true');
```

**查询当前模式：**
```sql
SELECT value FROM config WHERE key = 'mode';  -- 'SANDBOX' 或 'PRODUCTION'
```

**选择理由：**
- 灵活扩展：未来新增配置只需 INSERT 新行
- 单一数据源：所有配置和状态都在 space.oxn
- 避免 JSON 文件和数据库同步问题

### Decision 2: ExecutionPolicy Strategy 模式

```typescript
interface ExecutionPolicy {
  onProbeFailed(probe: Probe, ctx: ExecutionContext): Action
  onEscapeDetected(ctx: ExecutionContext): Action
  canUseDraftAssets(): boolean
}

class ProductionPolicy implements ExecutionPolicy {
  onProbeFailed = () => Action.TERMINATE_AND_DELETE
  onEscapeDetected = () => Action.TERMINATE
  canUseDraftAssets = () => false
}

class SandboxPolicy implements ExecutionPolicy {
  onProbeFailed = () => Action.WARN_AND_PRESERVE  // 代码保留，不回滚
  onEscapeDetected = () => Action.SILENT          // 只记日志，不杀进程
  canUseDraftAssets = () => true                  // 允许引用 draft
}
```

**选择理由：** 多态彻底消灭 Core 引擎里到处判断 `if (isSandbox)` 的丑陋代码。

### Decision 3: Sandbox 物理行为边界

| 行为 | 生产模式 | 沙箱模式 |
|------|---------|---------|
| AI 写入目标 | 业务代码目录（圣地） | 项目工作目录（整个目录即沙箱） |
| Probe 失败 | 熔断删除 | 仅警告保留 |
| 逃逸检测 | 严格触发 | 静默记录 |
| draft 引用 | 禁止 | 允许 |

**关键定义：**
- **写入目标**：AI 在 Sandbox 里执行 Task 时，**直接写当前项目工作目录**，不再有 staging 缓冲区
- 整个项目目录就是物理沙箱

### Decision 4: 资产流转命令

| 命令 | 流向 | 说明 |
|------|------|------|
| `oxn arsenal promote` | Sandbox本地 → 当前Project | 将 Sandbox 中摸索出的 draft 转正为当前项目的 canonical |
| `oxn arsenal promote --global` | Project → Global | 将当前项目已确权的 canonical 提升为全局标准 |
| `oxn arsenal export <path>` | Project → 外部文件夹 | 将标准资产导出到可分享的文件夹 |
| `oxn arsenal import <path>` | 外部文件夹 → Project | 从外部吸收标准资产到当前项目 |

**导出导入标志：**
- 默认：canonical
- `--draft`：draft only
- `--canonical`：canonical only
- `--all`：draft + canonical + archive
- `--archive`：archive only

**导入冲突处理：**
- 默认：已存在则跳过
- `--force`：覆盖已存在的

## Risks / Trade-offs

- [风险] Sandbox 代码被误认为生产代码
  - [缓解] mode 存在 space.oxn config 表，可通过数据库查询检查

- [风险] Sandbox 里 draft 引用泛滥
  - [缓解] 只在 Sandbox 模式允许，生产模式严格禁止

## Open Questions

- 无