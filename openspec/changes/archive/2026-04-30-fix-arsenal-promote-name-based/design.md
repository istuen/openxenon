## Context

当前 `oxn arsenal promote` 接受路径参数：
```
oxn arsenal promote .openxenon/arsenals/blueprints/build-init-daemon
```

但在新目录结构下，资产是目录 `blueprints/build-init-daemon/draft.yaml`，传入目录名导致 EISDIR 错误。

## Goals / Non-Goals

**Goals:**
- 改为基于名称的操作：`oxn arsenal promote blueprints/build-init-daemon`
- 自动查找对应的 draft 文件

**Non-Goals:**
- 不支持完整路径（简化 API）

## Decisions

### Decision 1: 参数命名

**选择：**
参数名从 `path` 改为 `name`，语义更清晰。

**理由：**
- 用户传入的是资产名称，不是文件系统路径
- 与 `loadStandardByName` 函数语义一致

### Decision 2: 名称解析

**选择：**
使用 `loadStandardByName(type, name)` 自动解析到正确的文件。

**理由：**
- `loadStandardByName` 已支持新旧结构
- 简化命令逻辑

## Risks / Trade-offs

- **BREAKING**: 用户习惯用路径 → 文档更新引导