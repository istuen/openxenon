---
title: 术语表
---

# 术语表

> v0.6 重构：E1-E4 结构实体（理念层）+ L0-L3 工程分层（概念层）+ 物理目录（实际路径）。

## E1-E4 四结构实体（理念层）

| 术语 | 中文 | 定义 |
|---|---|---|
| **E1 Asset** | **静态边界** | 工程师维护的硬约束边界：Domain/Blueprint/Stack |
| **E2 Work** | **动态协作** | 工程师与 AI 动态协作空间：IAP 三阶段 + Round |
| **E3 Engine** | **独立公证** | 独立验证主权基座：探针 + frozen.json + hash 校验 |
| **E4 Insight** | **涌现层** | 1+1>2，整体论，AI 跨 Work 综合推理 |
| Domain | 领域 | E1 业务边界：term/ban/invariant |
| Blueprint | 蓝图 | E1 技术拓扑边界：slot DAG + observe 探针 |
| Stack | 技术栈 | E1 技术环境边界（v0.6 硬要求） |
| Work | 工作 | E2 IAP 周期承载体 |
| IAP | IAP 范式 | Intent → Align → Proof 三阶段核心逻辑 |
| Round | 轮次 | E2 Work 内部单次 IAP 循环（v0.6 新增） |

## L0-L3 工程分层（概念层）

| 术语 | 中文 | 定义 | 物理目录 |
|---|---|---|---|
| **L3 Tools** | 工具与应用层 | 用户/Agent 交互界面 | `src/cli/` + `.opencode/skills/` + `src/daemon/` |
| **L2 Engine** | 引擎核心业务 | E1-E4 全部实现 | `src/service/<Domain>/` |
| **L1 OXL + Infra** | 操作基座与语言 | DSL 编译 + OS/硬件操作 | `src/oxl/` + `src/infra/` |
| **L0 Kernel** | 逻辑内核 | 纯逻辑零 IO | `src/kernel/` |
| CLI | 命令行入口 | 薄组合调用层 | `src/cli/` |
| Daemon | 守护进程 | 文件监听、Work 追踪 | `src/daemon/` |
| Skills | AI 技能 | oxn-work 统一 Skill | `.opencode/skills/oxn-work/` |

## 新增架构术语（v0.6）

| 术语 | 定义 |
|---|---|
| **E1-E4 结构实体** | OXN 的 4 个哲学顶层概念（理念层），不直接映射代码目录 |
| **DDD 模块化 Service** | L2 Engine 业务模块组织方式：`Service/<Domain>/{index,create,...}.ts` |
| **薄 CLI** | L3 CLI 只做 parse args → import 调 L2 Engine → format output |
| **Round** | E2 Work 内部单次 IAP 循环（v0.6 新增 `oxn work next-round`） |
| **硬约束三层锁** | planLock + content_hash + chmod 0o444（Asset 不可变保证） |
| **涌现层** | E4 Insight 的哲学定位：整体论 1+1>2 |

## 废弃术语（v0.6）

| 废弃术语 | 原因 | 替代 |
|---|---|---|
| **IAP 三轴** | 重构为 E1-E4 + L0-L3 | E1-E4 四结构实体 |
| **Layer 1/2/3/4（哲学上下文）** | 与工程 L0-L3 混淆 | E1-E4 |
| **Insight 作为 Work Mode** | 升为 E4 涌现层 | E4 Insight |
| **4 大 Work 模式** | Insight 独立 → 3 模式 | Asset / Develop / Proof |
| `oxn-cli` Skill | 删除 | `/oxn-work` |
| `oxn-proof` Skill | 删除 | `/oxn-work` |
| `intent.md / align.md / proof.md` | 删除 | `work.md` |

## OXL 寻址哲学（ADR-0023）

`@` 前缀在 OXL 全库语义统一：

| 前缀 | 含义 | 例 |
|---|---|---|
| `@oxn/` | builtin | `@oxn/probe/fs-exists` |
| `@prj/` | 项目级 | `@prj/blueprints/dev-workflow` |
| `@gbl/` | 用户全局 | `@gbl/part/my-helper` |
| `@term/` | 同 Domain 跨 term 引用 | `@term/OrderItem` |

**反模式（否决 `->` 伪指针）**：

```oxl
// ❌ 否决：伪指针（OOP 思维在 OXL 中的渗透）
OrderItem -> Order

// ✅ 改用：纯文本或 `@term/`
"OrderItem"           // 自然语言引用
"@term/OrderItem"     // 物理引用（强制存在校验）
```

`->` 不携带位置信息，编译期无法校验。OXL 引用必须是**物理可寻址**（Langium 能解析为实际 AST 节点）。
