## Context

OpenXenon 需要扩展 Arsenal 资产系统以支持 Blueprint 作为拓扑蓝图资产。当前 Arsenal 仅支持 probes、proofs、stages 三种类型。

**核心设计原则**：
- Blueprint 是纯拓扑路由表，只包含 `topology[]` 和 `edges[]`
- Stage 是可复用的执行单元，包含 `spec`、`proof`、`action`
- Blueprint 通过前缀引用 Stage：`defaults/<name>` 或 `custom/<name>`
- Task 启动时从 Arsenal 复制 Blueprint 到 Task 目录，修改不影响原版

## Goals / Non-Goals

**Goals:**
- Blueprint 作为 Arsenal 资产类型的完整支持
- Blueprint 的 CRUD 操作（创建、复制、修改、保存）
- Stage 引用机制（defaults/custom 前缀）
- Task 与 Blueprint 的生命周期绑定

**Non-Goals:**
- 不改变现有 probes、proofs、stages 的资产结构
- 不实现 Stage 的版本管理（Stage 自身通过 history5 的 canonical/draft/archive 管理）

## Decisions

**1. Blueprint 文件格式**
```json
// arsenals/blueprints/user-auth/canonical.json
{
  "id": "user-auth",
  "status": "CANONICAL",
  "topology": [
    "defaults/create-user",
    "custom/db-init",
    "defaults/verify-auth"
  ],
  "edges": [
    { "from": "defaults/create-user", "to": "custom/db-init" },
    { "from": "custom/db-init", "to": "defaults/verify-auth" }
  ]
}
```

**2. Arsenal 目录结构扩展**
```
arsenals/
├── blueprints/
│   └── user-auth/
│       ├── canonical.json    # 生效版本
│       ├── draft.json         # 草稿（可选）
│       └── archive/           # 历史版本
│           └── v1.0_initial.json
├── stages/
│   └── create-user/
│       ├── canonical.md
│       ├── draft.md
│       └── archive/
├── proofs/
└── probes/
```

**3. Task 目录结构**
```
tasks/<task_id>/
├── blueprints/
│   └── bp_001.json    # 从 Arsenal 复制的副本，可修改
├── stages/
│   └── create-user.md  # 从 Arsenal 复制（可选，仅当需要修改时）
├── step-manifest.json
└── task-trace.yaml
```

**4. Stage 引用解析**
- `defaults/<name>`: 解析为 `arsenals/stages/<name>/canonical.md`
- `custom/<name>`: 解析为 `arsenals/stages/<name>/canonical.md`（与 defaults 相同路径，仅作分类标识）

**5. 复制时机**
- Blueprint 复制：Task 创建时立即复制
- Stage 复制：仅当 Blueprint 引用且需要修改时复制

## Risks / Trade-offs

- [风险] Blueprint 副本与原版失去关联 → [缓解] 通过 `source` 字段记录原始 Blueprint ID
- [风险] 多个 Task 同时修改 Stage 副本 → [缓解] 每个 Task 有独立目录，天然隔离
- [风险] Stage 被删除但仍有 Task 引用 → [缓解] 验证时检查 Stage 文件存在性

## Migration Plan

1. 扩展 `arsenals-paths.ts` 支持 blueprints 类型
2. 扩展 `arsenals-loader.ts` 支持 blueprints 加载
3. 实现 Blueprint 的 CRUD 操作
4. 实现 Task 创建时复制 Blueprint 的逻辑
5. 实现 Task 完成后反哺 Arsenal 的逻辑

## Open Questions

- Blueprint 是否可以嵌套引用其他 Blueprint？（暂不支持）
- 是否需要 Blueprint 模板的导入/导出功能？（后续考虑）