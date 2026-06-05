# 0005. YAML/JSON Blueprint 废弃

**Status**: Accepted
**Date**: 2026-06-05

## Context

v0.0.x 时代，Blueprint 可以是 YAML 或 JSON 格式。这导致：
- 工具链分裂（YAML 解析 vs JSON 解析）
- 业务专家必须学 YAML 语法（带类型标注）
- 语法糖膨胀（YAML 缩进、JSON 标点）
- v0.1 引入 OXN DSL 后，YAML/JSON 已无优势

## Decision

v0.1 起，**OXN DSL 是 Blueprint 唯一权威格式**：

- ✅ 支持：`.oxn` 文件
- ❌ 不再支持：`.yaml` / `.yml` / `.json` Blueprint

### 迁移路径

```bash
# 旧 YAML Blueprint
oxn work migrate --dry-run    # 预览
oxn work migrate               # 实际迁移
```

迁移会：
- 把 `blueprint.yaml` 转写为 `blueprint.oxn`
- 把 v0.0.x 字段（stages/exec/expectation）转写为 v0.1 字段（slot/observe）
- 保留 prop 定义、deps 拓扑

## Consequences

**正面**：
- 单一权威源
- 解析器简化
- AI 训练数据更一致

**负面**：
- 旧项目需迁移
- 业务专家需学 OXN DSL（但语法极简）

## Alternatives Considered

### Alternative 1: 同时支持 YAML + OXN
- 优点：渐进式迁移
- 缺点：维护两套解析器，长期分裂

### Alternative 2: 仅 OXN，硬切换
- 优点：简洁
- 缺点：硬切换风险

我们采用**软迁移**：`oxn work migrate` 工具自动转写。

## References

- [迁移指南](../guides/troubleshooting.md#9-迁移错误)
- `src/cli/work-migrate.ts`（迁移 CLI 实现）
- `DEPRECATION.md`（YAML 废弃说明）
