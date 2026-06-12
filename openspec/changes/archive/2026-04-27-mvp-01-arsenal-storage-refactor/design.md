## Context

当前 OpenXenon 的 Blueprint、Stage、Proof 实体直接存储在 SQLite DB 表中（`blueprints` 表含 `name/status`，`stages` 表含 `target/spec/action/proof`）。这套模型无法满足 MVP 0.1 验证"双轨并行 + 物理隔离"机制的需求。

**当前架构问题**：
- Blueprint 结构不可读，工程师无法通过 Git diff 审查变更
- Stage 的 proof 字段仅为探针名称字符串，无法表达四元组（target/spec/action/probes）
- DB 表之间通过外键耦合，演化困难

**约束条件**：
- MVP 0.1 只实现线性 Blueprint（不支持 DAG）
- Blueprint 存储在 `tasks/<task_id>/blueprint.json`
- Probe type 直接使用 builtin proof ID（不做类型别名映射）

## Goals / Non-Goals

**Goals:**
- 实现 Blueprint YAML 文件存储，支持 Git 版本控制
- Stage 的 validator → proof 重命名，内含 target/spec/action/probes 四元组
- Probe 直接使用 builtin proof ID（如 `fs_exists`、`fs_content_match`）
- 实现 staging 目录缓冲机制，验证通过后 mv 落盘
- DB 表降级为运行时索引，保留历史兼容性

**Non-Goals:**
- 不实现 `arsenal/active|draft|archive/` 目录结构（v0.5）
- 不实现 DAG 拓扑编排（v0.5）
- 不实现提案流程和 Sample 机制（v0.5）
- 不实现 Git 分支沙箱（v0.5）

## Decisions

### Decision 1: Blueprint YAML 文件结构

**选择**：每个 Task 的 Blueprint 存储为 `tasks/<task_id>/blueprint.json`

**理由**：
- MVP 阶段每个 Task 有独立的 Blueprint 实例，无需跨 Task 复用
- 放在 task 目录下便于管理，Task 结束时可一起清理
- 不引入 `arsenal/` 复杂度，保持最小实现

**结构**：
```json
{
  "id": "bp_001",
  "name": "standard_crud",
  "status": "CANONICAL",
  "stages": [
    {
      "id": "s1",
      "name": "创建用户模型",
      "deps": [],
      "proof": {
        "target": { "description": "...", "glob": "app/Models/User.ts" },
        "spec": { "description": "...", "constraints": ["MUST use PrismaClient"] },
        "action": { "instruction": "..." },
        "probes": [
          { "type": "fs_exists", "pattern": "app/Models/User.ts" },
          { "type": "fs_content_match", "pattern": "PrismaClient" }
        ]
      }
    }
  ]
}
```

**替代方案考虑**：
- 存储在 `arsenal/active/`：适合 v0.5 的模板复用，MVP 阶段不需要
- 分开存储 Stage YAML：增加引用复杂度，MVP 紧耦合更简单

---

### Decision 2: Validator → Proof 重命名 + 四元组结构

**选择**：Stage 内嵌 `proof` 对象（替代原来的 `validator` + `proof` 字段），结构为 `target + spec + action + probes`

**理由**：
- 与 OpenSpec Validation Engine 语义对齐
- `proof` 是完整的校验上下文，`probes` 是其中调用的探针数组
- 支持一个 Stage 绑定多个探针联合验证

**MVP 简化**：
- `probes` 数组直接使用 builtin proof ID 作为 `type`
- 不实现 probe 参数注入（v0.5）

---

### Decision 3: Probe Type 直接使用 Builtin Proof ID

**选择**：Blueprint YAML 中 `probes[].type` 直接使用 builtin proof ID（如 `fs_exists`、`fs_content_match`）

**MVP 0.1 使用的 builtin proofs**：
| Probe Type | 对应 Builtin Proof | 用途 |
|------------|-------------------|------|
| `fs_exists` | `fs_exists` | 检查文件/目录是否存在 |
| `fs_content_match` | `fs_content_match` | 检查文件内容是否包含正则 |
| `fs_forbid` | `fs_not_exists` + content check | 检查文件不包含禁用模式（需新增） |
| `exec` | `exec_exit_zero` | 执行命令检查退出码 |

**理由**：
- 无需类型别名映射层，直接路由
- builtin proofs 已实现，直接复用
- 对于 `fs_forbid`，MVP 0.1 可复用 `fs_content_match` 的逻辑（取反）

