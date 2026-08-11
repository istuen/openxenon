---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0024: partId 主键宪法 + atomic-write（write tmp + rename）

> **来源**：`docs_tmp/task-oxn-1.md` (2026-05-21)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：E2 Work 物理层

## 决策

Work / Task 状态的主键是 **`partId`**（不是 `partName`）。

### 主键选择

| 字段 | 类型 | 唯一性 | 改名时 |
|---|---|---|---|
| `partId` | UUID（生成） | 全局唯一 | 不变（脱钩语义） |
| `partName` | 字符串（人类可读） | Scope 内唯一 | 可改（语义升级） |

state.json 始终以 `partId` 作 key，改 partName 不破坏索引。

### Atomic Write

```ts
// ❌ 禁止
fs.writeFileSync(statePath, JSON.stringify(state))

// ✅ 必须
fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state))
fs.renameSync(`${statePath}.tmp`, statePath)
```

## 原因

- 进程崩溃 / 断电时 tmp → rename 保证要么旧文件完整，要么新文件完整，**无半成品**
- 原子性是 trace-before-state 的物理基础

## 后果

- ✅ state.json 永远是完整的（可重放）
- ✅ partName 重命名不影响历史 trace

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-21-task-oxn-1.md`
- 关联 ADR-0009 Trace-before-State