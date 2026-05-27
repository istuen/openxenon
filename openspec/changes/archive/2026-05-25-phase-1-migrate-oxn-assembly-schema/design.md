## Context

当前 `kernel/schemas/oxn-assembly.schema.ts` 位于 Kernel 层，但其定义的类型是 OXN DSL 前端的中间表示（IR），不属于 Kernel 的 Schema 范畴。

### 当前架构问题

```
src/kernel/schemas/oxn-assembly.schema.ts  ← 位置错误
    └── 定义 OxnAssemblyIR, OxnAssemblyPart, OxnAssemblyExpectation 等
    └── 这些类型是 DSL 解析流程的输出，不是 Kernel 的 Schema
```

### Kernel 的正确职责

Kernel 只应持有：
- `FrozenBlueprint` Schema（`frozen-schema.ts`）
- `ProbeTypeSchema`（`probe.ts`）
- DAG 验证（`dag-validator.ts`）

## Goals / Non-Goals

**Goals:**
- 将 `oxn-assembly.schema.ts` 迁移至 `oxn-dsl/schemas/`
- 将 `expectation-runner.ts` 迁移至 `oxn-dsl/executor/`
- 更新所有引用的 import 路径

**Non-Goals:**
- 不修改任何业务逻辑
- 不改变任何类型定义内容
- 不涉及 Phase 2-4 的 ProbeStrategy 注入改造

## Decisions

### Decision 1: 迁移而非复制

**选择:** 移动文件而非复制

**理由:**
- 避免重复维护两份相同代码
- 确保类型定义单一来源

### Decision 2: 保持文件内容不变

**选择:** 迁移时保持 TypeScript 内容完全一致

**理由:**
- 这是纯迁移，不改变任何业务逻辑
- 仅更新 import 路径

### Decision 3: oxn-dsl/schemas/ 目录结构

**选择:** 在 `oxn-dsl/schemas/` 下创建 `oxn-assembly.schema.ts`

**理由:**
- `oxn-dsl/` 已存在 `scope/`, `loader/`, `compiler/` 等子目录
- `schemas/` 可集中存放 DSL 层相关的 Zod Schema 定义

## Risks / Trade-offs

**风险:** 测试文件 import 路径需要同步更新

**缓解:** 
- 测试文件集中在 `oxn-dsl/__tests__/` 下
- 迁移后运行测试验证

## Migration Plan

1. 创建 `src/oxn-dsl/schemas/` 目录（如不存在）
2. 移动 `src/kernel/schemas/oxn-assembly.schema.ts` → `src/oxn-dsl/schemas/oxn-assembly.schema.ts`
3. 创建 `src/oxn-dsl/executor/` 目录（如不存在）
4. 移动 `src/kernel/executor/expectation-runner.ts` → `src/oxn-dsl/executor/expectation-runner.ts`
5. 更新所有引用文件的 import 路径
6. 删除 `src/kernel/executor/` 目录（如果变空）
7. 运行测试验证

## Open Questions

无