# Part（零件）

Part 是 Blueprint 的最小执行单元，定义一个完整的执行与校验闭环。

## 四字段结构

Part 包含四个平铺字段，按可见性分为两组：

| 字段 | 可见性 | 含义 |
|------|--------|------|
| `target` | 对 AI 可见 | 约束执行的作用域 |
| `action` | 对 AI 可见 | 下发给 AI 的执行指令 |
| `spec` | 对 AI 不可见 | 工程师对意图的结构化约束 |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

## 结构示例

```yaml
name: create-user-model
_version: 1
target:
  description: "在 src/models/ 目录下创建 User 模型"
  scope: "src/models/"
action:
  description: "使用 Prisma ORM 创建 User 模型，包含 id、name、email 字段"
spec:
  description: "必须使用 Prisma Client，字段类型正确，包含索引"
  constraints:
    - "使用 Prisma schema 定义"
    - "email 字段必须有唯一索引"
probes:
  - ref: fs_exists
    parameters:
      pattern: "src/models/user.ts"
  - ref: fs_match
    parameters:
      pattern: "src/models/user.ts"
      contains: "@prisma/client"
```

## 信息隐藏设计

**为什么 spec 和 probes 对 AI 不可见？**

1. **防止针对性优化**：AI 不应知道验收标准，避免"应试"行为
2. **保持判定客观**：验证逻辑由 Core 独占，AI 无法干预
3. **工程师掌控**：验收标准是工程师的"底牌"，不应暴露给执行者

## Part 与 Probe 的关系

Part 是 Probe 的容器，一个 Part 可包含多个 Probe：

```yaml
probes:
  - ref: fs_exists
    parameters:
      pattern: "dist/index.js"

  - ref: shell_exec
    parameters:
      command: "node dist/index.js --version"
      expectExitCode: 0
```

所有 Probe 必须通过，Part 才判定为 PASSED。

## 资产化价值

- **标准沉淀**：Part 可跨 Blueprint 复用
- **可组合**：Probe 组合形成灵活的验证逻辑
- **可积累**：好的 Part 可沉淀为团队规范
- **版本控制**：内置 `_version` 字段，支持 `min_version` 编译期校验