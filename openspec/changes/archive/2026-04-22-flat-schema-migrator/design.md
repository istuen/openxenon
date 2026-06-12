## Context

### 当前状态

OpenXenon 当前采用嵌套树形结构：

```
Task ──(1:1)── Blueprint (JSON blob) ──(1:N)── Stage (embedded)
```

`blueprint` 列以 JSON 字符串形式存储在 `tasks` 表中。这种设计在初期简单高效，但随着系统复杂度增长，暴露了以下根本性问题：

1. **无法支持旁路演化**：当 AI 触发演化流时，旧 Blueprint 无法作为独立实体保留。新的演化分支只能覆写原 JSON，导致工程案卷断裂。

2. **无法实施不可变铁律**：UPDATE 操作直接修改 JSON blob，而"不可变性"是整个系统哲学的基石。克隆变异的正确做法是 INSERT 而非 UPDATE。

3. **数据库无法跨版本演进**：随着 OpenXenon 升级，已有的 `space.oxn` 无法平滑升级，资产面临丢失风险。

### 约束

- 技术栈：TypeScript + Bun
- 运行时解耦：未来需支持 Node.js 适配
- SQLite：选择 WAL 模式，需处理外键约束

## Goals / Non-Goals

**Goals:**
- 实现 Task 1:N Blueprint、Blueprint 1:N Stage 的三表扁平拓扑
- 实现 XnMigrator 增量迁移引擎，支持跨版本平滑升级
- 实现草案系统（`oxn draft apply/diff`）和导出系统（`oxn export`）
- 保持 XnStore 接口的运行时解耦特性

**Non-Goals:**
- 不实现 Blueprint 跨 Task 移动（Task 是隔离边界）
- 不实现真正的多租户隔离
- 不实现 GraphQL 或 REST API（仅内部 CLI 调用）
- 不实现复杂的批次回滚（仅支持单版本回滚）

## Decisions

### Decision 1: 三表扁平拓扑 vs JSON Blob

**选择：Task 1:N Blueprint、Blueprint 1:N Stage，三表通过外键 ID 引用**

**替代方案 A（当前设计）：JSON Blob 嵌套**
- 优点：简单，单表查询性能高
- 缺点：无法支持旁路演化，不可变性缺失，升级困难

**替代方案 B（完全扁平）：所有实体独立表**
- 缺点：过度解耦，Task/Blueprint/Stage 本质上是包含关系，扁平化丢失语义

**结论**：三表扁平是平衡点，既支持旁路演化和不可变插入，又保持语义内聚。

---

### Decision 2: XnMigrator 纯逻辑层 vs ORM 迁移

**选择：自研 XnMigrator，所有运行时依赖通过构造函数注入**

```
src/core/migrator.ts  ← 纯逻辑，无 bun/node 依赖
src/runtimes/bun.adapter.ts  ← bun:sqlite 适配
src/runtimes/node.adapter.ts  ← future: better-sqlite3 适配
```

**替代方案 A（当前选择）：自研 XnMigrator**
- 优点：零外部依赖，运行时完全解耦，每行 SQL 可控
- 缺点：需要自行实现版本追踪和增量执行

**替代方案 B：使用 Knex.js 或 Drizzle ORM**
- 缺点：引入重型依赖，破坏 Bun 原生性能，第三方 ORM 是"抽象工厂"黑盒

**结论**：对于 OpenXenon 这种控制引擎，底层基础设施必须完全可控。自研是唯一选择。

---

### Decision 3: 迁移文件格式 (.ts vs .sql)

**选择：`.sql` 文件，内置 `-- @up` 和 `-- @down` 注释块**

**替代方案 A（当前选择）：纯 SQL + 注释块**
- 优点：最直接的物理约束，工程师可直接审计
- 缺点：复杂逻辑（如创建新表->迁移数据->删旧表）需要在 SQL 内部组织

**替代方案 B：TypeScript 迁移函数**
- 优点：可使用条件逻辑和循环
- 缺点：需要处理 TS 编译和运行时加载，增加复杂度

**结论**：SQLite 的 ALTER TABLE 能力有限，复杂场景确实需要"重建表大法"，但这应该在 SQL 注释中清晰标注，而非用 TS 隐藏。

