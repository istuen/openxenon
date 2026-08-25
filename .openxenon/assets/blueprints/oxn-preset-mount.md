---
entity: blueprint
version: 0.3.0
name: oxn-preset-mount
abstract: |
  把 OpenXenon DSH agent preset 从「文件已 fork」推进到「DSH session 内 roster 可见 + smoke test 通过」的 4 阶段流水线。
  Work 实例化本 Blueprint 即"完成 DSH preset 的一次完整 mount 验证"。
  当前自举范围：仅 fix 4 阶段；设计上对应 shipped bug-fix-blueprint 的 4 slot 拓扑。
references: []
synced-at: 2026-08-14
---

# Blueprint: oxn-preset-mount

> OpenXenon preset mount 4 阶段流水线：diagnose（盘点现状）→ locate（定位 patch anchor）→ fix（产出本地文件 + apply.sh）→ verify（写 dev/oxn-preset-mount-guide.md 运行手册）。
>
> 命名说明：避免与 OpenXenon 通用 workflows 冲突，本 blueprint 专注于 DSH agent preset 这一具体场景。

## Use workflow

### fix-issue
- workflow: fix-issue

## Use domain

### DSHPresetMount
- domain: DSHPresetMount

## Use stack

### oxn-stack
- stack: oxn-stack

### git-stack
- stack: git-stack

## Boundaries

### diagnose
- observe: [fs-exists]
- operate: [read, ls]
- deps: []

### locate
- observe: [fs-content-match]
- operate: [grep, read]
- deps: [diagnose]

### fix
- observe: [fs-exists, lint-check]
- operate: [write, edit]
- deps: [locate]

### verify
- observe: [fs-exists, lint-check]
- operate: [biome-check, docs-build]
- deps: [fix]

### Scope

- allow: [.openxenon/works/oxn-preset-mount-validate/**, dev/oxn-preset-mount-guide.md]
- forbid: [~/.dsh/.agent-presets/**, ~/.config/dsh/**, packages/engine/src/kernel/**]
- desc: DSH preset mount 轨道；可改 work 内部 + dev/ 运行手册；禁改 DSH 部署路径 + Kernel IO 边界

### Context Template

- work-context:
  - business: 从 DSHPresetMount 提取术语 + invariants（Preset / Roster / IAP / StandingKey / MountValidate / GatingPlugin / SmokeWork）
  - implementation: 从 oxn-stack 提取工具 + 约束（write / edit / read / search 工具）
  - process: 4 boundary 拓扑（diagnose / locate / fix / verify）
  - goal: 完成 DSH preset mount 验证（filesystem → restart → inspect → smoke）
- task-context:
  - unit: 以 oxn-preset-mount 的 4 boundary 为单元
  - split: diagnose → locate → fix → verify
  - carry: 每个 Task 携带前序 Task 的输出物（fixtures.json → patch plan → 文件 + 脚本 → guide）
  - operations: 从每个 boundary 的 operate 数组提取执行参照
  - acceptance: 从每个 boundary 的 observe 数组提取验证标准
  - special: fix 阶段所有"firewall 写"必须封禁于仓库内,仅以 apply.sh 形式提交给工程师执行
