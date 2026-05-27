## Context

Kernel Schema 层（`src/kernel/schemas/probe.ts`）和 Infra 层（`src/infra/probes/index.ts`）对探针类型的命名不一致：

| 功能 | Schema 当前值 | Infra 当前值 | 正确值 |
|------|---------------|--------------|--------|
| 文件存在 | `fs_exists` | `fs_exists` | `fs_exists` |
| 文件不存在 | 缺失 | `fs_not_exists` | `fs_not_exists` |
| 内容匹配 | `fs_content_match` | `fs_match` | `fs_match` |
| 命令执行 | `exec_exit_zero` | `shell_exec` | `shell_exec` |

同时 `fs_match` 参数名 Schema 用 `path`，Infra 用 `pattern`/`contains`。

另外 `shell-exec.ts` 存在 bug：非绝对路径命令会被错误拼接。

## Goals / Non-Goals

**Goals:**
- 统一 Schema 和 Infra 的类型名
- 修复 shell-exec 的 isAbsolute bug
- 添加命令执行 timeout

**Non-Goals:**
- 不改变探针的执行逻辑（只是名字对齐）
- 不添加新的探针类型
- 不实现沙盒隔离（技术债，记录但不实现）

## Decisions

### Decision 1: 统一到 Infra 的命名体系

**选择**：Schema 适配 Infra（短名体系），不改 Infra

**理由**：
- Infra handlers 已经使用 `fs_match` / `shell_exec`
- Arsenal YAML 文件中已经使用短名
- Skill references 已经使用短名
- 改 Schema 成本最低

**替代方案**：
- 统一到 Schema 的描述性名称（`fs_content_match`, `exec_exit_zero`）
- 缺点：需要改 Infra handlers + 所有 Blueprint + 所有 Skill references

### Decision 2: FsMatchParams 使用 `pattern` + `contains`

**选择**：`{ pattern: string, contains?: string }`

**理由**：
- `pattern` 表示文件路径（glob）
- `contains` 表示内容匹配正则
- 比 Schema 原来的 `path` + `patterns` 更清晰

### Decision 3: shell-exec timeout 默认 30 秒

**选择**：不传 timeout 参数时默认 30 秒

**理由**：
- 防止 `npm run build` 等命令永久卡住
- 30 秒对大多数命令够用
- 未来可通过 Blueprint 参数覆盖

### Decision 4: isAbsolute bug 修复方式

**选择**：`shell: true` 时直接传 command，不做 join

**理由**：
- 当前 bug：`"npm run lint"` → `join("/project", "npm run lint")` → `/project/npm run lint`
- shell: true 时 shell 会自己找命令，不需要拼接 path
- 直接传 command 让 shell 自己解释

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 旧 Blueprint 引用 `fs_content_match` 会失败 | 破坏性变更 | 需要用户更新 Blueprint |
| `kernel-schema-tests` spec 需要大量更新 | 工作量 | 修改后验证所有测试通过 |
| shell: true 的安全问题 | 技术债 | 记录，0.2 再处理 |

## Open Questions

无。当前方案清晰，实现路径明确。
