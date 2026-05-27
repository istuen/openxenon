## 1. 创建标准目录结构

- [x] 1.1 在 `src/core/` 下创建 `standards-paths.ts` 定义目录路径常量
- [x] 1.2 实现目录自动创建逻辑，确保 DRAFT/CANONICAL 子目录存在
- [x] 1.3 更新 `src/core/global.ts` 导出标准目录路径

## 2. 实现资产加载模块

- [x] 2.1 创建 `src/core/standards-loader.ts` 统一加载标准资产
- [x] 2.2 实现 `loadStandardsByState(state: 'DRAFT' | 'CANONICAL')` 函数
- [x] 2.3 实现 `loadStandardByPath(path: string)` 函数
- [x] 2.4 实现 `promoteStandard(fromPath: string)` 函数

## 3. 实现 CLI 命令

- [x] 3.1 创建 `src/commands/standards.ts` 主命令文件
- [x] 3.2 实现 `standards list` 子命令
- [x] 3.3 实现 `standards inspect` 子命令
- [x] 3.4 实现 `standards promote` 子命令
- [x] 3.5 更新 `src/commands/index.ts` 导出新命令
- [x] 3.6 更新 `src/cli.ts` 添加 standards 子命令

## 4. 迁移现有资产

- [x] 4.1 无需迁移（MVP 无需迁移的 blueprints）
- [x] 4.2 无需迁移（MVP builtin proofs 是 TypeScript 代码，非 YAML 资产）
- [x] 4.3 无旧目录结构需清理

## 5. 测试验证

- [x] 5.1 运行 `bun test` 确保 MVP 测试通过（8/8）
- [x] 5.2 手动测试：`oxn standards list` ✓
- [x] 5.3 手动测试：`oxn standards inspect` ✓
- [x] 5.4 手动测试：`oxn standards promote` ✓