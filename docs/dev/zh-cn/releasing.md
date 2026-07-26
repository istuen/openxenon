---
title: 发布流程
---

# 发布流程

> 版本号管理 + changelog 片段 + lefthook 自动化。

## 版本号权威来源

`package.json`（根 + cli + engine）中的 `version` 字段。

```bash
# 检查版本一致性
bun run version:check

# 同步版本号（根 → 子包）
bun run version:sync
```

## Changelog 片段（`.changes/`）

每个变更记录为一个文件：

```
.changes/<version>-<slug>.md
```

示例：`.changes/0-6-1-doc-skeleton-split.md`

```yaml
---
version: 0.6.1
date: 2026-07-15
type: patch
rfc:
  - .openxenon/drafts/rfc/xxx.md
adr:
  - .openxenon/drafts/rfc/0057-xxx.md
---

# 0.6.1 — 文档三层守门 + docs/zh-cn 结构重构

## 核心变化
...
```

## Lefthook 集成

```yaml
# lefthook.yml
pre-commit:
  commands:
    biome-check:
      run: bun run check
    eslint-arch:
      run: bun run lint
    typecheck:
      run: bun run typecheck

pre-push:
  commands:
    test:
      run: bun test
```

安装：`bun run prepare`（触发 `lefthook install`）。

## 参考

- [AGENTS.md §构建/校验](../../../AGENTS.md#构建--校验) — 完整命令
- [AGENTS.md §版本号](../../../AGENTS.md#仓库约定) — version:check / version:sync
