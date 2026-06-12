## 1. Grammar 修改

- [x] 1.1 删除 `oxn.langium` 中的 `TaskDeclaration`
- [x] 1.2 新增 `WorkDeclaration` 语法（`work` keyword，`type`、`ref` 属性）
- [x] 1.3 修改 `PartSlotDeclaration` 支持 `slot[]` 语法
- [x] 1.4 修改 `TopLevelEntity` 引入 `WorkDeclaration`，移除 `TaskDeclaration`
- [x] 1.5 为 `BlueprintDeclaration` 添加 `type` 属性（默认 `"task"`）

## 2. Langium 生成

- [x] 2.1 运行 `langium generate` 重新生成 `generated/ast.ts`
- [x] 2.2 运行 `langium generate` 重新生成 `generated/grammar.ts`
- [x] 2.3 运行 `langium generate` 重新生成 `generated/module.ts`
- [x] 2.4 验证生成的文件无编译错误

## 3. Document Builder 修改

- [x] 3.1 扩展 `collectBindingRefsFromDocument` 支持 `WorkDeclaration`
- [x] 3.2 收集 `WorkDeclaration.ref` 而非 `TaskDeclaration.use`
- [x] 3.3 实现外部引用深度检测（限制 4 层）
- [x] 3.4 测试外部 .oxn 文件递归加载

## 4. Generator 修改

- [x] 4.1 删除 `convertTaskDeclaration` 函数
- [x] 4.2 新增 `convertWorkDeclaration` 函数
- [x] 4.3 更新 `convertTopLevelEntity` 分发逻辑（`TaskDeclaration` → `WorkDeclaration`）
- [x] 4.4 更新 `extractTasks` → `extractWorks`
- [x] 4.5 更新 `categorizeEntities` 中的 task → work
- [x] 4.6 验证 IR 生成正确性

## 5. Validator 修改

- [x] 5.1 实现 `WorkBlueprintTypeValidator`（type 1:1 校验）
- [x] 5.2 实现 `SlotReferenceValidator`（slot 存在性校验）
- [x] 5.3 集成 validator 到 Langium 流水线
- [x] 5.4 测试校验错误消息正确性

## 6. oxn-work Skill 新增

- [x] 6.1 复制 `.opencode/skills/oxn-task` 为 `oxn-work`
- [x] 6.2 替换 skill 内所有 `task` → `work`
- [x] 6.3 更新 skill metadata（name、description）
- [x] 6.4 验证 skill 加载正常

## 7. work CLI 新增

- [x] 7.1 复制 `src/commands/task.ts` 为 `work.ts`
- [x] 7.2 替换 CLI 内所有 `task` → `work`
- [x] 7.3 更新 CLI help 和 description
- [x] 7.4 注册 `work` 命令到 CLI 入口
- [x] 7.5 验证 `work init`、`work list`、`work validate` 功能

## 8. 目录结构

- [x] 8.1 确认 `.openxenon/work/<type>/` 目录创建逻辑
- [x] 8.2 验证 `work init --type task` 在正确目录创建文件
- [x] 8.3 验证自定义 type（如 `pipeline`）创建对应子目录

## 9. 集成测试

- [x] 9.1 编写 WorkDeclaration 语法解析测试
- [x] 9.2 编写 type 1:1 校验测试
- [x] 9.3 编写 slot[] 多次绑定测试
- [x] 9.4 编写外部文件引用深度测试
- [x] 9.5 更新现有测试（替换 TaskDeclaration → WorkDeclaration）

## 10. 文档与迁移

- [x] 10.1 更新 OXN 语法文档
- [x] 10.2 编写 TaskDeclaration → WorkDeclaration 迁移指南
- [x] 10.3 （可选）提供 codemod 脚本