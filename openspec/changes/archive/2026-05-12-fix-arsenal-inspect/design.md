## Context

`arsenal-promote` 使用 `parseAssetName()` 解析 `<type>/<name>` 格式，`arsenal-inspect` 使用简单的 `a.name === name` 匹配。

## Goals / Non-Goals

**Goals:**
- 让 `arsenal-inspect` 支持 `<type>/<name>` 格式

**Non-Goals:**
- 不修改 `arsenal-promote` 行为
- 不重构共享代码（暂时接受重复）

## Decisions

**复用 `parseAssetName` 逻辑**

将 `arsenal-promote.ts` 中的 `parseAssetName` 函数复制到 `arsenal-inspect.ts`，或在两个文件中共享。

解析逻辑：
1. 按 `/` 分割输入
2. 第一部分是 type，第二部分是 name
3. 使用 `loadStandardByName(name, type)` 查询

## Risks / Trade-offs

无显著风险。
