## Context

OpenXenon 的 Arsenal（武器库）用于存放和管理 Proof、Stage、Blueprint 等工程标准资产。当前状态：
- 目录结构不统一，Proof/Stage/Blueprint 分散在不同路径
- 状态命名混乱（`active`、`draft`、`canonical` 混用）
- CLI 命令与 Core 引擎的资产加载逻辑复杂

## Goals / Non-Goals

**Goals:**
- 建立统一的 `DRAFT/CANONICAL` 两态生命周期
- 实现清晰的分层目录结构
- 提供 `oxn standards` CLI 命令支持资产的查看和转正
- Core 引擎统一使用新路径加载资产

**Non-Goals:**
- 不改变现有 Proof/Stage/Blueprint 的 JSON Schema
- 不实现 AI 自动生成资产的功能（属于 implement-oxn-forge）
- 不实现废弃（deprecated）状态

## Decisions

### Decision 1: 目录结构

**决定**: 建立统一的两层结构

```
.openxenon/
└── standards/
    ├── probes/
    │   ├── DRAFT/
    │   └── CANONICAL/
    ├── proofs/
    │   ├── DRAFT/
    │   └── CANONICAL/
    └── stages/
        ├── DRAFT/
        └── CANONICAL/
```

**理由**:
- 统一入口，便于 CLI 和 Core 扫描
- DRAFT/CANONICAL 两态足够简单，降低状态机复杂度
- 与 OpenXenon 的"物理确权"哲学一致

**替代方案**:
- 保持扁平结构：缺点是难以区分资产状态
- 三态或多态（DRAFT/PROPOSED/CANONICAL）：增加复杂度，MVP 阶段不必要

### Decision 2: 状态命名

**决定**: 使用 `DRAFT` 和 `CANONICAL`，废弃 `active`

- `DRAFT`: AI 通过 /oxn-forge 生成的资产，等待工程师确权
- `CANONICAL`: 经过 `oxn standards promote` 转正的正式资产

**理由**:
- `CANONICAL` 比 `active` 更准确表达"标准"含义
- 与学术界的"规范提案"术语对齐

### Decision 3: CLI 命令

**决定**: 新增 `oxn standards` 子命令集

```bash
oxn standards list [--state DRAFT|CANONICAL]  # 列出资产
oxn standards inspect <asset-path>              # 查看资产内容
oxn standards promote <asset-path>             # DRAFT -> CANONICAL
```

**理由**:
- 集中管理所有标准资产
- 与现有的 `oxn task`、`oxn proof-list` 命令风格一致

## Risks / Trade-offs

[风险] 迁移现有资产需要手动操作
→ **缓解**: 提供迁移脚本，自动将现有资产迁移到新目录

[风险] 破坏性变更可能影响现有 Task 执行
→ **缓解**: Core 引擎同时支持新旧路径，逐步废弃旧路径

## Migration Plan

1. 创建新目录结构
2. 迁移现有资产到 CANONICAL
3. 更新 Core 资产加载逻辑
4. 更新 CLI 命令
5. 废弃旧路径

## Open Questions

1. 是否需要 `oxn standards reject` 命令拒绝 DRAFT 资产？
2. 是否需要在 DB 中记录资产的 promote 历史？