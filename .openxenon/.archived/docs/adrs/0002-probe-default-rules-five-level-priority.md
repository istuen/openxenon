---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0002: Probe default 规则 + 五级参数优先级链

> **来源**：`docs_tmp/complie3.md` (2026-05-19)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L0-Contract

## 决策

### Probe 默认值规则

| 字段类型 | 是否允许 default | 原因 |
|---|---|---|
| Probe `required` 字段 | ❌ 禁 default | 强制调用者显式传入 |
| Probe `optional` 字段 | ✅ 允许 default | 提供合理回退 |

### 五级参数优先级链（从高到低）

1. `Task --param key=value`（命令行最高优先）
2. `parts[].params`（Part 实例化覆盖）
3. 顶级 `params`（Blueprint 显式）
4. `Part` schema default
5. `Probe` schema default（最低）

## 背景

OXL 早期设计中，Probe default 规则混乱，导致 Probe 调用语义不清晰。本次审查确立 required/optional 二分法与五级优先级，OXL 编译期校验依此。

## 后果

- ✅ Probe 接口语义一致
- ✅ 参数解析路径可追踪
- 🔗 应在 `docs/zh-cn/architecture/probe.md` 显式写入五级链

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-19-complie3.md`