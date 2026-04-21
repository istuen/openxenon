## Context

当前已有 XnStage 接口定义在 `src/types/playbook.ts`，但尚未实现执行逻辑。XnStage 模块需要负责：
1. 将 XnStage 从 pending 状态转为 running
2. 绑定 XnProof 执行验证
3. 处理 XnAction 指令
4. 管理 XnSample 样本分支

## Goals / Non-Goals

**Goals:**
- 实现 XnStageExecutor：单个 Stage 的执行器
- 实现 XnStageDispatcher：多个 Stage 的调度器
- 实现 XnSampleHandler：样本分支处理
- 支持 XnAction 指令解析

**Non-Goals:**
- 不实现持久化（依赖 XnStore）
- 不实现可视化界面
- 不实现 Blueprint DAG 解析（后续功能）

## Decisions

### 1. 模块目录结构

```
src/core/stage/
├── index.ts           # 统一导出
├── executor.ts       # XnStageExecutor
├── dispatcher.ts    # XnStageDispatcher
├── validator.ts      # Stage 验证结果处理
└── sample-handler.ts # XnSample 处理
```

### 2. 执行流程

```
XnStageExecutor.execute(stage)
    ↓
加载 XnAction 指令 → 注入 LLM Prompt
    ↓
执行 XnProof 验证
    ↓
根据结果更新 xnStageStatus (passed/failed)
    ↓
如需 Sample 则触发 XnSampleHandler
```

### 3. XnAction 指令解析

**决策：** XnAction 直接作为 Prompt 片段注入，不做二次解析

**理由：** 保持简单性，LLM 自动理解 "使用 TypeScript" 等指令

## Risks / Trade-offs

- [风险] XnProof 执行超时 → 需要在 sandbox 设置 timeout
- [风险] 多个 Stage 的并行/串行策略 → 初期仅支持串行，后续扩展

## Open Questions

- 是否需要支持 Stage 重试机制？
- XnSample 是否需要单独的审批流程？