## Why

重构完成后需要验证依赖图是否符合 L0-L3 宪法。需要编写自动化检查脚本，确保：
1. 无跨层越界依赖 (L1 → L2, L1 → L0 业务逻辑)
2. 无反向依赖 (外层依赖内层)
3. 无循环依赖

手动审查容易遗漏，自动化验证是架构守护的关键机制。

## What Changes

### 依赖图验证脚本
- 创建 `scripts/validate-dependencies.ts`
- 扫描所有 `.ts` 文件的 import 语句
- 按层级 (L0/L1/L2/L3) 校验依赖方向
- 标记违规的依赖并退出码非零

### 层级依赖规则
```
L0 Kernel:   → L0 Schema (零依赖，绝对真理)
L1 Infra:    → 零依赖 (纯物理做功)
L1 OXN DSL:  → L0 Schema (产出契约)
L2 Arsenal:  → L1 Infra, L0 Schema
L2 Work:     → L1 Infra, L1 OXN DSL, L0 Schema
L3 CLI/Daemon: → L2, L1, L0 (组合根)
```

### 测试覆盖
- 所有 Phase 1-3 的改动必须有对应测试
- 测试验证重构前后功能一致性
- 依赖违规必须在 CI 阶段检测

## Capabilities

### New Capabilities
- `dep-validation`: 自动化依赖方向验证机制

### Modified Capabilities
- （无）

## Impact

### 受影响文件
- `scripts/validate-dependencies.ts` — (新建) 依赖验证脚本
- `scripts/run-all-tests.ts` — (可能修改) 测试入口
- `.github/workflows/validate-deps.yml` — (新建) CI 验证流程

### 验证检查点
- Phase 1: infra 无 arsenals/kernel 依赖
- Phase 2: oxn-dsl 无 work/kernel/lib/project 依赖
- Phase 3: infra/loader 无 builtin/promoteStandard
- 所有测试通过