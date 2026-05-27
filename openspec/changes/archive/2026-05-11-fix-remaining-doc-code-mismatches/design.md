## Context

审查发现 P0-P3 问题，必须修复才能自举。

**当前问题**：

| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | draft.ts getTypeFromContent 用旧字段 `proofs` 和 `proofRefs` | Proof 类型检测失败 |
| P1 | 06-troubleshooting.md 用 `oxn task new` | 文档误导 |
| P2 | 05-arsenal.md 用 `proofs: [string]` | 与 Schema 不符 |
| P3 | 02-concepts.md Blueprint 示例需注释 | BlueprintSchema 未定义 |

## Goals / Non-Goals

**Goals:**
- 修复 P0-P3 所有问题
- 代码和文档完全对齐

**Non-Goals:**
- 不定义 BlueprintSchema（P3 只加注释）

## Decisions

### P0: draft.ts 修复
```typescript
// 修复前
if (parsed.proofs || parsed.probeRefs) return 'proofs'

// 修复后
if (parsed.probes || parsed.probeRefs) return 'proofs'
```

字符串匹配同步修正。

### P1: 06-troubleshooting.md 修复
- `oxn task new my-task` → `oxn task submit --blueprint <file>`
- `oxn standards` → `oxn arsenal`

### P2: 05-arsenal.md 修复
```yaml
# 修复前
proofs:
  - check_composer_json
  - check_laravel_dependency

# 修复后
probes:
  - ref: check_composer_json
    description: "检查 composer.json 存在"
```

### P3: 02-concepts.md 修复
添加注释：
```yaml
# 注意：此为简化示例
# 完整的 Blueprint Schema 尚未定义
# proof 字段格式待 BlueprintSchema 确定后更新
```

## Risks / Trade-offs

- **风险**: 修复后可能破坏现有功能
  - Mitigation: 先写测试，运行 `pnpm test` 验证

- **权衡**: P3 是否定义 BlueprintSchema？
  - 决策: 暂不定义，只加注释；BlueprintSchema 是更大工作