---

### Decision 4: 草案目录职责划分

**选择：drafts/ 入站、active/ 活跃投影、archive/ 冷档投影**

```
.openxenon/
├── drafts/      # 唯一入站口，工程师可写
├── active/      # 活跃投影，只读
└── archive/     # 冷档投影，只读
```

**替代方案 A（当前选择）：三目录分离**
- 优点：职责单一，文件删除不影响引擎
- 缺点：需要维护三个目录的同步逻辑

**替代方案 B：单一目录，状态字段区分**
- 缺点：用文件系统的"存在"表达状态，违反单一职责

**结论**：文件系统不是状态机，用目录表达职责是正确抽象。

---

### Decision 5: 导出系统单向 vs 双向同步

**选择：绝对单向，数据库是唯一真理源**

```
DB ──(oxn export)──> MD/YAML
     (never reverse)
```

**替代方案 A（当前选择）：单向导出**
- 优点：数据流简单，审计轨迹完整
- 缺点：工程师修改 MD 后无法反向同步

**替代方案 B：双向同步**
- 缺点：引入复杂度，存在冲突解决难题，破坏"唯一真理源"原则

**结论**：工程师如果想修改，应该通过 `oxn draft apply` 走正式流程，而非直接改 MD。

## Risks / Trade-offs

### Risk 1: 现有数据库迁移
**风险**：现有 `project.oxn` 的 JSON Blob 数据无法自动迁移到扁平结构
**缓解**：
- 提供一次性迁移脚本，解析旧 JSON 并插入新的 blueprints/stages 表
- 迁移过程全程保留旧数据，失败可回退

### Risk 2: 外键约束性能
**风险**：SQLite 外键约束有运行时开销
**缓解**：
- 默认关闭外键检查（`PRAGMA foreign_keys=OFF`），在迁移和关键操作时临时开启
- 或接受外键约束的微小开销，换取数据完整性

### Risk 3: Draft 文件与 DB 状态分裂
**风险**：工程师在本地编辑 draft 文件但未 apply，导致文件系统与数据库不一致
**缓解**：
- `oxn draft diff` 提供可视化对比
- 文档强调 drafts/ 是工作区，数据库是真理源

### Risk 4: 未来 Node 适配器实现复杂度
**风险**：当前只有 Bun 适配器，Node 适配器需要额外开发
**缓解**：
- XnMigrator 核心已完全解耦，Node 适配器只需翻译 API 形状
- 接口已在 `store.interface.ts` 中定义

## Migration Plan

### Phase 1: 数据库迁移脚本
1. 创建 `0001_init_schema.sql` 初始化新的三表结构
2. 创建迁移脚本解析旧 `tasks` 表的 JSON Blob，插入新的 `blueprints` 和 `stages` 表
3. 在 `oxn init` 时检测旧版本数据库，提示用户执行迁移

### Phase 2: 核心实现
1. 实现 `src/core/migrator.ts`
2. 扩展 `src/runtimes/interfaces/store.interface.ts` 接口
3. 实现 `src/runtimes/bun.adapter.ts`
4. 更新 `src/db/schema/project.ts` 为新的扁平结构

### Phase 3: CLI 命令
1. 实现 `oxn draft apply/diff/list/extract`
2. 实现 `oxn export active/archive`
3. 实现 `oxn gc prune`（清理已终结任务）

### Phase 4: 旧数据迁移
1. 提供 `oxn migrate` 命令执行旧数据迁移
2. 迁移完成后，旧 `tasks.playbook` JSON 列保留（原址保留，标记为废弃）

## Open Questions

1. **Schema 版本号策略**：当前使用自增整数（0001），是否需要改为语义版本（v1.0.0）？
2. **Stage deps 的 JSON 存储**：当前使用 JSON 字符串存储 deps 数组，是否需要拆分为独立的关联表？（当前方案更灵活但查询需解析）
3. **active Blueprint 的更新策略**：当 Draft Blueprint 被拒绝时，Task 的 `activeBlueprintId` 是否自动回退到上一个 CANONICAL？
4. **Archive 文件的保留策略**：archive/ 目录是否需要定期压缩或归档？（当前设计是无限增长）
