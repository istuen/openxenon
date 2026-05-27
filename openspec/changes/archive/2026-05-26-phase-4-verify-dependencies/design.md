## Context

Phase 1-3 重构完成后，需要验证依赖图是否符合 L0-L3 宪法。手动审查容易遗漏，需要自动化验证机制来守护架构边界。

当前依赖违规案例：
- `infra → arsenals` (L1 → L2 反向)
- `infra → kernel/schemas/frozen-schema` (L1 → L0 业务类型)
- `oxn-dsl → work/part-resolver` (L1 → L2 越界)
- `oxn-dsl → kernel/lib/project` (L1 → L0 应用层概念)

## Goals / Non-Goals

**Goals:**
- 创建自动化依赖验证脚本
- 在 CI 阶段检测依赖违规
- 确保 Phase 1-3 的改动有对应测试覆盖

**Non-Goals:**
- 不修改现有测试框架
- 不改变代码结构，只添加验证

## Decisions

### Decision 1: 分层规则定义

**选择**: 定义明确的层级依赖规则，脚本据此检查

**规则定义**:
```typescript
const LAYER_RULES = {
  'L0-Kernel': {
    allowedDeps: ['L0-Schema'], // 只依赖 Schema
    forbiddenDeps: ['L1-Infra', 'L2-Arsenal', 'L2-Work', 'L3-CLI']
  },
  'L1-Infra': {
    allowedDeps: [], // 零依赖
    forbiddenDeps: ['L0-Kernel', 'L2-Arsenal', 'L2-Work', 'L3-CLI']
  },
  'L1-OXN-DSL': {
    allowedDeps: ['L0-Schema'],
    forbiddenDeps: ['L0-Kernel', 'L2-Arsenal', 'L2-Work']
  },
  'L2-Arsenal': {
    allowedDeps: ['L1-Infra', 'L0-Schema'],
    forbiddenDeps: ['L2-Work', 'L3-CLI']
  },
  'L2-Work': {
    allowedDeps: ['L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Kernel'],
    forbiddenDeps: ['L3-CLI']
  },
  'L3-CLI': {
    allowedDeps: ['L2-Arsenal', 'L2-Work', 'L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Kernel'],
    forbiddenDeps: []
  }
}
```

### Decision 2: 模块归属判断

**选择**: 基于路径规则判断模块归属

**规则**:
```
src/kernel/**         → L0-Kernel (或 L0-Schema)
src/infra/**          → L1-Infra
src/oxn-dsl/**        → L1-OXN-DSL
src/arsenals/**       → L2-Arsenal
src/work/**           → L2-Work
src/cli/**            → L3-CLI
src/daemon/**         → L3-CLI
```

### Decision 3: 验证输出格式

**选择**: 结构化输出，便于 CI 解析

**输出格式**:
```json
{
  "valid": true,
  "violations": [],
  "summary": {
    "totalModules": 50,
    "totalImports": 234,
    "violationsCount": 0
  }
}
```

或违规时:
```json
{
  "valid": false,
  "violations": [
    {
      "from": "infra/loader.ts",
      "to": "arsenals/builtin.ts",
      "rule": "L1-Infra cannot depend on L2-Arsenal",
      "line": 5
    }
  ],
  "summary": {...}
}
```

## Risks / Trade-offs

[风险]: 路径规则可能无法覆盖所有情况
→ 缓解: 提供配置机制，允许自定义模块归属

[风险]: 新模块可能需要更新规则
→ 缓解: 规则文件独立，便于更新

[风险]: 脚本本身可能有 bug
→ 缓解: 有对应的单元测试覆盖

## Migration Plan

1. 创建 `scripts/validate-dependencies.ts`
2. 实现 import 扫描和层级判断逻辑
3. 实现违规报告输出
4. 创建 `.github/workflows/validate-deps.yml`
5. 为 Phase 1-3 的改动添加集成测试

**回滚策略**: 如果验证脚本影响 CI，可以禁用该步骤继续开发，但不推荐。