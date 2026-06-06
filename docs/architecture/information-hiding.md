# 信息隐藏原则

> OpenXenon 的核心设计原则之一：**AI 助手不能感知验证标准**。

## 1. 核心原则

> **AI 助手只看到"该做什么"，看不到"该满足什么"。**

这是**对抗性设计**——假设 AI 可能尝试绕过验证，通过信息隐藏阻止针对性优化。

## 2. 显式可见 vs 隐式隐藏

| 信息 | 谁能看 | 原因 |
|---|---|---|
| `domain.term` | ✅ AI 可见 | AI 写代码时需要使用统一语言 |
| `domain.ban` | ✅ AI 可见 | AI 需要知道禁用词 |
| `domain.invariant` | ⚠️ v0.1 文档化（v0.2 接 Probe） | v0.1 AI 可见；v0.2 转 Probe 隐藏 |
| `blueprint.slot` | ✅ AI 可见 | AI 需要知道有哪些 slot 可 align |
| `blueprint.observe` | ⚠️ v0.1 文档化（v0.2 接 Probe） | v0.1 AI 可见；v0.2 转 Probe 隐藏 |
| `task.skill_context` | ✅ AI 可见 | AI 需要知道执行指令 |
| `task.part` 内的 `probe` | ❌ AI **不可见** | 验证标准不可绕过 |
| `frozen.json` | ❌ AI 不可写 | 判决书由 Core 独占 |
| `state.json` 内部 status | ❌ AI 不可写 | 状态由 Core 独占维护 |

## 3. 为什么需要信息隐藏

### 3.1 防止针对性优化（Test-hacking）

如果 AI 知道验证标准，会"针对 probe 优化"而不是真正解决问题：

```
❌ AI 看见 spec: "必须使用 Prisma ORM"
   │
   ▼
   AI 只在文件头 import Prisma 但实际不用
   │
   ▼
   Probe 检查 fs_match("@prisma/client") → PASSED
   │
   ▼
   但代码实际用其他 ORM（业务侧并未真正约束）
```

### 3.2 保持客观评价

验证逻辑由 Core 独占持有，AI 不可干扰：

```
AI 不知道 probe 内容
   │
   ▼
AI 无法预测将执行哪些检查
   │
   ▼
AI 必须真正完成任务，不能"猜检查点"
```

### 3.3 工程师掌控验证

验证标准是工程师的"底牌"，不应暴露给执行者：

```
工程师定义 spec + probes
   │
   ▼
Core 独占持有
   │
   ▼
AI 只能看到 target + action
   │
   ▼
验证时，工程师通过 spec + probes 判决
```

## 4. v0.1 实现现状

### 4.1 已实现的隐藏

| 机制 | 现状 |
|---|---|
| **Blueprint 不含 expectation/rule** | ✅ 已删除 |
| **Probe 在 Part 内但 runtime 不可见** | ✅ probe 块在 Part 内（语法），AI 看到 part 时不读 probe 块（语义） |
| **frozen.json 由 Core 写** | ✅ Leader 流程自动写，AI 不调用 |
| **state.json 内部 status 由 Core 维护** | ✅ AI 只通过 `submit` 推进 |

### 4.2 v0.2 待实装

- Part 级 probe 块的 **运行时执行**（Kernel 判决）
- Domain invariant 的 **Probe 强校验**（`language-ban-checker`）
- State 的 **签名验证**（防止手工篡改）
- Trace 的 **加密归档**

## 5. 信息流图

```
┌─────────────────────────────────────────────────────────────┐
│                     Information Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  工程师                                                      │
│    │                                                         │
│    ├── 定义 Domain (term/ban/invariant)              ──▶ AI 可见
│    ├── 定义 Blueprint (slot/observe)                  ──▶ AI 可见
│    ├── 审查 Task.frozen.json                       ──▶ 工程师独有
│    └── 验收最终结果                                  ──▶ 工程师独有
│                                                              │
│  OXN                                                 │
│    │                                                         │
│    ├── 独占 frozen.json 写权限                          ──▶ AI 不可写
│    ├── 独占 state.json 写权限                           ──▶ AI 不可写
│    ├── 执行 probe 校验                                 ──▶ 工程师可审查
│    └── 生成 trace 追加写                                ──▶ 工程师可审查
│                                                              │
│  AI Assistant                                                │
│    │                                                         │
│    ├── 看到 term/ban/slot/skill_context             ──▶ 可读
│    ├── 通过 CLI 推进状态                            ──▶ 仅 submit
│    ├── 写代码、改文件                                ──▶ 通过 CLI 委托
│    └── 看不到 probe 内容                             ──▶ 不可读
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 6. 与"AI 不知道标准"的一致性

整个 OpenXenon 架构都贯穿信息隐藏原则：

| 角色 | "不能感知"的内容 |
|---|---|
| AI | 验证标准（probe）、期望行为（expectation）、业务规则（rule） |
| Core | 业务语义（term/ban 怎么用）、技术策略（怎么写代码） |
| 工程师 | 实时审查（不介入每次执行） |

三者各守边界，互不越界。

## 7. 下一章

- [架构总览](./overview.md) — L0-L3 四层
- [State 详解](./state.md) — frozen.json / state.json
