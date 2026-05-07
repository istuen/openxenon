## Context

当前 CLI 存在 7 个废弃或重复的命令：

| 命令 | 状态 | 问题 |
|------|------|------|
| draft | STUB | 完全未实现 |
| force-pass | STUB | 完全未实现 |
| rollback | STUB | 完全未实现 |
| inspect | STUB | 完全未实现 |
| trace | STUB | 完全未实现 |
| api | 聚合 | 功能被 `task` 子命令覆盖 |
| proof-list | 已实现 | 与 `arsenal list` 功能重复 |

## Goals / Non-Goals

**Goals:**
- 删除所有未实现的 stub 命令
- 删除功能重复的命令
- 保持 CLI 简洁

**Non-Goals:**
- 不实现 stub 命令的功能
- 不改变其他命令的行为
- 不添加新功能

## Decisions

### Decision 1: 直接删除而非标记废弃

**选择**：直接删除文件和导出，不使用 deprecated 标记

**理由**：
- stub 命令从未发布，维护 nil
- CLI 处于早期阶段，用户无强依赖
- 保持代码库干净

### Decision 2: proof-list 归入 arsenal

**选择**：删除 proof-list 命令，用户使用 `oxn arsenal list` 替代

**理由**：
- Arsenal 是资产管理的统一入口
- proof-list 列出的是 Proof 类型资产
- `oxn arsenal list --type proofs` 可替代

## Risks / Trade-offs

- [Risk] 用户脚本依赖被删除的命令 → **Mitigation**: 提供迁移指南
- [Risk] 未来需要这些功能 → **Mitigation**: OpenSpec change 可随时恢复

## Migration Plan

1. 删除废弃文件
2. 更新 index.ts 导出
3. 运行测试确认无引用
