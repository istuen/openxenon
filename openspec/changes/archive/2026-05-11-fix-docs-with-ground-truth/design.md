## Context

Layer 1 测试已验证 ground truth：
- ProbeDefinitionSchema: `type` + `description` + `parameters` (array of {name, type, description})
- ProbeInvocationSchema: `type` + `params` ({path} 或 {path, pattern} 或 {command})

当前文档与 ground truth 严重不符，需要修正。

## Goals / Non-Goals

**Goals:**
- README CLI 速查表只包含实际存在的命令
- 04-cli-ref.md 只列出 src/cli/ 中实现的命令
- 05-arsenal.md Probe 示例使用 Definition 格式
- 06-troubleshooting.md 命令名统一为 `oxn arsenal`

**Non-Goals:**
- 不修改代码实现
- 不创建新功能
- 不修正 Schema（那是下一步）

## Decisions

1. **以 src/cli/*.ts 为 ground truth**
   - 遍历 src/cli/ 目录，列出所有 subCommands
   - 对照每个命令的 args 定义，确认参数格式
   - 不猜测，只写代码里实际存在的

2. **Probe 示例格式：Definition 而非 Invocation**
   - Definition: `{ type: 'fs_exists', description: '...', parameters: [...] }`
   - Invocation: `{ type: 'fs_exists', params: { path: '...' } }`
   - 文档应教 Definition 格式，因为 /oxn-forge 生成的是 Definition

3. **命令替换规则**
   - `oxn standards` → `oxn arsenal`
   - `oxn prove` → 不存在（CLI 层面无此命令）
   - `oxn task new` → 不存在（Blueprint 由 AI 生成后通过 submit 提交）

## Risks / Trade-offs

- **风险**：修改后文档仍可能遗漏命令
  -  Mitigation：对照 src/cli/index.ts 的 subCommands 逐个确认

- **权衡**：只修文档还是顺便修代码？
  - 决策：只修文档，代码修正是下一步（Layer 2 CLI 集成测试）的前置条件