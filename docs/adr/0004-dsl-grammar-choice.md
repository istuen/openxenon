# 0004. DSL 选择 Langium 语法

**Status**: Accepted
**Date**: 2026-06-05

## Context

OpenXenon 需要一种 DSL 来描述：
- Domain / Blueprint / Work / Task 等实体的声明
- 实体间的引用（ref）
- 嵌套结构（slot、part、probe）

## Decision

v0.1 选用 **Langium** 作为 DSL 框架：

- 单一权威源：`src/oxn-dsl/langium/oxn.langium`
- 自动生成 AST：`src/oxn-dsl/generated/ast.ts`
- AST → Schema：`src/oxn-dsl/schemas/oxn-assembly.schema.ts`（Zod）
- 解析器：`src/oxn-dsl/parser/`（生成）
- 校验器：`src/oxn-dsl/validator/`

### 文件格式

- 扩展名：`.oxn`
- 编码：UTF-8
- 注释：`//` 单行

### 解析流程

```
.oxn 文件
  ↓ Langium parser
AST (ast.ts)
  ↓ Langium validator (intent-align, slot-reference)
语义校验通过的 AST
  ↓ oxn-generator
IR (oxn-assembly.schema.ts, Zod)
  ↓ Zod schema validate
强类型数据
```

## Consequences

**正面**：
- 单一权威源（.langium 文件）
- AST 自动生成（不手写）
- IDE 支持（VSCode / OpenCode 语法高亮）
- AI 工具友好（可生成 JSON Schema 给 LLM）

**负面**：
- 依赖 Langium 生态
- 学习曲线（Langium grammar 语法）
- 每次 grammar 变更需重新生成 AST（`pnpm build`）

## Alternatives Considered

### Alternative 1: 手写 Parser（手写 Recursive Descent）
- 优点：无外部依赖
- 缺点：错误处理差，AST 与 parser 同步难

### Alternative 2: PEG.js / Peggy
- 优点：语法易读
- 缺点：生态比 Langium 小，IDE 支持弱

### Alternative 3: JSON Schema + JSON 实体
- 优点：纯数据
- 缺点：无注释能力，AI 写起来冗长

### Alternative 4: TS as DSL
直接用 TypeScript 写实体。

- 优点：类型安全
- 缺点：业务专家无法维护

## References

- [OXN DSL 参考](../reference/oxn-dsl.md)
- Langium 文档：https://langium.org
- `src/oxn-dsl/langium/oxn.langium`
