## Context

### 当前状态

`kernel/lib/part-resolver.ts` 依赖:
- `infra/loader.ts` (filesystem I/O)
- `oxn-dsl/langium/oxn-services.ts` (Langium parser)
- `oxn-dsl/generator/oxn-generator.ts` (AST → IR)

`kernel/lib/blueprint-parser.ts` 依赖:
- `daemon/types/daemon-payload` (daemon 特有格式)

### 核心问题

- Kernel 不应该有 I/O 依赖
- Kernel 不应该知道 Langium DSL 解析器
- Kernel 不应该知道 daemon payload 格式

## Goals / Non-Goals

**Goals:**
- 将 `part-resolver.ts` 移至 `work/` 暂存
- 将 `blueprint-parser.ts` 迁移至 CLI 或删除

**Non-Goals:**
- 不在当前阶段完成 part-resolver 的完整拆分

## Decisions

### Decision 1: part-resolver 暂存至 work/

**选择:** 先移动到 `work/part-resolver.ts`，后续再拆分

**理由:** 需要拆分的工作量较大，作为独立任务处理

### Decision 2: blueprint-parser 迁移至 CLI

**选择:** 检查 CLI 是否有替代实现，如果没有则删除

**理由:** Kernel 不需要 YAML 解析能力

## Risks / Trade-offs

**风险:** oxn-adapter.ts 依赖 resolvePartRef

**缓解:** 目前 oxn-adapter 在 oxn-dsl 层，不影响 Kernel 纯净性

## Migration Plan

1. 创建 `src/work/` 目录
2. 移动 `kernel/lib/part-resolver.ts` → `work/part-resolver.ts`
3. 检查 `blueprint-parser.ts` 使用方，决定迁移或删除
4. 更新 kernel/index.ts 移除相关导出
5. 运行测试验证

## Open Questions

- `blueprint-parser.ts` 的 YAML 解析逻辑是否还有其他地方使用？