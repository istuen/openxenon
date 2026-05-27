## 1. 更新 Grammar 定义

- [x] 1.1 修改 oxn.langium：PartSlotDeclaration 支持 `slot` 和 `slots[]`
- [x] 1.2 修改 SlotBinding：支持显式 part 名 `part "p1" slot "name"`
- [x] 1.3 SlotBinding 保持语法糖 `part slot "name"` 等价于 `part "name" slot "name"`
- [x] 1.4 重新生成 langium: `npx langium generate`
- [x] 1.5 验证生成的 AST 包含 isMulti 字段（通过 $type: SlotMulti vs SlotSingle）

## 2. 更新 Schema 和 Compiler

- [x] 2.1 更新 oxn-assembly.schema.ts：OxnAssemblySlot 添加 isMulti 字段
- [x] 2.2 更新 blueprint-compiler.ts：处理 slots[] 多实例语义
- [x] 2.3 更新 frozen-schema.ts：FrozenBlueprint slots 包含 isMulti
- [x] 2.4 添加向后兼容：读取旧格式 frozen.json 时 isMulti 默认为 false

## 3. 更新 builtin OXN 资产

- [x] 3.1 更新 migrated-blueprints.oxn：替换 `stage` 为 `part slot`
- [x] 3.2 为所有 Blueprint 添加 `type "task"` 字段
- [x] 3.3 验证修改后的 Blueprint 可被解析

## 4. 修复 oxn-forge Skill 文档

- [x] 4.1 更新 blueprint-format.md：添加 `type` 字段
- [x] 4.2 说明 `part slot` (单实例) vs `part slots[]` (多实例) 的区别
- [ ] 4.3 验证修改后的文档格式可被解析

## 5. 修复 oxn-task Skill 文档

- [x] 5.1 更新 instruction.md：替换 `task` 为 `work`，`use` 为 `ref`
- [x] 5.2 更新 references/blueprint-format.md：添加 `type` 字段，说明 slot 语法
- [ ] 5.3 验证修改后的文档格式可被解析

## 6. 修复 oxn-plan Skill 文档

- [x] 6.1 更新 instruction.md：修正 Blueprint 引用
- [x] 6.2 更新 Blueprint 示例格式：添加 `type` 字段，使用 `part slots[]`
- [ ] 6.3 验证修改后的文档格式可被解析

## 7. 验证与测试

- [x] 7.1 运行 OXN DSL 测试确保解析器仍然正常工作
- [x] 7.2 验证语法糖 `part slot "name"` 工作正常
- [x] 7.3 验证多实例绑定 `part "p1" slot "name"` 工作正常
- [x] 7.4 验证 frozen.json 输出包含 isMulti 字段
- [x] 7.5 确认没有引入新的语法错误