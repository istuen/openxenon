## Context

当前 oxn-explore 使用独立 CLI 流程（new → scan → qa → report），与 oxn-task 的 Blueprint/Work 体系不一致。oxn-task 已实现：
- Work Type 分类（`.openxenon/work/<type>/<name>.oxn`）
- `oxn work init/submit/next/verify` 命令体系
- Blueprint slot 填充和 DAG 执行

目标：将 explore 改造为 Blueprint 驱动的 work type，同时新增 plan type。

## Goals / Non-Goals

**Goals:**
- Explore Type Blueprint（`explore-flow`）：scan/qa/report 三阶段
- Plan Type Blueprint（`plan-flow`）：analyze/design/estimate/review 四阶段
- Skill instruction 重写，使用 `oxn work` 命令
- 保持旧版 `oxn explore` 命令兼容
- 问答文件路径保持兼容（`explores/<name>/ai-qa.json`）

**Non-Goals:**
- 不废弃旧 `oxn explore` 命令
- 不迁移已有 explores 数据（保持双路径兼容）

## Decisions

### 1. Blueprint Type 定义

```oxn
blueprint "explore-flow" type "explore" {
  part slot "scan" {
    deps = []
    target: { description: "docs/", glob: "..." }
    action: "扫描资料到 .openxenon/explores/<name>/docs/"
  }
  
  part slot "qa" {
    deps = ["scan"]
    target: { description: "qa/", glob: ".../ai-qa.json" }
    action: "AI-工程师问答"
  }
  
  part slot "report" {
    deps = ["qa"]
    target: { description: "report.md" }
    action: "生成探索报告"
  }
}
```

**决策**：使用 `type "explore"` 和 `type "plan"` 区分 Blueprint 类型，work init 时指定 `--type` 参数。

### 2. 目录结构

```
.openxenon/
├── work/
│   ├── explore/           ← work 文件入口
│   │   └── <name>.oxn    ← work "<name>" type "explore" ref "..."
│   └── plan/
│       └── <name>.oxn    ← work "<name>" type "plan" ref "..."
└── explores/             ← 数据目录（保持兼容）
    └── <name>/
        ├── docs/
        ├── ai-qa.json
        ├── engineer-qa.json
        └── report.md
```

**决策**：`work/explore/` 目录存储 work 文件，实际数据仍在 `explores/` 下，通过 probe 验证文件存在。

### 3. Skill Instruction 重写

旧 instruction.md 描述 `oxn explore new/scan/qa/report` 命令链。
新 instruction.md 改为：
```
1. oxn work init <name> --type explore --blueprint explore-flow
2. oxn work next --work-id <name> --type explore
3. AI 执行 part（扫描资料/问答/生成报告）
4. oxn work verify --work-id <name> --part-id <id>
5. 重复 2-4 直到完成
```

### 4. Plan Blueprint

```oxn
blueprint "plan-flow" type "plan" {
  part slot "analyze" { deps = [] }
  part slot "design" { deps = ["analyze"] }
  part slot "estimate" { deps = ["design"] }
  part slot "review" { deps = ["estimate"] }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 旧命令与新命令混用造成困惑 | Skill instruction 明确标注新流程，旧命令标注 DEPRECATED |
| work submit 重复解析 task.oxn | 复用 unifiedTaskSubmit 管线，只更换目录路径 |

## Open Questions

- 无