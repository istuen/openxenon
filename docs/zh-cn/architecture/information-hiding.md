# 信息隐藏设计

信息隐藏是 OpenXenon 的核心设计原则。

## 核心原则

**AI 助手无法感知验证标准。**

## Part 四字段可见性

| 字段 | 可见性 | 含义 | 原因 |
|------|--------|------|------|
| `target` | 对 AI 可见 | 执行作用域 | AI 需要知道在哪里执行 |
| `action` | 对 AI 可见 | 执行指令 | AI 需要知道做什么 |
| `spec` | 对 AI 不可见 | 验收标准 | 防止 AI 针对性优化 |
| `probes` | 对 AI 不可见 | 验证逻辑 | 防止 AI 绕过验证 |

## 为什么隐藏 spec 和 probes？

### 1. 防止针对性优化

如果 AI 知道验收标准，可能"应试"而非真正解决问题：

```
AI 看到 spec: "必须使用 Prisma ORM"
    │
    ▼
AI 只在文件头部 import Prisma，但不实际使用
    │
    ▼
Probe 检查 fs_match("@prisma/client") → PASSED
    │
    ▼
但代码实际使用的是其他 ORM
```

### 2. 保持判定客观

验证逻辑由 Core 独占，AI 无法干预：

```
AI 不知道 probes 内容
    │
    ▼
AI 无法预测哪些检查会被执行
    │
    ▼
AI 必须真正完成任务，而非猜测检查点
```

### 3. 工程师掌控验收

验收标准是工程师的"底牌"，不应暴露给执行者：

```
工程师定义 spec + probes
    │
    ▼
Core 独占这些信息
    │
    ▼
AI 只看到 target + action
    │
    ▼
工程师验收时，用 spec + probes 检查
```

## taskNext 返回内容

```bash
oxn task next --task-id <id>
```

**返回**：

```
Part: create-user-model
Target: 在 src/models/ 目录下创建 User 模型
Action: 使用 Prisma ORM 创建 User 模型，包含 id、name、email 字段
```

**隐藏**：

```
# AI 无法看到以下内容
Spec: 必须使用 Prisma Client，字段类型正确，包含索引
Probes:
  - fs_exists: src/models/user.ts
  - fs_match: @prisma/client
  - shell_exec: npx prisma validate
```

## taskVerify 执行流程

```
AI 调用 taskVerify
    │
    ▼
Core 取出 Part.probes（AI 不知道具体内容）
    │
    ▼
Core 调用 Infra 执行物理观测
    │
    ▼
Core 调用 Kernel 纯函数判定
    │
    ▼
Core 返回判定结果（PASSED / FAILED）
```

**关键点**：

- AI 不知道哪些 Probe 会被执行
- AI 不知道 Probe 的参数
- AI 只知道最终结果

## 信息流图

```
┌─────────────────────────────────────────────────────────────┐
│                    信息流                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  工程师                                                      │
│    │                                                         │
│    ├── 定义 Blueprint                                        │
│    ├── 定义 Part (target/action/spec/probes)               │
│    └── 验收结果                                              │
│                                                              │
│  Core                                                        │
│    │                                                         │
│    ├── 独占 spec + probes                                    │
│    ├── 返回 target + action 给 AI                           │
│    └── 执行 probes 验证 Artifact                             │
│                                                              │
│  AI 助手                                                     │
│    │                                                         │
│    ├── 只看到 target + action                               │
│    ├── 执行操作                                              │
│    └── 构建 Artifact                                         │
│    │                                                         │
│    └── 不知道 spec + probes                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 对抗性设计

信息隐藏是一种对抗性设计，假设 AI 可能尝试绕过验证：

| AI 行为 | 信息隐藏如何防御 |
|---------|-----------------|
| 针对性优化 | 不知道验收标准，无法针对性优化 |
| 绕过检查 | 不知道 probes 内容，无法预测检查点 |
| 撒谎声称完成 | Core 用物理观测验证，不采信 AI 声明 |

## 总结

信息隐藏确保：

- **AI 无法感知验证标准**
- **Core 独占验证逻辑**
- **工程师掌控验收**

这是 OpenXenon 实现"确定性构建"的核心机制。