## Context

`src/types/playbook.ts` 当前包含：
- Legacy: Step, Playbook
- Xn: XnStage, XnBlueprint

需要分离以实现更好的关注点分离。

## Goals / Non-Goals

**Goals:**
- XnStage 独立文件
- XnBlueprint 独立文件
- playbook.ts 仅保留 Legacy

**Non-Goals:**
- 不修改现有类型定义的结构
- 不破坏现有 import

## Decisions

### 1. 文件分离

**决策：** 按类型分离文件

```
src/types/xn-stage.ts    # XnStage + XnStageStatus
src/types/xn-blueprint.ts # XnBlueprint
src/types/playbook.ts     # Step + Playbook (Legacy)
```

### 2. 依赖关系

```
xn-stage.ts → xn-spec.ts, xn-action.ts, core.ts
xn-blueprint.ts → xn-stage.ts
playbook.ts → (standalone)
```

## Risks / Trade-offs

- [风险] Import 循环依赖 → XnBlueprint 依赖 XnStage，需注意导入顺序
- [风险] 其他文件引用变更 → 全面搜索替换