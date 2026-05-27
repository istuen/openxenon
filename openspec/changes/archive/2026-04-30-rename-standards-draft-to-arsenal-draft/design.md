## Context

当前 `src/api/standards-draft.ts` 处理 Arsenal 资产（Probe、Proof、Stage）的草稿创建，但文件名使用 "standards" 不够准确。

## Goals / Non-Goals

**Goals:**
- 重命名文件为 `arsenal-draft.ts` 以准确反映其功能
- 更新所有引用

**Non-Goals:**
- 不修改文件内容
- 不改变任何功能逻辑

## Decisions

### 重命名文件

**选择：**
- `src/api/standards-draft.ts` → `src/api/arsenal-draft.ts`

**理由：**
- "Arsenal" 直接反映资产管理的概念
- 与 `arsenal-loader.ts`、`arsenal-paths.ts` 等命名风格一致

### 更新引用

**选择：**
- 更新 `src/skills/oxn-forge.ts` 中的 import 路径

## Risks / Trade-offs

- **BREAKING**: 任何外部引用需要更新 → 内部重构，影响范围小