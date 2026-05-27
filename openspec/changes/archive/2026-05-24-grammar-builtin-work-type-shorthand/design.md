## Context

当前 OXN DSL 的 Blueprint 声明语法：

```oxn
blueprint "ci-flow" type "task" { }
blueprint "plan" type "plan" { }
blueprint "explore" type "explore" { }
```

对于内置类型（task/plan/explore），`type "xxx"` 语法显得冗余。

## Goals / Non-Goals

**Goals:**
- 提供内置类型的简写语法
- 保持自定义类型的显式 `type` 语法
- 统一 AST 结构，两种写法等价

**Non-Goals:**
- 不修改现有 AST 类型定义
- 不影响自定义类型（fix/test 等）的使用方式

## Decisions

### Decision 1: Grammar 实现方式

**选择方案：Data Type Rule + Union**

```langium
// 新增 BuiltInWorkType Data Type Rule
BuiltInWorkType returns string:
    'task' | 'plan' | 'explore';

// BlueprintDeclaration 修改
BlueprintDeclaration:
    'blueprint' name=STRING
    (
        type=BuiltInWorkType        // 内置关键字 shorthand
      | 'type' type=STRING          // 自定义类型
    )
    '{'
        (properties...)
    '}';
```

**替代方案考虑：**
- 方案 A（选中）：Data Type Rule — Grammar 层简洁，AST 统一
- 方案 B：分开两种 AST 节点 — 增加复杂度，不必要

### Decision 2: 内置类型标识符

使用关键字形式，不带引号：

```oxn
// 内置类型 - 关键字
blueprint "ci-flow" task { }

// 自定义类型 - 字符串
blueprint "hotfix" type "fix" { }
```

### Decision 3: AST 结构保持不变

```typescript
export interface BlueprintDeclaration extends langium.AstNode {
    type: string;  // "task" | "plan" | "explore" | 任意自定义字符串
}
```

两种写法产生完全相同的 AST，只是 `type` 字段的值不同。

## Risks / Trade-offs

- [风险] 现有 canonical.oxn 文件使用 `type "task"` 语法 — **兼容**，两种写法都有效
- [风险] 开发者可能混淆两种语法 — **缓解**：文档和 Skill 指引清晰说明
- [权衡] 关键字语法需要 IDE/LSP 支持才能高亮 — Langium 本身支持，无额外工作