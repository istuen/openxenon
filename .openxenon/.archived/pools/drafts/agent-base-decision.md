# v0.6 Agent 底座决策（战略记录）

> **日期**：2026-07-04（v1.3 拍板落档）
> **状态**：🟡 战略记录（不阻塞 v0.6.0 发版，v0.7 启动决策）
> **基础**：[v0.6 RFC](./v0.6-iap-refactor-rfc.md) v1.3 §范围之外"OpenXenon Agent 底座选型"
> **关联讨论**：harness-3.md（OpenAI Harness Engineering + Pi Agent 启发）
> **作者**：opencode（与 user 协作，2026-07-04）

---

## 背景

OpenXenon 当前通过 `oxn init --ai <agent>` 把 Skill 注入到现有 AI Agent 工作台（OpenCode / Claude Code / Codex / Cursor / Pi）：

| AI Agent | 初始化命令 | Skill | 状态 |
|---|---|---|---|
| **OpenCode** | `oxn init --ai opencode` | `/oxn-work` | ✓ 支持 |
| **Claude Code** | `oxn init --ai claude` | `/oxn-work` | ✓ 支持 |
| **Codex** | `oxn init --ai codex` | `/oxn-work` | ✓ 支持 |
| **Cursor** | `oxn init --ai cursor` | `/oxn-work` | ✓ 支持 |
| **Pi** | `oxn init --ai pi` | `/oxn-work` | 🟡 评估中（v0.7 决策） |

> v0.6 起 Skills 收敛为唯一 `/oxn-work`（IAP 范式统一入口）。原 `oxn-cli` / `oxn-proof` 已删除。

## Why：为什么需要单独的"OpenXenon Agent" 底座

**当前形态**：OpenXenon 是 **Skill 注入器**——把 `/oxn-work` Skill 注入到现有 AI Agent 中，让它们在调用 Skill 时读 OXN Engine 提供的边界（Asset）与证明（frozen.json）。

**问题**：

1. **上下文不可控**：现有 Agent 的 system prompt / context window 不可控；Token 浪费 / 注意力分散是结构性瓶颈
2. **扩展点有限**：Skill 是声明式指令集（"按这个流程走"），无法强制"必须读 Asset X 才能继续"、"禁止写 frozen.json"
3. **Hook 机制缺失**：harness-1.md 启发——PreToolUse / PostToolUse / Stop 三个 Hook 节点是闭环关键；现有 Agent 的 Hook 支持不统一
4. **Memory / Roadmap 落地困难**：v0.7 RFC 主题（Memory 层 + Asset Roadmap）需要一个"可控上下文窗口"作为宿主

> **核心判断**：当 OpenXenon 从"工具"演进为"协作操作系统"时，**Skill 注入是起点，自有 Agent 是终点**。

## What：战略选项

**OpenXenon Agent 底座选型** = 决定 OpenXenon 自有 Agent 是在**哪个底座上二次开发**。

### 选项 A：基于 Pi Agent（极简可控底座）

- **设计哲学**：极简、可控、可改造；context < 1000 tokens；TypeScript Extensions + Skills + Packages
- **契合度**：harness-3.md 高度评价 Pi 与 OpenXenon 的哲学共鸣（"克制带来力量"、"工具是放大器"）
- **优势**：
  - 几乎无黑盒，行为可预测——OpenXenon "信任"哲学的物理实现
  - 上下文工程透明——Token 经济学可控
  - 扩展是"开发者编程接口"——Memory / Roadmap / Hook 可深度定制
  - 4 维评估对比下，Pi 在"透明度与控制"完胜
- **劣势**：
  - 社区相对小众（vs OpenCode 16 万+ stars）
  - 上手门槛高（需工程师主动管理上下文）
  - 文档与生态不如 OpenCode 完善

### 选项 B：基于 OpenCode（大众易用底座）

- **设计哲学**：开箱即用、功能丰富；MCP + Skills + 低代码扩展
- **契合度**：社区活跃，GitHub Stars 16 万+，上手门槛低
- **优势**：
  - 社区生态强——降低大众采纳门槛
  - Plan / Build 模式可降低用户心智负担
  - 75+ Provider 支持——模型选择灵活
- **劣势**：
  - 架构更重——二次开发耦合度高
  - 部分功能（如 Plan 模式）有隐藏逻辑——侵蚀"OXN 出证明"的确定性
  - 透明度与控制不如 Pi

### 选项 C：自研 Agent（完全自主）

- **设计哲学**：从零构建，最大化契合 IAP 范式
- **优势**：
  - 完全契合 OpenXenon 哲学
  - 无外部依赖，长期可持续
