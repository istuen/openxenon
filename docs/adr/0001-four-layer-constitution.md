# 0001. 四层架构宪法（L0-L3）

**Status**: Accepted
**Date**: 2026-06-05

## Context

OpenXenon 在 0.0.x 时代采用"三层资产"（Blueprint / Stage / Probe）模型，存在以下问题：

1. **职责混淆**：Kernel 层既定义数据契约又执行 IO，纯逻辑难以证明
2. **副作用泄漏**：业务代码直接调用 `fs.readFileSync` / `process.exec`，测试困难
3. **演进阻力**：任意层级可调用任意层级，模块依赖关系混乱

## Decision

OpenXenon v0.1 强制实施**严格的 L0-L3 四层架构宪法**：

| Layer | 名称 | 核心约束 | 包含模块 |
|---|---|---|---|
| **L0** | Kernel | 纯函数、零 IO、零状态 | Schema / Contract / Processor |
| **L1** | Foundation | DSL 解析 + 物理 IO 收口 | OXN DSL（Grammar/Parser/Validator）+ Infra（FsPort/PathPort/ProbePort） |
| **L2** | **Module** | 业务与工程模块自治 | Arsenal（v0.0.x 兼容）+ Domain + Work |
| **L3** | Runtime | 入口与外部交互 | CLI / Daemon / Skill / Hall |

### 物理文件归属

| 层级 | 物理位置 |
|---|---|
| L0 Kernel | `src/kernel/`, `src/oxn-dsl/schemas/` |
| L1 Foundation | `src/oxn-dsl/langium/`, `src/infra/` |
| L2 Module | `src/arsenals/`, `.openxenon/domains/`, `.openxenon/blueprints/`, `.openxenon/works/` |
| L3 Runtime | `src/cli/`, `src/daemon/`, `src/skills/`, `src/hall/`（待实现） |

## Consequences

**正面**：
- L0 Kernel 可被独立单元测试（不依赖 IO mock）
- L1 Port 模式便于测试和替换实现
- L2 Module 业务逻辑与 L3 入口解耦
- 模块依赖单向，演进可预测

**负面**：
- 增加了初期建模成本（需要明确 Port 接口）
- L0 Kernel 性能可能受纯函数限制（v0.1 暂未遇到）

## Alternatives Considered

### Alternative 1: 扁平架构
所有代码在同一层，自由调用。

- 优点：开发快
- 缺点：测试困难，副作用失控

### Alternative 2: 仅两层（Core / Shell）
- 优点：模型简单
- 缺点：Core 仍然容易混入 IO

## References

- [架构总览](../architecture/overview.md)
- L0 Kernel 测试：`tests/kernel/`
- L1 Foundation 测试：`tests/daemon/`、`src/oxn-dsl/__tests__/`
