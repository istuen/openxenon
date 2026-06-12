## Why

OXN DSL 目前只实现了读取闭环（`.oxn` → Langium AST → Kernel IR），无法通过结构化指令修改 `.oxn` 文件。这导致 AI 与 DSL 的交互必须依赖生成 DSL 文本，极易引发语法错误和符号幻觉。

根据 OpenXenon AI 交互设计指南，AI 的正确交互范式是「理解 Schema → 获取上下文 → 下发结构化指令」，而不是直接生成 DSL 文本。

## What Changes

- **新增 AI Tools Schema 生成管线**：在 `npm run build` 时，Generator 从 `oxn.langium` 源码自动推断并生成 AI Tools JSON Schema（`ai-tools/schema.json`）
- **新增 oxn.langium 注解支持**：在 grammar 源码中添加 `@oxn-ai-tool` 注解，提供 name、description 等元数据
- **新增 OxnCrudService**：运行时 CRUD 操作引擎，基于 Langium CST 的 TextEdit 实现安全变更
- **新增 Zod 运行时校验**：基于生成的 schema 对 AI 输入做运行时参数校验
- **新增 ai-tools/ 目录**：存放 Generator 输出的 schema.json 和 crud-service.ts

## Capabilities

### New Capabilities

- `ai-tools-schema`: 从 `oxn.langium` grammar 结构和注解自动生成 AI Tools JSON Schema，供 AI System Prompt 使用
- `oxn-crud-service`: 运行时 CRUD 操作服务，通过结构化指令（而非 DSL 文本）修改 `.oxn` 文件
- `oxn-ai-annotation`: `oxn.langium` 源码注解规范，定义 AI tool 元数据的格式和位置

### Modified Capabilities

- 无（不影响现有 spec）

## Impact

- **新增目录**：`src/oxn-dsl/ai-tools/`（Generator 输出：schema.json + validators.ts）
- **新增目录**：`src/oxn-dsl/crud/`（手写代码：oxn-crud-processor.ts）
- **修改文件**：`src/oxn-dsl/langium/oxn.langium`（添加 `@oxn-ai-tool` 注解）
- **修改构建流程**：`package.json` 的 `build` 脚本需调整执行顺序
- **新增 Generator 模块**：`src/oxn-dsl/ai-tools/generator/`（注解解析器 + Schema 生成器）
- **运行时职责**：`OxnCrudProcessor` 纯计算，`Infra` 负责文件 IO