## 1. 修复 daemon/registry.ts

- [x] 1.1 移除 `daemon/registry.ts` 中 `import { existsSync, readdirSync, readFileSync } from 'fs'`
- [x] 1.2 改为导入 `listStandards` from `infra/loader`
- [x] 1.3 实现 `buildIndex()` 使用 `listStandards()` 获取资产
- [x] 1.4 保留 `search()` 和 `getByType()` 逻辑（纯内存操作）
- [x] 1.5 验证 ESLint 不再报错

## 2. 清理 kernel/index.ts 导出

- [x] 2.1 从 `kernel/index.ts` 删除 `scanProjectProofs`, `scanGlobalProofs`, `getAllCustomProofs`, `findCustomProof` 导出
- [x] 2.2 删除 `getGlobalProofsPath`, `getProjectProofsPath as getProjectProofsPathFn` 导出
- [x] 2.3 保留 `resolveCustomProofsRecursive` 相关导出（纯函数）

## 3. 修复 kernel/lib/custom-proofs-scanner.ts

- [x] 3.1 确认 `infra/scanner.ts` 已包含 `scanProjectProofsSync`, `scanGlobalProofsSync`
- [x] 3.2 保持 `kernel/custom-proofs-scanner.ts` 调用 `infra/scanner`（调度层）
- [x] 3.3 不从 `kernel/index.ts` 再导出 scan* 函数

## 4. 强化 ESLint 规则

- [x] 4.1 在 `.eslintrc.cjs` 添加规则：禁止 `src/daemon/**` 导入 `fs` 或 `node:fs`
- [x] 4.2 在 `.eslintrc.cjs` 添加规则：禁止 `src/kernel/**` 导入 `src/infra/**`
- [x] 4.3 验证两个规则都能正确检测违规

## 5. 验证与测试

- [x] 5.1 运行 `pnpm run build` 确保 TypeScript 编译通过
- [x] 5.2 运行 ESLint 确保无违规报告
- [x] 5.3 测试 `oxn arsenal search` 命令仍然正常工作