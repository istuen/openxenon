# ADR-0011: 证据链三件套（frozen.json + work-trace.jsonl + work-state.json）

> **来源**：`docs_tmp/kernel-infra-2.md` (2026-05-27)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：E2 Work / E3 Engine

## 决策

每个 Work 的运行时目录固定包含**三个不可变证据文件**：

```
works/<work-name>/
├── .work                         # v1.1 出生证明 + planLock
├── .run/
│   ├── frozen.json               # 编译期产物（不可变）
│   ├── trace.jsonl               # NDJSON 事件流（append-only）
│   └── state.json                # 当前状态快照
```

### 语义分工

| 文件 | 角色 | 写入时机 | 可变 |
|---|---|---|---|
| `frozen.json` | 公证（Work 起始状态的不可变快照） | `work lock` 后 | 否 |
| `trace.jsonl` | 历史（所有事件追加流） | 每次状态变更 | append-only |
| `state.json` | 现状（最近一次的派生态） | 每次 trace 之后 | 是（来自 trace 重放） |

## 关键设计

- **post-snapshot 模型**：`frozen.json` 不是"pre-execution contract"，而是"post-validation 快照"
- **可重放**：删 `state.json` 仅凭 trace.jsonl 可重放
- **AI 可 CRUD**：Work 期间 AI 可 `oxn update probe` 调整（不是 freeze 死）

## 后果

- ✅ 任何 state 都能追溯到 trace
- ✅ frozen.json 是 hash 锚点，Proof 校验可信
- ✅ trace 是 audit chain 的物理载体
- 🔗 v1.1 planLock 在 `.work` 文件中维护 4 组件 hash

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-27-kernel-infra-2.md`