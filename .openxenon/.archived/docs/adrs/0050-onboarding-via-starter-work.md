# ADR-0050: Onboarding via Starter Work

> **来源**：v0.6.3 Asset Paper Schema RFC §0.2
> **抽取日**：2026-07-05
> **状态**：Adopted
> **影响层**：L3-CLI（`oxn init` + `oxn work create`）

## 决策

新项目引导不再使用 5 步交互向导，改为通过 **starter-work**（一个 Asset 模式 Work）自动产出 starter Asset。

## 决策背景

v0.7.x Memory RFC 计划用 5 步交互向导（`oxn memory onboard`）引导新项目：
1. Project Type
2. Tech Stack
3. Business Domain
4. Auto-Discovery
5. Memory Write

**问题**：引入新概念（"onboarding step"）+ 独立子命令 + 不走 IAP 闭环。

**正确做法**：让 `oxn init --ai <agent>` 自动生成 starter-work，AI 跑 IAP 产出 starter Asset。

## 实现

```bash
# 1. 初始化项目
$ oxn init --ai opencode
# → .openxenon/ 创建
# → 自动创建 starter-work: w-onboarding-<timestamp>
# → Work 类型: asset (--type asset)
# → Work intent: "生成项目 starter Asset（Domain/Blueprint/Stack 模板）"

# 2. AI 跑 IAP 闭环
# Intent: 生成 starter Asset
# Align:
#   1. read_file(README.md) → 推断项目类型
#   2. read_file(package.json) → 推断 tech stack
#   3. read_file(src/) → 推断业务领域
#   4. 生成 .openxenon/assets/domain/<Name>.oxn (kebab-case)
#   5. 生成 .openxenon/assets/blueprint/dev-workflow.oxn
#   6. 生成 .openxenon/assets/stack/<Name>.oxn
# Proof:
#   → oxn domain validate <Name>
#   → oxn blueprint validate dev-workflow
#   → oxn stack validate <Name>
#   → planLock 重算

# 3. 完成后
# → starter-work finalize
# → 3 个 starter Asset 落盘（chmod 0o444）
# → 工程师可直接基于这些 Asset 创建新 Work
```

## 与 v0.6.x `oxn init` 的差异

| 维度 | v0.6.x | v0.7.x（新）|
|---|---|---|
| init 输出 | `.openxenon/` 目录结构 | `.openxenon/` + 自动 starter-work |
| Asset 生成 | 手动 `oxn domain create` | starter-work IAP 自动产出 |
| 引导方式 | 工程师手动 | AI 通过 IAP 闭环引导 |
| 一次性产物 | 无 | starter Asset（domain + blueprint + stack）|
| Work ID 标识 | 无 | `w-onboarding-<timestamp>` |

## 验证

```bash
# 跑完后验证
$ oxn work list
w-onboarding-2026-09-15-001   ✅ finalized  asset   [starter]
$ oxn asset list
domain/myapp-domain.oxn         ✅ created by w-onboarding-...
blueprint/dev-workflow.oxn      ✅ created by w-onboarding-...
stack/myapp-stack.oxn           ✅ created by w-onboarding-...
```

## 后果

- ✅ Onboarding 走标准 Work 流程（IAP 闭环）
- ✅ 无需独立"onboarding"概念
- ✅ starter Asset 可立即被后续 Work 引用（context.md 自动注入）
- ✅ 工程师可重跑 `oxn work run w-onboarding-...` 重新生成 starter
- ⚠ 需要 AI 正确推断项目类型（README + package.json 扫描）

## 反模式

- ❌ 5 步交互向导（增加新概念）
- ❌ 独立 `oxn memory onboard` 子命令
- ❌ 跳过 Work 直接写 Asset（失去 IAP 闭环）

## 参考

- v0.6.3 Asset Paper Schema RFC §0.2
- ADR-0049 Work/context.md 设计
- v0.7.x Memory RFC §3（被反弹的 5 步 wizard）