## 1. forge.ts 内置常量 fallback

- [x] 1.1 创建 `src/arsenals/builtin.ts`，包含 BUILTIN_FORGES、BUILTIN_PROBES、BUILTIN_PROOFS 常量
- [x] 1.2 添加 `tryLoadForgeFile` 辅助函数（只读文件系统）
- [x] 1.3 修改 `loadMetaForge` 函数，实现：项目级 → 全局级 → 内置常量
- [x] 1.4 验证 `oxn forge probe` 从任意目录返回内置 meta-probe 约束

## 2. loader.ts 内置常量 fallback

- [x] 2.1 在 `src/arsenals/loader.ts` 中导出内置资产的索引函数
- [x] 2.2 在 `scanArsenalsDirectory` 中增加 `scope: 'builtin'` 分支，从常量读取
- [x] 2.3 修改 `fallback` 行为：项目级 → 全局级 → 内置常量
- [x] 2.4 验证 `oxn arsenal list` 在空项目显示内置资产

## 3. 构建脚本简化

- [x] 3.1 `cp -r src/arsenals dist/arsenals` 保留（YAML 文件作为源，人可读）
- [x] 3.2 构建产物包含内置常量（编译进二进制）和 dist/arsenals（YAML 备份）

## 4. Skills 去 daemon 引用

- [x] 4.1 修改 `src/skills/oxn-task.ts`，删除 `oxn daemon start` 指令行
- [x] 4.2 将 `oxn arsenal search <关键词>` 替换为 `oxn arsenal list`
- [x] 4.3 修改 `src/skills/oxn-init.ts`，删除 `oxn daemon status` 相关指令，改为 `ls .openxenon/` 验证

## 5. 验证自举闭环

- [x] 5.1 在空目录执行 `oxn init`
- [x] 5.2 执行 `oxn forge probe`，确认输出内置 meta-probe 约束
- [x] 5.3 执行 `oxn arsenal list`，确认显示内置资产列表
- [x] 5.4 执行 `pnpm typecheck`，确认无类型错误