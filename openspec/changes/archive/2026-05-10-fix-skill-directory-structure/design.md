## Context

当前 Skill 编译系统将每个 Skill 编译成单文件：

```
.opencode/skills/
├── oxn-forge.md          ← 单文件
├── oxn-init.md
├── oxn-task.md
├── oxn-resume.md
├── oxn-status.md
├── oxn-stop.md
└── oxn-trace.md
```

但 `oxn-forge` 已经使用了正确的目录结构：

```
.opencode/skills/
├── oxn-forge/
│   └── SKILL.md         ← 目录形式
└── ...其他还是单文件...
```

## Goals / Non-Goals

**Goals:**

- 统一所有 Skill 使用目录/SKILL.md 结构
- 修改 `skill-compiler.ts` 的输出路径逻辑
- 迁移现有编译产物到新结构

**Non-Goals:**

- 不修改 Skill 源码位置（仍在 `src/skills/`）
- 不修改 Skill 编译的 content 格式
- 不修改 Skill 加载逻辑（如果有的话）

## Decisions

### 1. 新输出路径格式

```typescript
// 修改前
const outputPath = join(projectPath, '.opencode', 'skills', `${skill.id}.md`)

// 修改后
const outputPath = join(projectPath, '.opencode', 'skills', skill.id, 'SKILL.md')
```

**理由**：与 `oxn-forge` 已存在的结构保持一致。

### 2. 迁移策略

由于 Skill 编译在 `oxn init` 时执行，可以：

1. 修改 `compileSkill()` 输出到新路径
2. 旧单文件 `.md` 可以选择保留（向后兼容）或删除（清理）
3. 下次 `oxn init -f` 时会重新编译到新路径

### 3. 目录结构示例

修改后：

```
.opencode/skills/
├── oxn-forge/
│   └── SKILL.md
├── oxn-init/
│   └── SKILL.md
├── oxn-task/
│   └── SKILL.md
├── oxn-resume/
│   └── SKILL.md
├── oxn-status/
│   └── SKILL.md
├── oxn-stop/
│   └── SKILL.md
└── oxn-trace/
    └── SKILL.md
```

## 实现步骤

### Step 1: 修改 compileSkill()

1. 修改 `outputPath` 生成逻辑
2. 确保输出目录存在后再写文件
3. 删除旧单文件（可选）

### Step 2: 验证

1. `pnpm run typecheck`
2. `pnpm run build`
3. `oxn init -f` 强制重新初始化，Skill 会被编译到新的 `.opencode/skills/<skillId>/SKILL.md` 路径