## Context

当前 `oxn init --force` (-f) 只更新心跳时间，不重新编译 Skill。用户如果想强制重编译 Skill，必须显式使用 `--compile-force` 参数。

**现状：**
- `--force` / `-f`: 只更新心跳时间
- `--compile-force`: 强制重写所有 Skill 文件

**问题：** 当 Skill 源码更新后，用户需要同时使用 `-f --compile-force` 才能强制重编译，使用不便。

## Goals / Non-Goals

**Goals:**
- 修改 `--force` 行为：同时触发 Skill 强制重编译
- 保持向后兼容：`--compile-force` 仍可单独使用

**Non-Goals:**
- 不修改 `--force` 对心跳更新的行为
- 不改变 Skill 编译的其他逻辑

## Decisions

### 1. 修改 `--force` 行为

当 `force` 为 `true` 时，自动设置 `compileForce = true`：

```typescript
const compileForce = ctx.args['compile-force'] as boolean || force
```

**替代方案**：创建新的 `--reinit` 参数 → 拒绝，增加复杂性

### 2. 描述更新

更新 `--force` 参数的 description：
- 从：`强制重新初始化（更新心跳时间）`
- 到：`强制重新初始化（更新心跳时间 + 强制重编译 Skill）`

## Risks / Trade-offs

无风险。这是一个简单的逻辑修改。

## Open Questions

无