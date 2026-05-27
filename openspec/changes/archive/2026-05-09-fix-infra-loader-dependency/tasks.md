## 1. 修复 infra/loader.ts 物理倒灌

- [x] 1.1 修改 `scanNewStructure()` 函数签名，增加 `rootPath` 参数
- [x] 1.2 修改 `scanArsenalsDirectory()` 函数签名，增加 `rootPath` 参数
- [x] 1.3 修改 `loadStandardByName()` 函数签名，增加 `projectBoundary` 参数
- [x] 1.4 修改 `resolveAssetPath()` 函数签名，增加 `projectBoundary` 参数
- [x] 1.5 移除 `infra/loader.ts` 中对 `getProjectBoundaryPath` 的导入
- [x] 1.6 更新 `src/arsenals/loader.ts` 的调用方，确保传入完整路径

## 2. 添加 ESLint 规则

- [x] 2.1 在 `.eslintrc.json` 中添加 `no-restricted-imports` 规则
- [x] 2.2 规则目标：`src/infra/**` 不能导入 `src/kernel/**`
- [x] 2.3 验证规则能正确检测违规导入

## 3. 验证与测试

- [x] 3.1 运行 `pnpm run build` 确保 TypeScript 编译通过
- [x] 3.2 运行 ESLint 确保无违规报告
- [x] 3.3 手动测试 `oxn arsenal-list` 命令确保功能正常