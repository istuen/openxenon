## Context

Skills 描述的流程和 CLI 实际能做的事断开了：

```
oxn-forge Skill 说: "调用 createDraftFromYaml 保存"
实际 CLI: forge.ts 只 displayMetaForge()，不调用 save 函数

oxn-task Skill 说: "oxn api task-submit"
实际 CLI: task.ts 是空壳 {}
```

## Goals / Non-Goals

**Goals:**

- `oxn forge --save '<yaml>' --name <name>` 能保存 draft
- `oxn task submit --blueprint <path>` 能提交 Blueprint
- `oxn task next --task-id <id>` 能获取下一个 Stage
- `oxn task verify --task-id <id> --stage-id <id>` 能提交验证
- Skills 指令指向真实存在的命令

**Non-Goals:**

- 不动 Daemon（IPC handlers 已存在）
- 不动 Kernel
- 不动 Infra
- 不实现完整的 task 循环（submit → start → next → step-start → verify），只实现 submit/next/verify

## Decisions

### 1. Forge --save 参数

```typescript
// cli/forge.ts 修改
args: {
  type: { type: 'positional', required: false },
  save: { type: 'string', alias: 's', description: '直接保存 YAML 内容' },
  name: { type: 'string', alias: 'n', description: '资产名称' },
  global: { type: 'boolean', alias: 'g', default: false },
}
async run(ctx) {
  const save = ctx.args.save as string
  const name = ctx.args.name as string
  const scope = ctx.args.global ? 'global' : 'project'

  if (save) {
    const result = createDraftFromYaml(save, name, scope)
    console.log(JSON.stringify({ ok: result.success, data: result.path, error: result.error }))
    return
  }
  // 原有的 displayMetaForge() 不变
}
```

**理由**：AI 生成 YAML 后，用 `--save` 直接传递内容，比读文件更直接。

### 2. Task 三个子命令

```typescript
// cli/task.ts
subCommands: {
  submit: defineCommand({
    meta: { name: 'submit' },
    args: {
      blueprint: { type: 'string', alias: 'b', required: true }
    },
    async run(ctx) {
      const content = readFileSync(ctx.args.blueprint, 'utf-8')
      const parsed = parseYaml(content)
      const result = await sendToDaemon({
        method: 'POST',
        path: '/api/v1/task/submit',
        body: { task: parsed.name || 'unnamed', blueprint: parsed }
      })
      console.log(JSON.stringify(result))
    }
  }),
  next: defineCommand({ ... }),
  verify: defineCommand({ ... })
}
```

**理由**：最小化实现，只包装 AI 循环必须的 3 个入口。

### 3. Skills 修改对照

| Skill 文件 | 修改前 | 修改后 |
|-----------|--------|--------|
| oxn-task.ts | `oxn api proofs-list` | `oxn arsenal list` |
| oxn-task.ts | `oxn api task-submit --task "..." --steps '...'` | `oxn task submit --blueprint <path>` |
| oxn-forge.ts | 隐式调用 createDraftFromYaml | `oxn forge <type> --save '<yaml>' --name <name>` |
| oxn-init.ts | `oxn status` | `oxn daemon status` |
| oxn-status.ts | `oxn api task-status` | `oxn task status` (需新增子命令) |

## 实现步骤

### Step 1: 修改 forge.ts

1. 添加 `save`, `name`, `global` 参数
2. 如果 `save` 存在，调用 `createDraftFromYaml()`
3. 输出 JSON 格式：`{ ok: bool, data?: { path }, error?: { code, message } }`

### Step 2: 重写 task.ts

1. 实现 `submit` 子命令：读 blueprint 文件 → sendToDaemon POST /api/v1/task/submit
2. 实现 `next` 子命令：sendToDaemon GET /api/v1/task/next
3. 实现 `verify` 子命令：sendToDaemon POST /api/v1/step/verify
4. 所有输出 JSON 格式

### Step 3: 修改 Skills

1. `oxn-task.ts`: 更新 instruction 中的命令示例
2. `oxn-forge.ts`: 更新 instruction，加 `--save` 用法
3. `oxn-init.ts`: 把 `oxn status` 改为 `oxn daemon status`
4. `oxn-status.ts`: 把 `oxn api task-status` 改为 `oxn task status`

### Step 4: 验证

- `pnpm run typecheck`
- `pnpm run build`
- `oxn forge --help` 显示新参数
- `oxn task --help` 显示 submit/next/verify 子命令

## 自循环流程（修完后）

### Forge 循环
```
1. oxn forge probe                    → 显示约束
2. AI 生成 YAML                       → 自然语言能力
3. oxn forge probe --save '...' --name xxx  → 保存 draft
4. oxn arsenal promote xxx             → draft → canonical
```

### Task 循环
```
1. oxn daemon start                   → 确保 Daemon 在跑
2. oxn arsenal search <keyword>        → 找可用的 Stage/Probe
3. AI 写 blueprint.yaml
4. oxn task submit --blueprint bp.yaml → 提交
5. oxn task next --task-id <id>        → 获取下一个 Stage
6. AI 执行工作
7. oxn task verify --task-id <id> --stage-id <id> → 验证
8. 重复 5-7 直到完成
```