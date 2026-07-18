---
redirectFrom:
  - /zh-cn/llm-prompt.html
title: AI 协作者入口
---

# AI 协作者入口

> ⚠️ **FOR AI AGENTS ONLY**
> 人类读者请从根 [README.md](https://github.com/istuen/openxenon#readme) 入口，或 docs/ 下的 [index.md](./_index.md) 入口。

## 你是谁

你正在协助一名 OpenXenon 工程师。OpenXenon 是一款轻量级人机协作工具，核心范式是 IAP（Intent–Align–Proof），核心引擎叫 OXN Engine。

> **OpenXenon —— 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**

**IAP 三阶段**：
- **Intent（定意图，工程师主权）**：Domain 锁定业务语言、Blueprint 锁定技术拓扑
- **Align（跑对齐，AI Agent 主权）**：你 —— 在 Blueprint slot 边界内编排 Work/Task/Part
- **Proof（出证明，OXN Engine 主权）**：独立产出不可篡改 `frozen.json` + `verdict.md`（**记录客观事实，不评判工作合格**）

## 必读章节

1. **[Core Concepts](./concepts/iap-paradigm.md)** — 必读，理解 IAP 三轴
2. **[Quickstart](./quickstart.md)** — 看一次，但不要复现
3. **[Align](./align.md)** — AI 协作协议
4. **[CLI](./reference/cli-user-guide.md)** — CLI 白名单

## CLI 白名单

✅ 允许调用：
- `oxn proof create|probe add|run|list|show`
- `oxn work context|create|add-task|run|submit|status|validate|list-tasks|task-status|task-edit|lock|unlock|migrate`
- `oxn blueprint create|validate|list`
- `oxn domain create|validate|list`
- `oxn dev compile|unpack|validate|migrate-yaml|promote`

❌ 禁止：
- 直接读/写 `.openxenon/proofs/*/frozen.json`
- 直接读/写 `.openxenon/works/*/state.json`
- 直接读/写 `.openxenon/works/*/tasks/*/frozen.json`
- 修改 Domain 术语或 Blueprint 规则
- 使用 `--force` 绕过 Proof
- 在 lock 之后修改任何 `.md` 资产（触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`）

## 工作流

1. `oxn work context --work <w> --task <t> --json` 获取上下文
2. 严格遵守 `allowedLanguage`（必须用 term、避开 ban）
3. 按 `taskParts` 顺序写代码
4. 每个 part 完成后 `oxn work submit --work <w> --task <t> --json`
5. 读 `frozen.json` 中的 verdict 决定下一步

## 失败处理

- Verdict PASS → 进入下一 part 或结束 task
- Verdict FAIL → 读 frozen.json 的 expected/actual，修复后重跑
- `IAPError` → 查看 [CLI §错误码速查](./reference/cli-user-guide.md#错误码速查)
- `IAP_ALIGN_LOCK_HASH_MISMATCH` → 锁后资产漂移，报告工程师退回

## 输出格式

- 代码改动引用 `file_path:line_number`
- 完成状态附 `oxn work status --json` 输出
- 遇到不可恢复错误时，报告具体错误码并暂停
