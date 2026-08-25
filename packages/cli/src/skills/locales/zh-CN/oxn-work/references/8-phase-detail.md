# 3 阶段流程详解（v1.3 · RFC-0033 极简化）

> 本文件是 `SKILL.md` 的按需加载补充。执行 `oxn work` 实际阶段时查阅。

## 3 阶段全景（RFC-0033 D1）

```
migrate? → create → run → submit → status
                    │       │
                    ▼       ▼
                  启动     hash + DRIFT
                 状态机   （可观测不阻断）
```

- `migrate?`（可选）：V0→V1 布局迁移，新建 work 跳过
- `create`：建 work 骨架
- `run [--validate-only]`：校验 + 启动状态机
- `submit`：推进 task 内 part + 算 workMdHash 指纹 + DRIFT 检测
- `status`：查询 work 状态

🗑️ RFC-0033 D1/D2 已删：`validate` / `lock` / `unlock` / `add-task`（降级为辅助，可直接改 work.md）

## 创建 Work + Task（3 步示例）

### 步骤 0（V0→V1 迁移，可选）

```bash
oxn work migrate <work-name>
# 把 V0 布局 works/<w>/work-state.json 等迁移到 V1 布局 .run/
# 原 V0 文件备份到 .migrated-v0/（不删，留审计）
```

### 步骤 1：前置（创建/修改 Asset，**非本 Skill 范围**）

> **注意**：本 Skill 不管 Asset 创建/修改。如需创建/修改 Domain/Blueprint/Stack 等，请触发 **`oxn-asset` Skill**。
>
> 假设 Asset 已就绪。

### 步骤 2：创建 Work 编排

```bash
oxn work create <work-name> --blueprint <bp>
# 编辑 .openxenon/works/<work>/work.md
```

或手写：

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step1" {
    blueprint "dev-workflow";
    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### 步骤 3：创建至少一个 Task（可选，AI 也可直接编辑 work.md ## Tasks 段）

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name>
```

### 步骤 4：编辑 task 内容（手写 `task.md`）

### 步骤 5：`work run --validate-only`（替代原 `oxn work validate`）

```bash
oxn work run <work-name> --validate-only --json
# 校验 work.md + 写 .work（assets 快照：域/蓝图 fileHash；向后兼容）
# RFC-0033 D2: PlanLock 已删，不写 planLock 字段
```

### 步骤 6：`work run`（启动状态机）

```bash
oxn work run <work-name> --json
# RFC-0033 D2: 不要求 lock；work.md 可自由修改
```

### 步骤 7：`work submit`（推进 task + hash 指纹 + DRIFT 检测）

```bash
oxn work submit <work-name> --task <task-name> --json
# RFC-0033 D3: submit 时算 workMdHash → 记入 trace.jsonl SUBMIT 事件
# RFC-0033 D4: 与上次 SUBMIT 的 workMdHash 比对 → 不一致 append ASSET_DRIFT（不阻断）
```

### 步骤 8：`work status`（查询状态）

```bash
oxn work status <work-name> --json
# RFC-0033 D5: 以 work.md 作为 work 是否存在的真源（.work 文件可选，向后兼容）
```

### 步骤 9（修改 work.md / context.md）

```
🗑️ RFC-0033 D2: 无需 unlock；work.md / context.md 可自由修改；
   下次 submit 时 Engine 自动检测 hash 变化 + 记录 ASSET_DRIFT 事件。
```

## RFC-0032 + RFC-0033 退役记录
- **RFC-0032 D6**：Round 模型删除 → `finalize` 子命令删除（依赖 frozen.json）
- **RFC-0032 D10**：IAP 退役到理念叙事层
- **RFC-0032 D13**：Work 追踪自身职责（trace 记录事实）
- **RFC-0032 D25**：Proof 删除 → PlanLock 删除（RFC-0033 D2）
- **RFC-0032 D27**：Probe 保留为 Engine 工具能力
- **RFC-0033 D1**：3 步生命周期 create → run → submit
- **RFC-0033 D2**：PlanLock 整体删除
- **RFC-0033 D3**：hash 重定义为 submit 时刻完成指纹
- **RFC-0033 D4**：DRIFT 可观测不阻断
- **RFC-0033 D5**：`.work` 单文件删除（保留为向后兼容 assets 快照）
- **RFC-0033 D6**：hash 载体 = trace.jsonl（state.json 不存 hash）

## 参考命令表

| 想做什么 | 命令 |
|---|---|
| 初始化项目边界 | `oxn init` |
| 创建 Blueprint 骨架 | `oxn blueprint create <name> [--slots <list>]` |
| 创建 Domain 骨架 | `oxn domain create <Name>` |
| 验证 Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| 列出所有 Domain | `oxn domain list` |
| V0→V1 布局迁移 | `oxn work migrate <w>` |
| 创建 work 骨架（含 task 块） | `oxn work create <w> --blueprint <bp>` |
| 列出 work 下所有 task | `oxn work list-tasks --work <w>` |
| 查看 task 状态 | `oxn work task-status --work <w> --task <t>` |
| 获取 AI 上下文（全量隔离） | `oxn work context --work <w> --task <t>` |
| 校验 work.md + 写 .work（替代原 validate） | `oxn work run <w> --validate-only` |
| 启动 work 状态机 | `oxn work run <w>` |
| 推进 task 内 part + hash 指纹 + DRIFT 检测 | `oxn work submit <w> --task <t>` |
| 查询 work 状态 | `oxn work status --work <w>` |

🗑️ **已删命令**（v1.3）：`oxn work validate` / `oxn work lock` / `oxn work unlock`

## 模式选择速查

| 你的需求 | 选哪个模式 | 关键标志 | 模板 |
|---|---|---|---|
| 摸清一个域、写报告 | 模式 1（explore） | 1 task + 1 blueprint slot | `assets/work-explore.md` |
| 单域完整开发 | 模式 2（develop） | 1 task 多 part（= blueprint 多 slot） | `assets/work-develop.md` |
| bug 修复、流程化诊断 | 模式 3（fix） | N task 串行 deps | `assets/work-fix.md` |
| 跨多个限界上下文 | 模式 4（onboarding） | work 级 N domain + task 按需 inject | `assets/work-onboarding.md` |