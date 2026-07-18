---
title: 代码规范
---

# 代码规范

> Biome + ESLint + Commit Message。违反将被 pre-commit 阻断。

## Biome（格式化 + 基础 lint）

```json
{
  "indentStyle": "space",
  "indentWidth": 2,
  "quoteStyle": "single",
  "semicolons": "asNeeded",
  "lineWidth": 120,
  "organizeImports": "off"
}
```

- 2 空格缩进
- 单引号
- **无分号**（`asNeeded`）
- 列宽 120
- organize-imports **关闭**

## ESLint（架构守卫）

按目录配置的 `no-restricted-imports` 规则（覆盖 `src/` + `packages/`）。错误信息是**中文**。

```bash
bun run lint          # 检查
bun run lint:fix      # 自动修复（谨慎使用）
```

## Commit Message

```
<type>(<scope>): <description>

[optional body]
```

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `refactor` | 重构 |
| `test` | 测试 |
| `chore` | 构建 / 工具 / 依赖 |

示例：`docs(dev): add getting-started skeleton page`

## TypeScript

```json
{
  "verbatimModuleSyntax": true,
  "noUncheckedIndexedAccess": true
}
```

- 类型导入用 `import type`
- 索引访问可能为 `undefined`

## 参考

- [AGENTS.md §仓库约定](../../../AGENTS.md#仓库约定) — 完整规范
- [AGENTS.md §代码风格](../../../AGENTS.md#代码风格) — 注释、生成文件排除
