# OpenXenon 项目 Domain 索引

> 本文档梳理 OpenXenon 自身的业务限界上下文，用于内部 DDD 治理与 AI 上下文注入。

## 1. 核心 Domain 矩阵

| Domain | 一句话定位 | 关键名词 | 关键动词 | 业务规则 |
|---|---|---|---|---|
| **ArsenalContext** | 资产管理（DRAFT → CANONICAL） | Blueprint/Part/Probe/Arsenal/Draft/Forge | Forge/Promote/Fork/Extract/Inspect/Render | 资产依赖层级：Probe → Part → Blueprint；type 锁定；version 单调递增 |
| **WorkContext** | 任务执行沙盒 | Work/Task/Artifact/Snapshot/Frozen/Trace/SkillContext | Execute/Submit/Verify/Freeze/Resume/Complete/Bind | Work.type 必须与 Blueprint.type 强一致；frozen.json 只读；trace 追加写 |
| **DSLContext** | OXN DSL 自身 | Grammar/Schema/Validator/Compiler/AST/IR/Token/Entity | Parse/Validate/Compile/Generate/Bundle | oxn.langium 是唯一权威；schema 必须与 grammar 一一对应；validator 必须注册 |
| **CLIContext** | CLI 入口 | Command/SubCommand/Arg/OutputFormat/ErrorCode/Skill | Invoke/Output/Print/Install | 错误码以 OXN_ 前缀；AI 必须传 --json；子命令用 kebab-case |

## 2. 上下文映射

```
                    ┌─────────────────┐
                    │   CLIContext    │  ← 工程师、AI 调用入口
                    └────────┬────────┘
                             │ invokes
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ ArsenalContext│ ←→│   DSLContext  │   │  WorkContext  │
│ 资产管理      │   │  DSL 自身     │   │  任务执行     │
└───────────────┘   └───────────────┘   └───────────────┘
   defines assets      parses/validates    consumes assets
                        assets              executes them
```

## 3. 文件位置

```
.openxenon/domains/
├── arsenal-context.oxn
├── work-context.oxn
├── dsl-context.oxn
└── cli-context.oxn
```

## 4. 命名约定

- **Domain 名**：PascalCase（如 `ArsenalContext`）
- **文件名**：kebab-case（如 `arsenal-context.oxn`）
- **Context Map alias**：简短 PascalCase 别名（如 `Arsenal`、`DSL`、`Work`）

## 5. 校验与查看

```bash
# 列出所有 domain
oxn domain list

# 校验单个 domain
oxn domain validate --name ArsenalContext

# 在 work 中引用
# work.oxn 中加 use_domain "ArsenalContext";
# task.oxn 中加 inject "ArsenalContext";
```

## 6. 当前注入语义

每个 Domain 都通过 `context_map` 显式声明它依赖的其他 Domain。这不是强制约束，只是文档化，让 AI 看到域之间的依赖关系时不会跨域乱查。

例如 `ArsenalContext` 引用 `WorkContext` 和 `DSLContext`，意味着：
- AI 在 Arsenal 任务下，能知道"Work 在用我的资产"
- AI 在 Arsenal 任务下，能知道"这些资产用 .oxn 描述"
- 但**实际注入按 task.oxn 的 `inject` 列表**决定，context_map 仅做映射说明
