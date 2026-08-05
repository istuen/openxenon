# ADR-0026: Skills 三分（oxn-intent / oxn-align / oxn-proof）

> **来源**：`docs_tmp/ssot-domain-1.md` (2026-06-17)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：Skill 架构

## 决策

OXN Skill 按 IAP 三阶段三分：

| Skill | 对应 IAP | 职责 |
|---|---|---|
| **`/oxn-intent`** | Intent | Domain / Blueprint / 文档创建 + 链接 + 校验 |
| **`/oxn-align`** | Align | Work 执行（dev / fix / explore / onboarding） |
| **`/oxn-proof`** | Proof | 探针 + frozen.json + verdict |

## 当前映射

AGENTS.md 当前已落实：
- `/oxn-cli` — 通用 CLI 操作
- `/oxn-work` — Work 全流程（含 align）
- `/oxn-proof` — Proof 模式（已存在）

## 差距

- ⚠️ `/oxn-intent` 未独立（Domain / 文档创建散落在 `/oxn-work`）
- 🔗 建议未来拆分 `/oxn-intent` 为独立 Skill

## 候选落地

- `AGENTS.md` Skills 段增补 /oxn-intent 说明
<!-- allow-version -->
- `.opencode/skills/oxn-intent/SKILL.md` 新增（v0.7+）
<!-- /allow-version -->

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-17-ssot-domain-1.md`