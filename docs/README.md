# OpenXenon 文档

> 简体中文为权威版本。英文翻译暂不提供（v0.1）。

## 文档地图

```
docs/
├── core/                 # 核心理念与概念
│   ├── philosophy.md     # 核心理念：人机对齐框架
│   ├── intent-align.md   # Intent-Align 范式（架构灵魂）
│   ├── concepts.md       # 4 个核心实体
│   └── terminology.md    # 术语表
│
├── architecture/         # 架构设计
│   ├── overview.md       # L0-L3 四层宪法
│   ├── domain.md         # Domain 实体详解
│   ├── blueprint.md      # Blueprint 实体详解
│   ├── work-and-task.md  # Work + Task 详解
│   ├── state.md          # 双层 state.json
│   └── information-hiding.md  # 信息隐藏原则
│
├── reference/            # 参考文档
│   ├── oxn-dsl.md        # OXN DSL 完整语法
│   ├── cli-reference.md  # CLI 命令参考
│   ├── state-schema.md   # state.json schema
│   └── probe-types.md    # 内置 Probe 类型
│
├── guides/               # 实践指南
│   ├── getting-started.md    # 5 分钟跑通
│   ├── ddd-workflow.md       # 端到端示例
│   ├── probe-development.md  # 自定义 Probe
│   └── troubleshooting.md    # 故障排查
│
├── adr/                  # 架构决策记录
│   └── 0001-...md
│
├── blog/                 # 博文（独立于 docs）
│   └── ...
│
└── changelog/
    └── CHANGELOG.md
```

## 推荐阅读路径

**新手**：
1. [core/philosophy.md](./core/philosophy.md) — 我们在解决什么问题
2. [core/intent-align.md](./core/intent-align.md) — 架构灵魂
3. [core/concepts.md](./core/concepts.md) — 4 个核心实体
4. [guides/getting-started.md](./guides/getting-started.md) — 跑通第一个 work

**架构师**：
1. [core/intent-align.md](./core/intent-align.md) — Intent-Align 范式
2. [architecture/overview.md](./architecture/overview.md) — L0-L3 四层宪法
3. [architecture/domain.md](./architecture/domain.md) — Domain 实体
4. [architecture/work-and-task.md](./architecture/work-and-task.md) — Work + Task
5. [adr/](./adr/) — 关键架构决策

**开发者**：
1. [reference/oxn-dsl.md](./reference/oxn-dsl.md) — 完整 DSL 语法
2. [reference/cli-reference.md](./reference/cli-reference.md) — CLI 命令
3. [reference/state-schema.md](./reference/state-schema.md) — 运行时 schema
4. [guides/ddd-workflow.md](./guides/ddd-workflow.md) — 端到端示例

## 文档维护原则

1. **zh-cn 为权威** — 简体中文是文档的唯一来源
2. **代码与文档同步** — `.oxn` 例子必须能在仓库真实运行
3. **概念不重复** — 每个概念在 core/concepts.md 出现一次，其他文档只引用
4. **废弃术语不入文档** — 旧术语（stage/expectation/rule/inject/align 字符串拼接）见 [terminology.md §废弃术语](./core/terminology.md#9-废弃术语不要使用)

## 上一级

- [README.md](../README.md)
