# Onboarding 冷启动方案（实践盘问产出）

> **日期**：2026-07-23
> **来源**：实践盘问 #1-#2（grilling session 转入实践阶段）
> **状态**：📝 候选 RFC（待 promote 为 v0.7.x onboarding RFC）
> **关联**：ADR-0050（Starter Work 引导）+ ADR-0078（边界工程）+ ADR-0079（Asset = Ontology）

## 问题

`oxn init` 后用户面对空状态——没有 Asset、没有可引用的 Blueprint、不知道该写什么。冷启动断裂。

根因：Asset 是 AI 的边界参照，但**谁给工程师创建第一个 Asset 的参照**？递归问题——Asset 帮 AI 聚焦，但工程师在创建第一个 Asset 时没有参照。

## 方案

### 三件套

```
Meta Assets（builtin，AI 的参照教材）
    │
    ├── onboarding-greenfield Blueprint（新项目）
    └── onboarding-brownfield Blueprint（旧项目）
    │
    ▼
Starter Work（用户跑第一个 Work）
    │
    ▼
AI Agent 读 Meta Assets + Blueprint → 引导用户创建 Asset 套件
    │
    ▼
用户拥有可用的 Domain/Workflow/Stack/Blueprint
    │
    ▼
可以创建真正的 Work 了
```

### 1. Meta Asset 套件

**定位**：不是描述 OXN 自身，是描述"如何写 Asset"——Asset 的 Ontology 用 Asset 形式表达（递归自举）。

**三件**：

| Meta Asset | 内容 |
|---|---|
| **Domain: asset-authoring** | 术语（Asset/Term/Invariant/Boundary/Slot）+ 不变量（声明式/无环 DAG/边界线索非知识）+ 边界（Asset 是什么/不是什么） |
| **Workflow: asset-lifecycle** | 状态（draft→published→deprecated）+ 角色（engineer/ai-agent）+ 步骤（create→validate→publish→iterate） |
| **Stack: md-asset-format** | 格式约定（H1/H2/H3 嵌套列表）+ 版本规则 + 命名约定 + 引用规则（@term/X / @upstream） |

### 2. 双 Blueprint

| 维度 | greenfield Blueprint | brownfield Blueprint |
|---|---|---|
| 来源 | 工程师输入（对话式引导） | 旧项目代码/文档 |
| 第一步 | AI 对话问技术栈/概念/流程 | AI 读代码库理解业务 |
| Asset 生成 | AI 帮用户从零写 | AI 从代码抽离 draft Asset |
| 确认 | 用户实时确认 | 用户 review draft Asset |
| 交互模型 | 相同——Work + Skill 驱动对话 | 相同 |

**核心差异**：来源不同。greenfield 来源是工程师输入，brownfield 来源是旧项目代码。两者都是 LLM Agent 解读后抽离 Asset，再让工程师确认/调整。

**旧项目定位**：旧项目是"特殊起点"——介入旧项目当时的状态作为 OXN 的起点。AI 读代码 → 抽离 Asset → 工程师确认。

### 3. 交互模型

OXN 的主交互不是 CLI wizard，是 **OpenCode/Codex 对话框 + Skill**：

```
用户在对话框："帮我开始用 OXN"
    │
    ▼
AI Agent 加载 oxn-work skill（init 时已编译）
    │
    │  Skill 指引 AI：
    │  1. 读 builtin onboarding Blueprint
    │  2. 创建 Starter Work
    │  3. Work 的 Task Context 引用 Meta Assets 作为参照
    ▼
AI 对话引导用户走每个 Task
    │
    ├── Task 1: 技术栈 → 创建 Stack
    ├── Task 2: 核心概念 → 创建 Domain
    ├── Task 3: 工作流程 → 创建 Workflow
    └── Task 4: 组合 → 创建 Blueprint
    │
    ▼
用户拥有可用 Asset 套件
```

**关键点**：引导不是 CLI wizard，是 Skill 驱动的对话。AI 读 Meta Assets 作为参照，对话式帮用户创建 Asset。Meta Assets 是 AI 的"教材"，用户是"学生"，AI 是"助教"。

完全符合 Referent 模式——Meta Assets 是 AI 的边界参照（教 AI 怎么帮用户写 Asset），AI 用自有知识 + Meta Asset 参照引导用户。

## 与现有体系的关系

| 关联 | 说明 |
|---|---|
| ADR-0050 | 原设想"通过 Starter Work 引导"，本方案是 ADR-0050 的具体落地 |
| ADR-0078 | Meta Asset 是边界工程的自举——用边界线索教怎么写边界线索 |
| ADR-0079 | Meta Asset 是"定义 Ontology 的 Ontology"——递归自举 |
| oxn-work skill | 引导 Work 的执行引擎——Skill 驱动对话 |
| builtin blueprints | 现有 `git-workflow.md` 是工作类 Blueprint；onboarding 是新类别 |

## 落地步骤（待排期）

1. 创建 Meta Asset 三件套（`src/builtin/assets/`）
2. 创建 onboarding-greenfield Blueprint（`src/builtin/blueprints/`）
3. 创建 onboarding-brownfield Blueprint（`src/builtin/blueprints/`）
4. 更新 oxn-work skill 支持引导 Work 模式
5. `oxn init` 输出提示 onboarding Work 路径
