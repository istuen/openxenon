---
version: 0.6.3
prerelease: false
date: 2026-08-02
type: feature
scope: draft-promote-actual-write
status: pending
---

# 0.6.3: Draft Promote 实际写文件（RFC-0019 NG6 落地）

## 主题

v0.6.2-alpha.3 的 `oxn draft promote` 仅返回 dispatch 信息（subTarget + targetPath），不实际写目标文件。v0.6.3 起支持 `--commit` 标志，**真正写目标文件**，完成 RFC-0019 NG6 决议。

## 范围

### 新增

**Engine 模块**：
- `packages/engine/src/Draft/promote-dispatch.ts` — 7 sub-target 实际写文件
  - 自动 RFC-XXXX 编号（基于 `docs/rfc/zh-cn/` 扫描 max+1）
  - 5 AssetKind per-kind frontmatter（domain PascalCase / 其他 kebab-case）
  - Work 含 entity=work + workId + intent
  - 冲突检测（默认拒绝覆盖）
  - 事务语义（写失败回滚）

**Engine 扩展**：
- `packages/engine/src/Draft/promote.ts` 增 3 字段：
  - `commit?: boolean` — 默认 false（v0.6.2-alpha.3 兼容）
  - `force?: boolean` — 默认 false（拒绝覆盖）
  - `rfcNumber: string | null` — 仅 target=rfc 有意义
  - `phases.commit?: { filePath, bytesWritten, created }` — 实际写文件结果
- 3 新错误码：`OXN_DRAFT_PROMOTE_TARGET_EXISTS` / `OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED` / `OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID`

**CLI 扩展**：
- `oxn draft promote --commit` — v0.6.3 NG6
- `oxn draft promote --force` — 覆盖已存在的目标文件
- 输出区分 v0.6.2-alpha.3 vs v0.6.3 模式

**测试**（17 件）：
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts`
  - 6 RFC 测试（编号 / 递增 / 默认起始 / force / 自动创建子目录）
  - 7 Asset 测试（5 kind + PascalCase + 冲突）
  - 2 Work 测试（路径 + 子目录）
  - 2 edge case（unknown combo + trim）

### 修复

- `docs/rfcs/zh-cn/RFC-0019-draft-promote-routing.md` 从 `docs/rfcs/`（错误路径）move 到 `docs/rfc/zh-cn/`（canonical 路径）

### 测试统计

| 阶段 | 累计 |
|---|---|
| v0.6.2-alpha.3 | 1864 pass |
| v0.6.3 NG6 (+17) | **1881 pass / 0 fail / 3 skip** |

## 不破坏

- v0.6.2-alpha.3 行为不变：`oxn draft promote` 默认不写（仅返回 dispatch info）
- v0.6.2 4 命令 + 2 旧 promote 蓝图逻辑不动
- 4 归档 Blueprint 路径不变

## 不实现（明确推迟）

- NG1-NG5 全部延续 RFC-0019 锁定（v0.7.x 评估）

## RFC-0019 实施状态更新

| 决议 | 状态 |
|---|---|
| D1-D7 + G1-G7 | ✅ |
| NG1 (AI 推断) | ⏸ v0.7.x |
| NG2 (多人协同) | ⏸ v0.7.x |
| NG3 (changelog 集成) | ⏸ v0.7.x |
| NG4 (Per-target Probe) | ⏸ v0.7.x |
| NG5 (.openxenon/assets/ git) | ⏸ 团队治理 RFC |
| **NG6 (Promote 实际写文件)** | ✅ **v0.6.3** |

## 端到端验证（demo）

| Test | Result |
|---|---|
| RFC draft → `oxn draft promote --commit` | ✅ `docs/rfc/zh-cn/RFC-0020-ng6-real.md` 实际写入 |
| Asset+domain → `oxn draft promote --commit` | ✅ `.openxenon/assets/domains/Ng6DomainTest.md` 实际写入 (PascalCase) |
| Asset+roadmap → `oxn draft promote --commit` | ✅ `.openxenon/assets/assetmaps/ng6-roadmap.md` 实际写入 (assetmaps 路径) |
| Work → `oxn draft promote --commit` | ✅ `.openxenon/works/ng6-work/work.md` 实际写入 (子目录自动创建) |
| `--force` 覆盖 | ✅ mtime 更新，`created: false` |

## 关联文档

- RFC-0019-draft-promote-routing.md
- `.openxenon/assets/blueprints/draft-promote-router.md`
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md`
- `.openxenon/assets/domains/oxn-draft-promote-domain.md`