- **劣势**：
  - 工作量极大（重写 OpenCode / Pi 已实现的 90% 能力）
  - 用户习惯迁移成本
  - 偏离 v0.6"轻量级工具"定位

> **v0.6 推荐结论**：**不选 C**（自研投入产出比低）；**A vs B 由阶段 1 验证决定**。

## How：阶段化验证（不阻塞 v0.6.0 发版）

### 阶段 1：并行验证（v0.6.1 ~ v0.6.3，~3 个月）

| 验证线 | 工具 | 目标 | 关键指标 |
|---|---|---|---|
| **OpenCode 宽度验证** | OpenCode | 快速验证 IAP 闭环 + 收集早期用户反馈 | 5+ 用户成功跑通 work → proof → insight 闭环；<br>1 小时内入门 |
| **Pi 深度验证** | Pi | 验证 Memory / Roadmap 概念；测试高级协作模式 | Pi 扩展能拦截 bash 调用并生成 proof sidecar；<br>Token 经济学可控 |

### 阶段 2：评估与决策（v0.7 启动前，2 周）

| 评估维度 | 权重 | Pi | OpenCode |
|---|---|---|---|
| **上下文干净度** | 25% | ★★★★★ | ★★★ |
| **扩展开发效率** | 20% | ★★★★ | ★★★ |
| **行为可预测性** | 25% | ★★★★★ | ★★★ |
| **社区生态** | 15% | ★★ | ★★★★★ |
| **上手门槛** | 15% | ★★ | ★★★★ |

> **预判**：Pi 在加权评估中可能胜出（透明度 + 可控性是高权重项），但需阶段 1 数据验证。

### 阶段 3：原生融合（v0.7+ 启动后，~6 个月）

不论选 Pi 还是 OpenCode，最终产物是 **`@openxenon/agent`**：

- 强制加载项目的 Asset / Memory / Roadmap
- 拦截并管理 AI Agent 的工具调用（转化为 Work 记录）
- 自动采集工具调用结果（生成 Proof sidecar）
- 提供统一的会话和状态管理界面（Hall 雏形）

## 风险与缓解

| 风险 | 影响 | 缓解策略 |
|---|---|---|
| 阶段 1 验证发现 Pi / OpenCode 都有硬伤 | 决策延迟 v0.7 启动 | 保留 Skill 注入路径作为长期 fallback |
| OpenCode 16 万+ 社区压力 | 难以拒绝"流量诱惑" | 战略上保持"工具"定位；社区价值≠架构契合度 |
| Pi 项目方向突变 / 维护停滞 | 底座不稳定 | Pi 是极简项目（~10K LOC），可 fork 自维护；或迁移到 fork 分支 |
| OpenXenon Agent 演化为"AI Agent OS"（偏离创作者意图） | 工具变成平台，丧失轻量级 | 创作者本人对"边界扩张"保持清醒；harness-3.md 讨论已明文化："OpenXenon 是工具，不是平台" |

## 决策记录

| 决策 | 结论 |
|---|---|
| 战略问题是否阻塞 v0.6.0 发版？ | **否**。v0.6 只交付 Engine + CLI + Skill 注入；Agent 选型是 v0.7 议题 |
| 选项 C（自研）是否考虑？ | **不推荐**。偏离"轻量级工具"定位，工作量极大 |
| 阶段 1 时间窗口？ | v0.6.1 ~ v0.6.3（~3 个月），与 v0.6 RFC 10 PR 串行不冲突 |
| 阶段 2 决策权？ | 创作者本人（user）；阶段 1 数据出来后由创作者拍板 |
| 阶段 3 是否独立 package？ | 是。`@openxenon/agent` 作为 Engine 之上的独立 package；与 Skill 注入路径并存 |

## 范围之外

- **AI Agent OS 路径**：harness-3.md 讨论明确"OpenXenon 不追求成为 AI Agent OS"——这是 Pi 项目的目标，不是 OpenXenon 的。OpenXenon Agent 是协作工具的延伸，不是平台。
- **OpenXenon 模型训练**：工具不训练模型，模型选择完全开放。
- **OpenXenon 商业化**：不在 v0.6/v0.7 讨论范围。

## 关联文档

- [v0.6 RFC](./v0.6-iap-refactor-rfc.md) v1.3 §范围之外"OpenXenon Agent 底座选型"
- [harness-3.md](../../../docs_tmp/harness-3.md) §OpenAI Harness Engineering + Pi Agent 讨论
- [harness-1.md](../../../docs_tmp/harness-1.md) §Harness Engineering 双环控制 + Rules 分级 + Hooks 体系
- [docs/zh-cn/architecture.md](../../../docs/zh-cn/architecture.md) §OXN Engine 定位
