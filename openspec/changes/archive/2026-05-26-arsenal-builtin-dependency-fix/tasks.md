## 1. 创建 BuiltinArsenal 实现

- [x] 1.1 创建 `src/arsenals/builtin-arsenal.ts` 文件
- [x] 1.2 实现 `Arsenal` 接口的 `get` 方法
- [x] 1.3 实现 `Arsenal` 接口的 `list` 方法
- [x] 1.4 实现 `create/update/delete/rename` 方法抛出只读异常
- [x] 1.5 验证 BuiltinArsenal 不导入任何 `infra/` 模块

## 2. 创建 ArsenalResolver 实现

- [x] 2.1 创建 `src/arsenals/arsenal-resolver.ts` 文件
- [x] 2.2 实现构造函数接收 Arsenal 实例数组
- [x] 2.3 实现 `resolve` 方法按优先级查找
- [x] 2.4 验证优先级为 Project > Global > Builtin

## 3. 重构 Infra loader.ts 依赖注入

- [x] 3.1 修改 `preloadCompileDependencies` 签名，添加 `builtinParts` 和 `builtinProbes` 参数
- [x] 3.2 移除 `src/infra/loader.ts` 中的 `require('../arsenals/builtin')`
- [x] 3.3 验证 Infra 层无任何 import Arsenal 的代码

## 4. 更新 preloadCompileDependencies 调用点

- [x] 4.1 更新 `src/cli/arsenal-promote.ts` 传入 BUILTIN_*
- [x] 4.2 更新 `src/cli/global-arsenal-promote.ts` 传入 BUILTIN_*
- [x] 4.3 更新 `src/cli/oxn-dual-track.ts` 传入 BUILTIN_*

## 5. 重构 Work 层 part-resolver.ts

- [x] 5.1 修改 `resolvePartRef` 接收 `ArsenalResolver` 参数
- [x] 5.2 移除 `src/work/part-resolver.ts` 中对 `BUILTIN_PARTS` 的直接 import
- [x] 5.3 更新 `resolveBuiltinPart` 使用传入的 resolver

## 6. 验证与测试

- [x] 6.1 运行 TypeScript 类型检查确保无错误
- [x] 6.2 运行现有测试确保无回归
- [x] 6.3 验证无违规依赖（Infra → Arsenal, Work → BUILTIN_*）