---

### Decision 4: Staging 目录缓冲

**选择**：AI 代码写入 `tasks/<task_id>/staging/`，Core 验证通过后 mv 到 `src/`

**流程**：
```
1. AI 生成代码 → 写入 staging/
2. AI 调用 /step/verify
3. Core 执行 probes（工作目录指向 staging/）
4. 所有 probe PASSED → mv staging/* → src/（落盘）
5. 任一 probe FAILED → rm -rf staging/*（丢弃）
```

**理由**：
- 零成本物理隔离，不依赖 Git 或容器
- "不通过的代码连看都别看"的熔断哲学
- 实现简单，原子性强

---

### Decision 5: DB 表降级为运行时索引

**选择**：保留 `tasks`/`blueprints`/`stages` 表，新增 `blueprint_file`/`yaml_path` 字段

**DB Schema 变更**：
```sql
-- tasks 表新增字段
ALTER TABLE tasks ADD COLUMN blueprint_file TEXT;

-- blueprints 表新增字段（标记 deprecated）
ALTER TABLE blueprints ADD COLUMN yaml_path TEXT;

-- stages 表新增字段（target/spec/action/proof 列置 NULL）
ALTER TABLE stages ADD COLUMN yaml_path TEXT;
```

**理由**：
- 保留历史数据，不破坏现有迁移
- 运行时查 DB 索引（快），读取用 YAML 文件（人类可读）
- 未来 v0.5 可平滑迁移到 `arsenal/` 结构

---

### Decision 6: Probe 路由机制调整

**现状**：proof-dispatcher 根据 proof ID 字符串路由到 builtin 或 custom proof

**MVP 调整**：
1. `BlueprintLoader` 解析 YAML 中的 `proof.probes[]` 数组
2. 对每个 probe，提取 `type` 字段作为 builtin proof ID
3. 调用 `executeBuiltInProof(type, input, context)` 执行
4. input 由 probe 的其他字段（如 `pattern`、`command`）构造

**示例路由**：
```typescript
// Blueprint YAML:
// { "type": "fs_exists", "pattern": "app/Models/User.ts" }

// 路由：
const input = { path: probe.pattern }
await executeBuiltInProof(probe.type, input, context)
```

**未来（v0.5）**：
- probe type 可扩展为非 builtin proof ID（如自定义 `custom-lint`）
- proof-dispatcher 支持 "项目优先，全局兜底" 的多路径查找

## Risks / Trade-offs

- **[风险]** AI 写入 staging 但不调用 verify 导致文件滞留
  - **缓解**：暗线检测超时机制，120 秒未 verify 则判定逃逸并清理 staging

- **[风险]** staging mv 到 src 时文件已存在导致冲突
  - **缓解**：staging 目录只增不改写，mv 是原子操作替换

- **[风险]** YAML 解析失败导致 Core 无法加载 Blueprint
  - **缓解**：使用 Zod schema 校验，失败则拒绝启动 Task

- **[权衡]** MVP 阶段不实现 `arsenal/` 模板复用
  - 每次 Task 都要重新生成 Blueprint JSON
  - 适合 MVP 验证阶段，未来 v0.5 再引入模板库

## Migration Plan

1. **Phase 1**：新增 DB migration `0002_mvp_01_arsenal_schema.sql`
2. **Phase 2**：实现 `BlueprintLoader` 和 `BlueprintPersister`
3. **Phase 3**：实现 `StagingManager`
4. **Phase 4**：修改 `StageExecutor` 集成 staging
5. **Phase 5**：修改 API handlers 适配新模型
6. **Phase 6**：端到端测试验证

**回滚策略**：如 migration 失败，执行 `0002_down.sql` 降级 DB

## Open Questions

1. **Q**: `fs_forbid` 需要新增还是复用现有 proof？
   **A**: MVP 0.1 可复用 `fs_content_match` 逻辑，在 proof-dispatcher 层做"包含则失败"的取反处理

2. **Q**: staging 目录的清理时机？
   **A**: Task 结束时强制清理，无论成功失败；逃逸判定时立即清理

3. **Q**: 是否需要在 Blueprint YAML 中声明 `probes` 的参数 schema？
   **A**: MVP 0.1 不做，参数直接内联在 probe 对象中（如 `pattern`）
