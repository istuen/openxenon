## Context

当前 `/api/v1/proofs/list` 端点使用 `scanProjectProofs` 函数，仅扫描文件系统目录（`.xenonix/proofs` 和全局 `~/.xenonix/proofs`）。系统另有 `listAllProofs` 函数（在 `proof-dispatcher.ts`），正确返回内置 proofs + 自定义 proofs。

**现状：**
- CLI `xn proof-list` 使用 `listAllProofs` → 返回完整列表
- API `/api/v1/proofs/list` 使用 `scanProjectProofs` → 仅返回文件系统 proofs

## Goals / Non-Goals

**Goals:**
- API 返回与 CLI 一致的 proofs 列表
- 包含 built-in、project、global 三类 proofs
- 保持现有响应结构兼容（增加字段）

**Non-Goals:**
- 不修改 proof 扫描逻辑
- 不修改 CLI 实现
- 不增加新的 API 端点

## Decisions

### 使用 `listAllProofs` 替代 `scanProjectProofs`

**理由：** `listAllProofs` 已正确实现完整逻辑，包含内置 proofs 和自定义 proofs。

**替代方案：** 在现有函数中添加内置 proofs 合并逻辑 → 拒绝，会导致重复代码。

### 响应结构变更

新增字段：`category`（'built-in' | 'project' | 'global'）、`layer`（仅 built-in）

**理由：** 与 CLI 输出格式保持一致，便于前端分类展示。

## Risks / Trade-offs

[响应结构变更] → 向后兼容，仅新增字段，不删除现有字段
