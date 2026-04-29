## Context

CLI 命令已从 `oxn standards` 重命名为 `oxn arsenal`。源码中引用了旧命令的 Skill 需要同步更新。

**现状：**
- `src/skills/oxn-forge.ts` 第 27-28 行仍使用 `oxn standards inspect` 和 `oxn standards promote`
- `.opencode/skills/oxn-forge/SKILL.md` 编译产物也有相同问题
- `src/commands/arsenal-inspect.ts` 要求 PATH 参数，无默认值

**约束：**
- Skill 源码变更后需重新编译到 `.opencode/skills/`
- 保持与现有命令结构的兼容性

## Goals / Non-Goals

**Goals:**
- 修复 Skill 源码中的命令引用
- 重新编译 Skill 到 `.opencode/skills/`
- 增强 `arsenal inspect` 无参数时的用户体验

**Non-Goals:**
- 不修改 `standards-loader.ts` 等核心逻辑
- 不改变资产的目录结构

## Decisions

### 1. Skill 源码修复

直接修改 `src/skills/oxn-forge.ts`：
- `.openxenon/standards/[类型]/DRAFT/[文件名]` → `.openxenon/arsenal/[类型]/DRAFT/[文件名]`
- `oxn standards inspect` → `oxn arsenal inspect`
- `oxn standards promote` → `oxn arsenal promote`

**替代方案**：保持 Skill 中的路径为 `standards/` 只修改 CLI 别名 → 拒绝，因为目录已实际改名为 `arsenal`

### 2. Skill 编译

Skill 编译由 `oxn init --compile-force` 触发。但本次只修复源码，不触发重新编译——让用户决定何时重新编译。

**替代方案**：自动触发编译 → 拒绝，编译可能影响正在运行的 AI 会话

### 3. arsenal inspect 默认行为

无 PATH 参数时，列出 `.openxenon/arsenal/` 下所有 DRAFT 资产供用户选择：

```bash
$ oxn arsenal inspect
请选择要查看的资产：

  [1] probes/DRAFT/check-file.yaml
  [2] proofs/DRAFT/my-proof.yaml
  [3] stages/DRAFT/install.yaml

输入编号 (或 q 退出):
```

**替代方案**：无参数时报错提示必须提供路径 → 拒绝，用户体验不佳

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| Skill 编译产物未更新 | AI 助手仍使用旧命令 | 告知用户需运行 `oxn init --compile-force` |
| 用户不熟悉交互式选择 | 操作困惑 | 提供清晰的提示信息 |

## Open Questions

无
