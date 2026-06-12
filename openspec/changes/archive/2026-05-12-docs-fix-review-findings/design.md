## Context

docs/manual 审查后残留 13 处术语和路径问题需修复。这是纯文档修复，无代码变更，无架构影响。

## Goals / Non-Goals

**Goals:**
- 清除 docs/manual 中残留的学术术语
- 修正日志路径等实际错误
- 保持 CLI 签名与 0.1 实际一致

**Non-Goals:**
- 不修改任何代码
- 不改变任何功能行为
- 不涉及 README.md 和 docs/architecture.md

## Decisions

| 文件 | 修改内容 | 理由 |
|------|---------|------|
| 01-intro.md | "物理观测" → "观测" | 去多余修饰 |
| 02-concepts.md | "二象性" → "双重视角" | 偏学术 |
| 02-concepts.md | "/oxn-task" → "oxn task next" | CLI 命令是标准写法 |
| 03-lifecycle.md | "逃逸检测" 删除 | architecture.md 已去除的旧术语 |
| 05-arsenal.md | "物理落盘" → "保存" | 学术术语 |
| 05-arsenal.md | "AI 降维生成" → "AI 根据约束生成" | 学术术语 |
| 05-arsenal.md | "审查与确权" → "审查与转正" | 学术术语 |
| 05-arsenal.md | 探针命名对齐 architecture.md | 内部不一致 |
| 05-arsenal.md | 目录结构描述改为 flat 结构 | 实际结构已改 |
| 06-troubleshooting.md | Core → Daemon | 旧术语 |
| 06-troubleshooting.md | 日志路径 → ~/.openxenon/daemon.log | 实际路径 |

## Risks / Trade-offs

无风险，纯文本替换。
