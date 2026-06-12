## Context

项目文档与代码严重脱节。当前 OXN DSL 和 Work 流程已经完全重构：

**新流程：**
- `oxn work new <id> --type task|plan|explore --blueprint <name>` 创建 Work
- `oxn work resume <work-id>` 获取下一个 Part
- `oxn work complete <work-id>` 完成 Work

**旧流程（文档中仍使用）：**
- `oxn task new/submit/next/verify` (已废弃)
- YAML 格式 Blueprint (已迁移到 OXN DSL)

## Goals / Non-Goals

**Goals:**
- 更新所有文档中的命令示例
- 确保用户按照文档可以成功操作
- 保持文档风格一致性

**Non-Goals:**
- 不修改代码
- 不修改 Skill 文档（已同步）
- 不添加新功能

## Decisions

### Decision 1: 更新策略

**选择方案：逐文件替换命令示例**

```bash
# 旧命令（需要替换）
oxn task new <task-id> --name <name>
oxn task submit --blueprint <file>
oxn task next --task-id <id>
oxn task verify --task-id <id> --stage-id <stage-id>
oxn explore new --name <name>
oxn explore scan --name <name> --path <path>
oxn explore qa --name <name> --add "Q:xxx|A:xxx"
oxn explore report --name <name>

# 新命令
oxn work new <work-id> --name <name> --type task --blueprint <bp-name>
oxn work resume <work-id>
# 注意：verify 逻辑已集成在 work 流程中
oxn work new <name> --type explore --blueprint explore-flow
# (scan/qa/report 保持兼容，但推荐通过 work 流程使用)
```

### Decision 2: 文档组织

按以下优先级更新：
1. README.md (入口文档)
2. getting-started.md (用户第一步)
3. architecture/features.md (核心流程)
4. architecture/lifecycle.md (完整生命周期)
5. guides/cli-reference.md (命令参考)
6. guides/troubleshooting.md (FAQ)

## Risks / Trade-offs

- [风险] 遗漏某些文档路径 — **缓解**：grep 搜索所有 `oxn task|explore` 命令
- [权衡] 部分旧命令仍有兼容层 — 文档中标注 DEPRECATED 状态