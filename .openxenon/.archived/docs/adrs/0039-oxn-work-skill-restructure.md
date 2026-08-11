---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0039: oxn-work Skill 重构（拆 5 references + 4 assets）

> **来源**：`docs_tmp/skill-1.md` (2026-07-03)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → v0.7-plus-roadmap 待办
<!-- /allow-version -->
> **影响层**：Skill 架构

## 决策（提案）

`oxn-work` Skill 当前 `instruction.md` 478 tokens，超出 AGENT.md ≤ 500 tokens 宪法线。应重构为：

```
oxn-work/
├── SKILL.md                       # ≤ 200 tokens（能力 + 触发场景 + 不适用边界）
├── references/
│   ├── blueprint-format.md        # blueprint.oxn 语法速查
│   ├── 8-phase-detail.md          # 8 阶段流程详解
│   ├── error-codes.md             # IAP_ALIGN_* 速查
│   ├── anti-patterns.md           # 反模式清单
│   └── v0-v1-migration.md         # V0→V1 布局迁移
├── assets/
│   ├── work-explore.oxn           # 探索 work 模板
│   ├── work-develop.oxn           # 开发 work 模板
│   ├── work-fix.oxn               # 修复 work 模板
│   └── work-onboarding.oxn        # 跨域编排模板
└── SKILL.md frontmatter:
    name, description (三段式), license
```

## 三段式 description

```yaml
description: |
  OpenXenon 通用 Work 协作入口（IAP 三阶段）
  
  适用场景：工程师新建 / 推进 / 收尾 work.oxn。
  
  不适用：单纯 CLI 调用（用 /oxn-cli）、纯 Proof 跑探针（用 /oxn-proof）。
```

## 现状

- ✅ CLI 输出安全边界（`instruction.md:461-469`）已落实
- ❌ Skill 重构未实施
- ❌ YAML frontmatter 全员缺失（路由器无法识别能力边界）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-03-skill-1.md`
- AGENTS.md Skills 段