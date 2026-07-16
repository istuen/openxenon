---
redirectFrom:
  - /zh-cn/roadmap.html
title: 路线图
---

# 路线图

> OpenXenon 按 P0-P3 四阶段演进。当前版本：v0.1.2。

## P0-P3 路线图

| Phase | 目标 | 核心能力 | 一句价值主张 |
|---|---|---|---|
| **P0: Proof 轴独立** | Proof 闭环 | `oxn proof create / probe add / run` | "AI 说做完了？让 OXN 验收才算" |
| **P1: Intent 轴技术化** | Program Domain + Blueprint | 内置 ProgramContext；Blueprint 模板化 | "给 AI 一本编程词典和一个图纸" |
| **P2: Intent 轴业务化** | Business Domain + DDD | 业务 Domain 建模；团队共享意图空间 | "让业务语言统一，让团队意图对齐" |
| **P3: Intent 轴资产化** | 意图涌现 + Hall | 执行轨迹分析；意图候选自动生成 | "做过的项目，下次不用重来" |

### P0（当前已完成）

- Proof-First 入口：`oxn proof create / probe add / run / list / show`
- `frozen.json` 不可篡改
- AI 只能通过 CLI 操作 Proof

### P1（当前已完成）

- OXN Engine = DSL + Runtime + CLI
- Domain / Blueprint / Work / Task 全链路
- Program Domain 内置词汇表
- Daemon 守护进程 + 逃逸机制
- v1.1 `.work` 静态门禁卡 + planLock 4 组件 hash

### P2（当前进行中）

- Business Domain 建模（DDD）
- CI 门控：Probe 接入 `language-ban-checker`
- 团队共享意图空间（Git + `@prj` 引用）

### P3（规划中）

- 执行轨迹 → 意图空间变换
- 意图候选自动生成
- Hall（研讨厅）

---

## 自举验证

OpenXenon 用 OpenXenon 管理自己的开发过程：

| 级别 | 定义 | 状态 |
|---|---|---|
| L1 编译自举 | `bun run build` → `oxn` 可执行 | ✅ |
| L2 资产自举 | Domain / Blueprint / Work / Task 全链路跑通 | ✅ |
| L2+ DSL 自举 | Grammar → Schema → Validator → Generator 联动 | ✅ |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 P2 目标 |

---

## 两级涌现路径

OpenXenon 的能力升级不是自上而下灌输的，而是由痛点自下而上自然触发：

### 涌现 1：Proof → Blueprint

```
手动 Proof 1 次  → "AI 假完成被抓住了"       → Proof-First 价值成立
手动 Proof 5 次  → "每次都重复输同样 probe"    → 引出 Blueprint（Probe 模板化）
手动 Proof 10 次 → "能不能把 probe 存下来？"   → 引出 Domain（概念词汇化）
```

### 涌现 2：Program Domain → Business Domain

```
修 Bug          → "Blueprint + 内置 Domain 真方便"
做 3 个功能     → "Blueprint 里全是技术术语"
做 10 个功能    → "AI 理解了技术行话但不理解业务意图"
                ↓
        引入 Business Domain（DDD）
```

---

## 版本与变更

变更日志入口：[CHANGELOG.md](./changelog/CHANGELOG.md)（旧文档）

变更日志片段存放在 `.changes/` 目录，按版本号组织。发布新版本时运行：

```bash
bun run version:check
bun run version:sync
```

## → 参考

- [Introduction](../index.md) — OpenXenon 的愿景与定位
- 旧文档：[IAP 信号系统](./horizon/iap-as-signal-system.md)（旧 SSOT）
