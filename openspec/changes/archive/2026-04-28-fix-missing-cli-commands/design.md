## Context

`src/cli.ts` 使用 `citty` 库定义 CLI 命令，通过动态导入子命令模块。构建失败是因为 4 个子命令模块不存在：

- `daemon` - 守护进程管理
- `draft` - Draft 模式
- `export` - 任务导出
- `gc` - 垃圾回收

现有命令如 `init.ts`、`arsenal.ts` 展示了 citty 的使用模式。

## Goals / Non-Goals

**Goals:**
- 创建 4 个缺失的命令模块，恢复 `pnpm build`
- 保持与现有命令相同的代码风格和模式
- 使用 citty 的动态子命令加载

**Non-Goals:**
- 不实现完整的守护进程功能（仅提供 CLI 入口框架）
- 不实现完整的 GC 逻辑（仅提供 CLI 框架）
- 不修改现有命令的行为

## Decisions

### 1. 命令模块结构

每个命令使用 `defineCommand` 导出默认命令，与现有代码保持一致：

```typescript
export default defineCommand({
  meta: { name, description },
  subCommands: { ... },  // 如有子命令
  args: { ... },
  async run(ctx) { ... }
})
```

**替代方案考虑：**
- 直接在 `cli.ts` 中内联所有命令 → 造成 `cli.ts` 过大
- 使用 class 封装 → 增加不必要的复杂度

### 2. daemon 命令设计

`oxn daemon` 需要 3 个子命令：
- `start` - 启动守护进程（调用 Core API）
- `stop` - 停止守护进程
- `status` - 查看守护进程状态

由于完整的守护进程管理涉及 `~/.openxenon/daemon.sock` 通信，先提供框架，后续完善核心功能。

### 3. draft 命令设计

`oxn draft` 是 Draft 模式的入口。根据 README，Draft 用于推翻整体规划，在隔离沙箱中探索新拓扑。先提供框架供后续实现。

### 4. export 命令设计

`oxn export <task-id>` 导出指定任务的 `task-trace.yaml`。调用 Core API 获取任务数据，写入指定路径或 stdout。

### 5. gc 命令设计

`oxn gc` 清理已完成任务的旧资产。扫描 `.openxenon/tasks/` 目录，删除超过保留期限的任务目录。

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 命令框架搭建后核心功能未实现 | 用户运行命令无效 | 在 meta.description 中标注为 TODO |
| 子命令参数校验不完整 | 可能传入无效参数 | 后续迭代添加验证 |

## Open Questions

1. daemon 的 start/stop/status 具体如何与 Core 守护进程通信？（需要查看 Core API 规范）
2. gc 的保留策略是按时间还是按任务状态？
3. draft 命令的完整交互流程是什么？
