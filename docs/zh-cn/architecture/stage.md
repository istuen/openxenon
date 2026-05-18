# Stage（工序节点）

Stage 是 Blueprint 的最小执行单元，定义一个完整的执行与校验闭环。

## 四字段结构

Stage 包含四个平铺字段，按可见性分为两组：

| 字段 | 可见性 | 含义 |
|------|--------|------|
| `target` | 对 AI 可见 | 约束执行的作用域 |
| `action` | 对 AI 可见 | 下发给 AI 的执行指令 |
| `spec` | 对 AI 不可见 | 工程师对意图的结构化约束 |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

## 结构示例

```yaml
id: create-user-model
name: 创建用户模型
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

**交互流程**：

```
AI 调用 taskNext
    │
    ▼
Core 返回 target + action（隐藏 spec + probes）
    │
    ▼
AI 执行操作，构建 Artifact
    │
    ▼
AI 调用 taskVerify
    │
    ▼
Core 取出 probes，校验 Artifact
    │
    ▼
Core 返回判定结果
```

## Probe 组合

一个 Stage 可包含多个 Probe，形成完整的验证闭环：

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

所有 Probe 必须通过，Stage 才判定为 PASSED。

## 资产化价值

- **标准沉淀**：Stage 可跨 Blueprint 复用
- **可组合**：Probe 组合形成灵活的验证逻辑
- **可积累**：好的 Stage 可沉淀为团队规范
