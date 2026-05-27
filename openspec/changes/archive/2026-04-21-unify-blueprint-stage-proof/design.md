## Context

代码使用旧的命名，与 README 规范不一致。

## Goals / Non-Goals

**Goals:**
- `Task.blueprint` (已正确)
- `Stage.xnProof` → `Stage.proof`
- `Step` → `Stage` 统一
- DB: `playbook` → `blueprint`

**Non-Goals:**
- 不修改四大命脉接口
- 不修改 skills

## Decisions

### 1. 字段替换

| 类型 | 原字段 | 新字段 |
|------|--------|---------|
| Stage | xnProof | proof |
| Task (DB) | playbook | blueprint |
| Blueprint | steps | 移除，统一用 stages |

### 2. 类型清理

- 删除 `Step` 接口，使用 `Stage` 替代
- Blueprint 只保留 `stages` 数组

## Migration Plan

1. 更新 `src/types/stage.ts` - xnProof → proof
2. 删除 `src/types/blueprint.ts` - Step 定义
3. 更新 DB schema
4. 更新数据库操作
5. 更新测试