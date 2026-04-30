## 1. 创建元 Blueprint 文件

- [x] 1.1 创建 `src/core/blueprints/` 目录
- [x] 1.2 创建 `src/core/blueprints/meta-forge.ts`
- [x] 1.3 定义 `metaForgeBlueprint` 对象
- [x] 1.4 导出 BlueprintSchema 验证函数

## 2. 实现 oxn-forge 集成

- [x] 2.1 修改 `oxn-forge.ts` 导入 `metaForgeBlueprint`
- [x] 2.2 根据生成类型选择对应 Stage 的 spec.constraints
- [x] 2.3 使用 constraints 作为生成提示的一部分

## 3. 测试验证

- [x] 3.1 测试导入 metaForgeBlueprint 成功
- [x] 3.2 测试 Stage 结构正确
- [x] 3.3 测试 oxn-forge 生成资产符合 BlueprintSchema