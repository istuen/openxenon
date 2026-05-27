## 1. 创建 Infra 层 I/O 能力

- [ ] 1.1 创建 `src/infra/hash.ts` 实现 `computeContentHash(content: string): string`
- [ ] 1.2 创建 `src/infra/boundary.ts` 实现 `getGlobalBoundaryPath(): string`（使用 os.homedir）
- [ ] 1.3 创建 `src/infra/sandbox-manager.ts`（从 kernel 复制 fs 相关操作）

## 2. 修改 Kernel constants.ts

- [ ] 2.1 移除 `constants.ts` 中的 `from 'os'` 导入
- [ ] 2.2 修改 `BOUNDARY_DIR` 使用 `infra/boundary.ts` 的 `getGlobalBoundaryPath()`
- [ ] 2.3 验证 `kernel/index.ts` 导出仍然正确

## 3. 修改 Kernel frozen-schema.ts

- [ ] 3.1 移除 `frozen-schema.ts` 中的 `from 'crypto'` 导入
- [ ] 3.2 修改 `computeContentHash` 改为从 `infra/hash.ts` 导入
- [ ] 3.3 保留 `createXenonMeta` 函数签名不变
- [ ] 3.4 验证 typecheck 通过

## 4. 修改 Kernel sandbox-manager.ts

- [ ] 4.1 修改 `kernel/processors/sandbox-manager.ts` 改为 re-export `infra/sandbox-manager.ts`
- [ ] 4.2 验证 typecheck 通过

## 5. 更新调用方

- [ ] 5.1 更新 `kernel/blueprint-freezer.ts` 使用迁移后的 `computeContentHash`
- [ ] 5.2 验证 `oxn-dsl/compiler/blueprint-compiler.ts` 使用 `infra/hash.ts`
- [ ] 5.3 检查所有从 kernel 导入 sandbox 的文件，必要时更新

## 6. 验证零 I/O 约束

- [ ] 6.1 运行 `grep -r "from 'fs'" src/kernel/` 确认无结果
- [ ] 6.2 运行 `grep -r "from 'os'" src/kernel/` 确认无结果
- [ ] 6.3 运行 `grep -r "from 'crypto'" src/kernel/` 确认无结果
- [ ] 6.4 运行 typecheck 确保所有导入正确