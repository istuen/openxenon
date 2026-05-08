## Context

当前 meta-forge 约束以 TypeScript 对象形式硬编码在 `src/core/blueprints/meta-forge.ts`。这带来几个问题：

1. **不可见**：用户看不到生成资产的约束规则
2. **不易改**：修改约束需要改代码
3. **重复**：oxn-forge 和 CLI 都需要维护加载逻辑

```
当前结构：
src/core/blueprints/meta-forge.ts (硬编码约束)
                    ↓
           oxn-forge.ts / forge.ts
                    ↓
         用户通过自然语言生成资产
```

## Goals / Non-Goals

**Goals:**
- 将约束规则外部化为内置 Forge 资产
- 初始化时复制到项目目录
- 保持约束的可读性和可修改性
- 保持向后兼容（fallback 机制）

**Non-Goals:**
- 不实现 meta-forge 的探针执行（只是约束定义）
- 不改变 oxn-forge 生成资产的流程

## Decisions

### Decision 1: 内置 Forge 路径

**选择**：在 `src/forges/` 下创建内置 Forge

**理由**：
- 命名更准确：Forge 是约束定义，不是 Stage
- 与 Built-in Proofs 路径模式一致（`src/core/built-in-proofs/`）

**结构**：
```
src/forges/
└── meta-{type}/
    └── canonical.yaml
```

### Decision 2: 初始化时复制

**选择**：`oxn init` 时复制 `src/forges/` 到 `.openxenon/forges/`

**理由**：
- 项目级 Forge 目录统一管理
- 用户可修改项目内约束而不影响内置约束
- 符合 Arsenal 的项目管理模式

### Decision 3: 使用 YAML 格式

**选择**：每个 meta Forge 使用 `canonical.yaml` 文件

**理由**：
- YAML 人类可读，便于理解约束
- 与 Arsenal 资产格式一致

### Decision 4: 保留 TypeScript 类型定义

**选择**：保留 `src/types/arsenal/blueprint.ts` 中的 Zod Schema

**理由**：
- TypeScript 类型提供编译时检查
- Zod Schema 用于运行时验证
- YAML 定义约束规则，TypeScript 定义结构

## Risks / Trade-offs

- [Risk] 路径变更需要更新加载逻辑 → **Mitigation**: 使用固定前缀 `meta-` 识别
- [Risk] 两份约束需要保持同步 → **Mitigation**: 项目内 Forge 是约束来源，TypeScript 仅做类型校验

## Migration Plan

1. 创建 `src/forges/meta-*` 目录和 YAML 文件
2. 更新 `oxn init` 复制内置 Forge 到项目
3. 更新 `loadMetaBlueprintFromArsenal()` 扫描 `.openxenon/forges/`
4. 删除 `meta-forge.ts` 中的冗余定义
5. 验证 oxn-forge 正常工作
