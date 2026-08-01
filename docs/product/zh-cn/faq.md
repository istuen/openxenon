---
redirectFrom:
  - /zh-cn/faq.html
title: 常见问题
---

# 常见问题

## 概念篇

### OpenXenon 和 GitHub Copilot / Cursor 有什么区别？

OpenXenon 不替代 AI 编码工具。它是在 AI 完成代码后**独立验证结果**的引擎。Copilot 帮你写代码，OXN 帮你证明代码对了。

### OXN 会评判 AI 的工作是否合格吗？

**彻底不判**。OXN 验证 AI Agent 的执行结果（ProbeOutcome 三态：COMPLETED / DEVIATED / INCONCLUSIVE），不评判执行内容的好坏。判定权归工程师，基于 outcome 聚合结构（各状态 Probe 数量）自行判定。

### 一定要先学 Domain + Blueprint 才能用吗？

不需要。入口是 [Proof-First](./quickstart.md)：直接 `oxn proof create` → `oxn proof probe add` → `oxn proof run`，5 分钟跑通。

### IAP 范式是强制的吗？可以只用 Proof 吗？

可以。`oxn proof` 系列命令是 E3 Proof 独立运作，不依赖 Domain / Blueprint。详见 [Quickstart](./quickstart.md)。

### Domain 和 Blueprint 有什么区别？

Domain = 业务词典（说什么 / 不能说什么），Blueprint = 技术模板（分几步做）。两者正交，不互相引用。

---

## 安装与配置篇

### 需要 Node.js 吗？

不需要。OpenXenon 基于 [Bun](https://bun.sh) 构建，只需要 Bun >= 1.0.0。

### `oxn init` 做了什么？

创建 `.openxenon/` 项目边界目录，包含 `config.json`、`domains/`、`blueprints/`、`works/` 等子目录。

### 如何在不同 AI 助手中使用？

```bash
oxn init --ai cursor     # Cursor Skill
oxn init --ai opencode   # OpenCode Skill
oxn init --ai codex      # Codex Skill
```

AI 通过 Skill 协议调用 CLI。详见 Work 协作协议。

---

## 使用篇

### frozen.json 能改吗？

不能。frozen.json 是 OXN Engine 签发的检验报告，AI 和工程师都只能读。如果 AI 能改 frozen.json，Proof 就名存实亡。

### lock 之后修改 work.md 会怎样？

触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`。需要 `oxn work unlock` → 修改 → `oxn work lock` 重新冻结。

### 有多少个内置 Probe？

11 个：`fs-exists`、`fs-not-exists`、`fs-content-match`、`fs-parseable`、`shell-exec`、`test-pass`、`ts-compiles`、`lint-check`、`deps-resolved`、`http-responds`、`file-exports`。详见 [Proof](./concepts/proof.md)。

### Work 和 Task 的关系？

Work = 编排器（声明 ref 池 + 编排 task DAG），Task = 执行单元（1 Blueprint + N Parts）。1 个 Work 可以有多个 Task。

### Part 和 Probe 的区别？

Part = 执行步骤（AI 可见的 `skill_context`），Probe = 验收标准（AI **不可见**的验证逻辑）。Part 内联 Probe。

---

## 故障排查篇

### `OXN_NO_PROJECT`

项目未初始化。运行 `oxn init`。

### `OXN_TASK_OXN_MISSING`

Task 声明在 work.md 中但对应的 task.md 不存在。运行 `oxn work add-task`。

### `OXN_WORK_ALREADY_EXISTS`

Work 已运行。先用 `oxn work status` 看当前状态。

### `IAP_ALIGN_LOCK_NOT_FOUND`

未锁定 work。运行 `oxn work validate` → `oxn work lock`。

### `IAP_ALIGN_LOCK_HASH_MISMATCH`

锁后资产（.md 文件）被修改。确定修改合理后用 `oxn work unlock` → 重 `lock`。

完整错误码速查见 [CLI](./reference/cli-user-guide.md#错误码速查)。

---

## 进阶篇

### 如何自定义 Probe？

在 Part 内联声明，或用 `ref` 引用自定义探针。详见 [Extending](/dev/zh-cn/extending/custom-probe.html)。

### 如何集成 CI？

```bash
# 常见问题
oxn domain validate MemberContext
oxn blueprint validate dev-workflow
oxn work validate onboarding --json
oxn proof run check-deploy
```

### 能跨项目共享 Domain 吗？

当前通过 Git 仓库级别共享。`@prj` 引用项目内资产。跨项目的 `@glo` 已废弃。

---

## 迁移篇

### v0→v1 怎么迁移？

```bash
oxn work migrate <work-name>
# 常见问题
```

### 废弃了哪些术语？

`noun` → `term`，`verb` → 已删除，`domain_rules` → `invariant`，`expectation` / `rule` → Probe 承载，`stage` → `slot`，`@glo` → `@prj`。完整列表见 [Glossary](./concepts/glossary.md)。
