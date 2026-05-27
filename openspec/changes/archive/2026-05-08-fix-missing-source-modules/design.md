## Context

`pnpm build` 失败，20+ import 错误。问题分为两类：

1. **路径错误**：导入路径指向不存在的文件
2. **缺失模块**：`../../core/*` 和 `../../lib/*` 不存在

## 约束

- 技术栈：TypeScript, Bun
- 语言：中文（简体）
- 构建系统：Bun build

## 问题分析

### 问题 1：`src/cli.ts` 导入路径错误

**文件**：`src/cli.ts`

**原因**：命令文件在 `./cli/` 目录，但导入路径是 `./commands/*`

**状态**：已修复（修改为 `./cli/*`）

### 问题 2：`src/arsenals/` 导入路径错误

| 文件 | 错误导入 | 正确路径 | 原因 |
|------|----------|----------|------|
| `init.ts` | `./arsenals-paths` | `./paths` | 文件名是 `paths.ts` |
| `loader.ts` | `./project` | `../kernel/lib/project` | 文件在 `src/kernel/lib/project.ts` |
| `paths.ts` | `./global` | `../infra/global` | 文件在 `src/infra/global.ts` |

### 问题 3：`src/cli/api/` 废弃文件

**描述**：`src/cli/api/` 目录下的 13 个文件导入不存在的 `../../core/*` 和 `../../lib/*` 模块。

**状态**：这些文件标记为"已废弃 - 使用文件系统"，是历史遗留代码。

**决策**：删除 `src/cli/api/` 目录

## Decisions

### Decision 1: 修复 `src/arsenals/init.ts` 导入路径

将 `import from './arsenals-paths'` 改为 `import from './paths'`

### Decision 2: 修复 `src/arsenals/loader.ts` 导入路径

将 `import from './project'` 改为 `import from '../kernel/lib/project'`

### Decision 3: 修复 `src/arsenals/paths.ts` 导入路径

将 `import from './global'` 改为 `import from '../infra/global'`

### Decision 4: 删除 `src/cli/api/` 目录

该目录下的文件均为废弃代码（标注"已废弃 - 使用文件系统"），不再维护。

## Risks / Trade-offs

[Risk] 删除 `src/cli/api/` 可能导致某些旧命令不可用
→ **Mitigation**：这些命令已废弃，功能已迁移到 `src/cli/` 邻接模块

[Risk] 修复导入路径可能引入新的循环依赖
→ **Mitigation**：使用 `../` 相对路径避免循环

## Migration Plan

1. 修复 `src/arsenals/init.ts` 导入
2. 修复 `src/arsenals/loader.ts` 导入
3. 修复 `src/arsenals/paths.ts` 导入
4. 删除 `src/cli/api/` 目录
5. 验证 `pnpm build` 成功