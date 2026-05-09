## 1. 分析 kernel/index.ts 当前导出

- [ ] 1.1 读取 `src/kernel/index.ts`
- [ ] 1.2 列出所有导出及其来源
- [ ] 1.3 标记 I/O 模块导出（fs, socket, process）

## 2. 确认没有调用方依赖 I/O 导出

- [ ] 2.1 `grep -r "kernel\.fs\|kernel\.socket\|kernel\.process" src/`
- [ ] 2.2 `grep -r "from.*kernel.*fs\|from.*kernel.*socket" src/`
- [ ] 2.3 如有依赖，评估是否可以迁移

## 3. 清理 index.ts

- [ ] 3.1 移除 `fs`, `socket`, `process` 导出
- [ ] 3.2 移除 `StagingManager` 导出（如有）
- [ ] 3.3 移除 `executeProbe` 导出（executor 已删除）
- [ ] 3.4 保留纯函数和类型导出

## 4. 验证

- [ ] 4.1 `pnpm run typecheck` 通过
- [ ] 4.2 `pnpm build` 通过
- [ ] 4.3 确认 I/O 模块不被 kernel 导出
