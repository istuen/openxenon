## Context

当前 `oxn-forge` Skill 和 CLI 职责不清：
- Skill 包含硬编码的约束信息
- 没有 CLI 命令让工程师直接获取元蓝图

## Goals / Non-Goals

**Goals:**
1. 提供 `oxn forge <type>` 命令，让工程师直接查看元蓝图约束
2. 改进 Skill 指令，让 AI 模型通过 CLI 获取元蓝图

**Non-Goals:**
- 不修改元蓝图资产结构

## Decisions

### Decision 1: CLI 命令结构

**选择：**
```
oxn forge <type>
oxn forge probe    # 查看 Probe 元蓝图
oxn forge proof    # 查看 Proof 元蓝图
oxn forge stage     # 查看 Stage 元蓝图
oxn forge blueprint # 查看 Blueprint 元蓝图
oxn forge all       # 查看所有元蓝图
```

**理由：**
- 简单直观，与 `oxn arsenal list` 风格一致

### Decision 2: Skill 改进

**选择：**
Skill instruction 改为：
```
当需要生成资产时：
1. 执行 'oxn forge <type>' 获取元蓝图模板
2. 根据模板生成符合规范的 YAML
3. 调用 createDraftFromYaml 保存
```

**理由：**
- AI 通过 CLI 获取最新模板，而非硬编码
- 模板可单独更新

## Risks / Trade-offs

- **CLI 和 Skill 耦合** → 通过 CLI 获取模板，保持一致