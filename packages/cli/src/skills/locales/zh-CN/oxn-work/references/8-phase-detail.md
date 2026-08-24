# 8 阶段流程详解（v1.1）

> 本文件是 `SKILL.md` 的按需加载补充。执行 `oxn work` 实际阶段时查阅。

## 8 阶段全景

```
migrate? → create → add-task → validate → lock → run → submit → status → finalize
                                       │        │
                                       ▼        ▼
                                  .work       .work.planLock
                                静态门禁卡    4 组件 hash
```

- `migrate?`（步骤 0，可选）：V0→V1 布局迁移，新建 work 跳过
- `create`：建 work 骨架
- `add-task`：建至少 1 个 task.oxn
- `validate`：校验 work.oxn + 写 `.work`
- `lock`：写 planLock + 4 组件 hash
- `run`：启动状态机（要求 lock 完成）
- `submit`：推进 task 内 part
- `status`：查询 work 状态
- `finalize`：收口，汇总所有 round + 写最终状态

## 创建 Work + Task（8 步示例）

### 步骤 0（V0→V1 迁移，可选）

```bash
oxn work migrate <work-name>
# 把 V0 布局 works/<w>/work-state.json 等迁移到 V1 布局 .run/
# 原 V0 文件备份到 .migrated-v0/（不删，留审计）
```

### 步骤 1：前置（创建/修改 Asset，**非本 Skill 范围**）

> **注意**：本 Skill 不管 Asset 创建/修改。如需创建/修改 Domain/Blueprint/Stack 等，请触发 **`oxn-asset` Skill**（它通过 `oxn work create --type asset --asset-kind X` 走 IAP 闭环）。
>
> 假设 Asset 已就绪。

### 步骤 2：创建 Work 编排

```bash
oxn work create <work-name> --blueprint <bp>
# 编辑 .openxenon/works/<work>/work.oxn
```

或手写：

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step1" {
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### 步骤 3：创建至少一个 Task

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--domain <DomainName>]
```

### 步骤 4：编辑 task 内容（手写 `task.oxn`）

### 步骤 5：`work validate`

```bash
oxn work validate <work-name> --json
# 校验 work.oxn + 写 .work 静态门禁卡（assets 快照：域/蓝图 fileHash）
# planLock 此时为 null（未锁）
```

### 步骤 6：`work lock`

```bash
oxn work lock <work-name> --json
# 计算 4 组件 hash：
#   workOxnHash      = SHA-256(work.oxn)
#   workDomainsHash  = SHA-256(concatenated domain.oxn files)
#   blueprintsHash   = SHA-256(concatenated blueprint.oxn files)
#   tasksHash        = SHA-256(concatenated task.oxn files)
# 写入 .work.planLock + allHash
# 锁后任何 .oxn 资产漂移 = IAP_ALIGN_LOCK_HASH_MISMATCH
```

`oxn work unlock`（解锁，清 planLock 保留 assets）

### 步骤 7：驱动状态机

```bash
oxn work run --work-file <work>/work.oxn --json
oxn work submit --work <w> --task <t> --json
oxn work status --work <w> --json
```

### RFC-0032 Phase 2/3 (0.6.4-alpha.0+): `oxn work finalize` 已删

Work 生命周期收敛为 4 步: `create → lock → run → submit`。
原 Step 8 (`finalize` 汇总 round + 写 frozen.json) 随 Phase 2 删除 (依赖 frozen/work-domains.ts)。
参照: `.openxenon/drafts/design-mvp-convergence-grilling.md` 与 RFC-0032 §D10/D13。

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
| 校验 work.oxn + 写 .work | `oxn work validate <w>` |
| 锁 work（planLock + 4 组件 hash） | `oxn work lock <w>` |
| 解锁 work | `oxn work unlock <w>` |
| 启动 work 状态机 | `oxn work run --work-file <work.oxn>` |
| 推进 task 内 part | `oxn work submit --work <w> --task <t>` |
| 查询 work 状态 | `oxn work status --work <w>` |

## 模式选择速查

| 你的需求 | 选哪个模式 | 关键标志 | 模板 |
|---|---|---|---|
| 摸清一个域、写报告 | 模式 1（explore） | 1 task + 1 blueprint slot | `assets/work-explore.oxn` |
| 单域完整开发 | 模式 2（develop） | 1 task 多 part（= blueprint 多 slot） | `assets/work-develop.oxn` |
| bug 修复、流程化诊断 | 模式 3（fix） | N task 串行 deps | `assets/work-fix.oxn` |
| 跨多个限界上下文 | 模式 4（onboarding） | work 级 N domain + task 按需 inject | `assets/work-onboarding.oxn` |
