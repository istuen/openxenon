## 1. Grammar 修改

- [x] 1.1 在 oxn.langium 中新增 BuiltInWorkType Data Type Rule (`'task' | 'plan' | 'explore'`)
- [x] 1.2 修改 BlueprintDeclaration 使用 union 语法支持内置关键字简写
- [x] 1.3 验证 grammar 语法正确性

## 2. 代码生成

- [x] 2.1 运行 Langium 生成器重新生成 grammar.ts
- [x] 2.2 运行 Langium 生成器重新生成 ast.ts (如需要)
- [x] 2.3 验证生成的代码编译通过

## 3. 测试验证

- [x] 3.1 编写 Blueprint 解析测试：验证内置关键字简写语法
- [x] 3.2 编写 Blueprint 解析测试：验证自定义类型显式 type 语法
- [x] 3.3 编写 Blueprint 解析测试：验证两种写法产生相同 AST
- [x] 3.4 运行现有测试确保向后兼容

## 4. 清理验证

- [x] 4.1 删除测试遗留的 work 目录（test-debug, test-plan-debug, test-fix-debug, test-explore-debug）
- [x] 4.2 运行 `bun run typecheck` 确认类型正确
- [x] 4.3 运行 `bun run lint` 确认代码规范