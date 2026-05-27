## Context

当前项目中存在两个相似的概念：
- `Playbook`：旧的接口定义，位于 `src/types/playbook.ts`
- `Blueprint`：新定义的接口，位于 `src/types/blueprint.ts`

两者功能重复，需要统一。

## Goals / Non-Goals

**Goals:**
- 将 `Playbook` 全面替换为 `Blueprint`
- 保持向后兼容（内部接口名称变化，不影响外部行为）

**Non-Goals:**
- 不修改数据库 schema（字段名保持兼容）
- 不修改 API 响应结构

## Decisions

### 1. 删除旧的 playbook.ts，保留 blueprint.ts

当前 `src/types/blueprint.ts` 已包含完整的 `Blueprint` 定义，且与 `Stage` 集成。只需将所有 `Playbook` 引用迁移到 `Blueprint` 即可。

### 2. 更新所有导入路径

| 原引用 | 新引用 |
|--------|--------|
| `import type { Playbook } from './playbook'` | `import type { Blueprint } from './blueprint'` |

### 3. 更新属性名

在 `Task` 接口中：
- `playbook: Playbook` → `blueprint: Blueprint`

## Risks / Trade-offs

- [风险] 遗漏引用 → 通过 typecheck 验证
- [风险] 测试失败 → 更新测试文件

## Migration Plan

1. 重命名导入引用
2. 更新属性名
3. 运行 typecheck
4. 运行测试
5. 删除 `src/types/playbook.ts`（确认无遗漏后）
