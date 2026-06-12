## Context

当前 Schema 和 Skill references 存在不一致：

```
当前 Schema (probe.ts)：
├── fs_exists              ✓
├── fs_content_match       (旧名: fs_match)
├── exec_exit_zero         (旧名: shell_exec)
└── 缺少 fs_not_exists

当前 Skill references：
├── fs_exists              ✓
├── fs_not_exists          ✗ Schema 没有
├── fs_match               ✗ Schema 用 fs_content_match
└── shell_exec             ✗ Schema 用 exec_exit_zero

FsContentMatchParams：
├── Schema: path + pattern
└── references: pattern + contains
```

这是阻塞问题：AI 按 references 教学生成 YAML，但 Schema 校验失败。

## Goals / Non-Goals

**Goals:**
- 统一探针类型命名（Schema 和 references 一致）
- 统一 FsContentMatchParams 参数名
- 添加 fs_not_exists 到 Schema

**Non-Goals:**
- 不改变探针的实际实现逻辑（只改命名）
- 不修改 Infra 执行层的探针实现
- 不修改已有的 YAML 资产文件（只修改 Schema 和 references）

## Decisions

### 决策 1：探针类型命名

**选择：保持 Schema 的描述性命名**
- `fs_content_match` 替代 `fs_match`
- `exec_exit_zero` 替代 `shell_exec`
- 新增 `fs_not_exists`

**理由：**
- `exec_exit_zero` 比 `shell_exec` 更精确：表达"exit code === 0"评判逻辑
- `fs_content_match` 比 `fs_match` 更清晰：表达"匹配文件内容"
- Skill references 跟随 Schema 修改

### 决策 2：FsContentMatchParams 参数名

**选择：`path` + `contains`**
- `path`: 要检查的文件路径（glob 模式）
- `contains`: 文件内容必须匹配的正则

**理由：**
- `path` 表达"在哪里找"（与 fs_exists 的 pattern 区分）
- `contains` 表达"找什么"（语义直觉，比 pattern 更清楚）
- 统一 Schema 和 references 都用这个

### 决策 3：更新策略

**选择：先改 Schema，再改 references，最后重新编译**

```
1. 修改 src/kernel/schemas/probe.ts
   - 添加 fs_not_exists 类型
   - FsContentMatchParamsSchema 改为 { path, contains }

2. 修改 src/skills/oxn-forge.ts (references)
   - probe-format.md 更新类型名和参数名
   - blueprint-format.md 同步更新

3. 修改 src/skills/oxn-task.ts (references)
   - blueprint-format.md 同步更新

4. 运行 bun run src/cli.ts init --force 重新编译
```

## Risks / Trade-offs

| 风险 | Mitigation |
|------|------------|
| 改了 Schema 后已有 YAML 资产失效 | 不修改已有资产，只改 Schema 和 references |
| references 更新后 AI 行为变化 | 验证阶段测试 AI 是否正确使用新格式 |
| 其他地方引用了旧类型名 | 搜索全 codebase 确认无遗漏 |

## Migration Plan

1. 修改 `src/kernel/schemas/probe.ts`
2. 修改 `src/skills/oxn-forge.ts`（3 个 references）
3. 修改 `src/skills/oxn-task.ts`（1 个 references）
4. 运行 `bun run src/cli.ts init --force` 重新编译 skills
5. 验证 AI 行为：调用 skill() 后生成符合新 Schema 的 YAML

## Open Questions

- 无

## 文件变更清单

```
src/kernel/schemas/probe.ts    ← 添加 fs_not_exists，修正 FsContentMatchParams
src/skills/oxn-forge.ts        ← 更新 3 个 references 内容
src/skills/oxn-task.ts         ← 更新 1 个 references 内容
```