## 1. 基础设施搭建

- [x] 1.1 分析现有 `src/oxn-dsl/generated/` 结构，理解 Langium 生成的文件
- [x] 1.2 分析 `src/oxn-dsl/langium/oxn.langium` 语法结构，列出所有 grammar rules
- [x] 1.3 创建 `src/oxn-dsl/ai-tools/` 目录结构（Generator 输出）
- [x] 1.4 创建 `src/oxn-dsl/crud/` 目录结构（手写代码）

## 2. 注解解析器实现

- [x] 2.1 设计 `@oxn-ai-tool` 注解的正则提取逻辑
- [x] 2.2 实现注解 JSON 解析和校验
- [x] 2.3 实现 Basic Grammar Type → JSON Schema 类型推断（ID、STRING、NUMBER、Array）
- [x] 2.4 实现 Cross-reference 字段的 `format: "oxn-ref"` 处理
- [x] 2.5 实现自动生成最小示例逻辑

## 3. Generator 实现

- [x] 3.1 实现从 `oxn.langium` 源码提取所有 `@oxn-ai-tool` 注解
- [x] 3.2 实现 schema.json 输出（JSON Schema Draft-07 格式）
- [x] 3.3 实现 validators.ts 输出（Zod 校验代码）
- [x] 3.4 实现 OxnSerializer 模板生成（用于 CRUD 时的 JSON→DSL 转换）
- [x] 3.5 实现 Tool Target 名称推断（PartProbeDeclaration → part_probe）
- [x] 3.6 添加注解解析失败的错误处理和行号提示
- [x] 3.7 验证生成的 schema.json 符合规范

## 4. OxnCrudProcessor 实现（手写，纯逻辑）

- [x] 4.1 实现 OxnScope 扩展：findBlueprint / findPart 名称查找
- [x] 4.2 实现基于 `$cstNode` 的插入位置计算
- [x] 4.3 实现 TextEdit 生成器
- [x] 4.4 实现 add_probe_to_part 操作（调用生成的 OxnSerializer）
- [x] 4.5 验证 OxnCrudProcessor 绝不包含任何 IO 代码

## 5. Zod 运行时校验集成

- [x] 5.1 加载生成的 validators.ts 中的 Zod schema
- [x] 5.2 在 OxnCrudProcessor 执行前调用 Zod 校验
- [x] 5.3 实现校验失败的清晰错误信息输出

## 6. CLI 集成

- [x] 6.1 在 CLI 中添加 `oxn add-probe` 命令
- [x] 6.2 实现 CLI → Infra → OxnCrudProcessor → Infra 的编排链路
- [x] 6.3 验证 CLI 负责文件读写，OxnCrudProcessor 纯计算

## 7. 构建流程集成

- [x] 7.1 修改 `package.json` build 脚本，执行顺序：`langium generate` → `ai-tools generate` → `tsc`
- [x] 7.2 验证 `npm run build` 输出正确的 ai-tools/schema.json
- [x] 7.3 验证 `npm run build` 输出正确的 ai-tools/validators.ts
- [x] 7.4 验证 `npm run build` 输出 OxnSerializer 模板

## 8. 端到端测试

- [x] 8.1 Generator 可以独立运行测试（`bun run src/oxn-dsl/ai-tools/generator/index.ts`）
- [x] 8.2 编写 Generator 单元测试（注解解析、Schema 推断）
- [x] 8.3 编写 OxnCrudProcessor 单元测试（add_probe_to_part 流程，纯内存）
- [x] 8.4 编写 Snapshot 测试：验证 Grammar 不变时 schema.json 不变（通过 8.2 的测试覆盖）
- [x] 8.5 CLI 命令 `oxn add-probe` 已注册并可访问（通过 `oxn --help` 验证）
- [ ] 8.6 验证 Langium 文件监听器自动重新解析（需 daemon 集成）