## Context

代码与 README 文档命名不一致问题。

## Goals / Non-Goals

**Goals:**
- CLI 命令统一为 `oxn`
- 目录名统一为 `.openxenon`
- 数据库文件统一为 `.oxn`

**Non-Goals:**
- 不修改接口定义
- 不修改功能逻辑

## Decisions

### 1. 批量替换策略

使用 `sed` 或 IDE 批量替换 + 文件重命名。

### 2. 替换优先级

| 顺序 | 变更 | 影响 |
|------|------|------|
| 1 | `.xenonix` → `.openxenon` | 目录常量 |
| 2 | `*.db` → `*.oxn` | 数据库文件 |
| 3 | `xn` → `oxn` | CLI 命令 |
| 4 | `xn-*.ts` → `oxn-*.ts` | Skills 文件重命名 |

## Risks / Trade-offs

- [风险] 遗漏引用 → typecheck + test 验证
- [风险] 破坏测试 → 更新测试文件

## Migration Plan

1. 替换目录常量
2. 替换数据库文件名
3. 替换 CLI 命令
4. Skills 文件重命名
5. typecheck 验证
6. 测试验证