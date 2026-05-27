## Context

### 当前状态

**问题 1: Skill 编译错误**

Skill 编译时抛出"技能必须提供名称"错误，来源待查。检查 `skill-compiler.ts` 和 `skills/types.ts`，当前 `OpenXenonSkill` 接口要求 `id` 字段必填，所有现有 Skill 都有 id。但错误仍出现，可能是校验逻辑有问题。

**问题 2: `oxn init -f` 不是强制覆盖**

当前 `oxn init` 在项目已存在时的行为：
- 调用 `ensureProjectBoundary()` 确保目录存在（幂等，安全）
- 调用 `copyMetaToProject()` 拷贝 meta（会删除已存在的再拷贝，也是幂等）
- 调用 `compileAllSkills()` 编译 Skills（`force=false`，内容相同时跳过）

问题在于 `init.ts` 的 `-f` 参数只定义了 `sandbox` 别名，没有 `force` 参数。当项目已存在时，`readProjectConfig()` 返回已有配置，`oxn init` 只更新 mode，不做真正的强制覆盖。

### 当前 init.ts 参数定义

```typescript
args: {
  name: { type: 'positional', description: '项目名称', required: false },
  sandbox: { alias: 's', type: 'boolean', description: '初始化为沙箱模式', default: false }
}
```

没有 `-f/--force` 参数。

## Goals / Non-Goals

**Goals:**
- 定位并修复"技能必须提供名称"错误
- 实现 `oxn init -f` 强制覆盖：删除并重建 `.openxenon/` 目录

**Non-Goals:**
- 不修改 Skill 编译的其他逻辑
- 不修改 Daemon 相关逻辑

## Decisions

### Decision 1: Skill name 校验修复

**问题分析:**

错误信息"技能必须提供名称"可能来自：
1. Skill 编译器校验时，某个 Skill 的 `id` 为空或 `undefined`
2. 或者错误信息不是来自 `skill-compiler.ts`，而是来自其他地方

**需要进一步调查:**
- 搜索整个代码库找到错误信息来源
- 确认是校验逻辑问题还是数据问题

### Decision 2: `oxn init -f` 实现方式

**选择: 真正的强制覆盖 - 删除并重建 `.openxenon/`**

**理由:**
- 强制覆盖应该是"回到初始状态"，不是"只更新 mode"
- 删除重建是最简单最彻底的方式
- 不影响全局边界（`~/.openxenon/`）

**实现步骤:**
1. 添加 `--force/-f` 参数
2. force 时先 `rmSync(.openxenon/, { recursive: true, force: true })`
3. 然后重新 `ensureProjectBoundary()` + `copyMetaToProject()` + `compileAllSkills(force=true)`

**替代方案:**
- 方案 A (只传 force 给 compileAllSkills): 不够强制，目录本身没被清理
- 方案 B (保留现有 + force 写): 会导致残留文件，不干净
- 方案 C (删除重建): 最干净，实现也简单

## Risks / Trade-offs

| 风险 | 描述 | 缓解 |
|------|------|------|
| force 删除目录时误删重要文件 | `.openxenon/` 内可能有用户数据 | `.openxenon/` 设计为可恢复（重新 init 即可重建），且 force 需要用户明确指定 |
| Skill name 错误来自其他模块 | 错误可能不在 skill-compiler.ts | 先 grep 全局搜索定位错误来源 |

## Migration Plan

**步骤 1: 定位 Skill name 错误来源**
```bash
grep -r "必须提供名称" src/
```

**步骤 2: 修复 Skill 编译**
- 如果是校验问题，修复校验逻辑
- 如果是数据问题，修复对应的 Skill

**步骤 3: 实现 `oxn init -f`**
```bash
# 测试
oxn init -f
# 验证 .openxenon/ 被重建，Skills 被重新编译
```

## Open Questions

1. **"技能必须提供名称"错误的真正来源在哪里？** 需要 grep 全局定位。
2. **`force` 时是否需要用户确认？** 当前设计是不需要，命令行工具默认信任用户。
