# 核心概念

本目录包含 OpenXenon 核心概念的详细说明。

## 文档索引

| 文档 | 内容 |
|------|------|
| [blueprint.md](./blueprint.md) | Blueprint 蓝图 |
| [stage.md](./stage.md) | Stage 工序节点 |
| [probe.md](./probe.md) | Probe 原子检查 |
| [artifact.md](./artifact.md) | Artifact 产物 |
| [arsenal.md](./arsenal.md) | Arsenal 资产库 |
| [terminology.md](./terminology.md) | 术语表 |

## 概念关系

```
Arsenal（资产库）
├── Blueprint（蓝图）── 定义任务执行拓扑
│   └── stages: [Stage 实例]
│
├── Stage（工序）── 定义执行与校验单元
│   ├── target（对 AI 可见）
│   ├── action（对 AI 可见）
│   ├── spec（对 AI 不可见）
│   └── probes（对 AI 不可见）
│
└── Probe（探针）── 原子化检查逻辑

Task（任务）
├── Frozen（冻结快照）── Blueprint 编译产物
├── Artifact（产物）── AI 构建的执行结果
└── Trace（轨迹）── Core 判定记录
```

## 信息隐藏原则

OpenXenon 的核心设计原则：**AI 助手无法感知验证标准**。

| 字段 | 可见性 | 原因 |
|------|--------|------|
| `target` | 对 AI 可见 | 告知执行作用域 |
| `action` | 对 AI 可见 | 下发执行指令 |
| `spec` | 对 AI 不可见 | 工程师的验收标准，不应被 AI 绕过 |
| `probes` | 对 AI 不可见 | 验证逻辑，不应被 AI 针对性优化 |
