---
version: 0.7.3
date: 2026-07-17
type: minor
rfc:
  - .openxenon/docs/rfcs/v0.7.3-ideal-data-flow-rfc.md
adr:
  - .openxenon/docs/adrs/0061-data-flow-contract.md
---

# 0.7.3 — 理想态数据流 runtime 闭环（P0 alpha.1 + P1 alpha.2）

> 本 changelog 记录 v0.7.3 理想态数据流 RFC 的 **P0 alpha.1 + P1 alpha.2** 落地：
> P0 = ADR-0061 立法 + RFC 定稿；P1 = F1 + F2 修复（BlueprintIR + Domain language 注入）。
> P2-P8 渐进落地（mdast 切换 + 多视角 + DAG 校验 + Stack 注入 + deprecation warn + ADR 状态更新）
> 将在后续 alpha.3 / beta.1 / GA 各 changelog 记录。

## P0 核心交付

### RFC 定稿

- **`.openxenon/docs/rfcs/v0.7.3-ideal-data-flow-rfc.md`** 从 `pools/drafts/` 提升并定稿（状态 `📝 Draft` → `🟢 Accepted`）
- 4 个数据流断裂点（F1-F4）+ 7 个决策（D1-D7）全部锁定

### ADR-0061 立法

- **`.openxenon/docs/adrs/0061-data-flow-contract.md`** 新建（状态 🟢 Accepted）
- 数据流契约：Blueprint → Work → Task runtime integration
- 整合 RFC §2（理想态数据流）+ §3（D1-D7 决策）+ §4（P0-P8 phased landing）+ §5（非功能约束）
- 跨引用：ADR-0054（三边界框架）+ ADR-0055（Blueprint 组合模板）+ ADR-0060（Domain 词汇边界）

### ADR INDEX 更新

- `.openxenon/docs/adrs/INDEX.md` §4 Work/Asset 分类追加 ADR-0061 条目
- ADR 落地状态表追加 ADR-0061 行（v0.7.3 P1-P8 渐进落地，指向 `docs/zh-cn/work.md` 数据流段）

## 承接 Work

- **`.openxenon/works/v073-ideal-data-flow/`** — P0 已 lock + run + submit（implement part passed）
- 后续 P1-P8 将在同一 Work 下追加 task，按 RFC §4 phased landing 推进

## P1-P8 路线图（占位 · 待后续 changelog 记录）

| Phase | 内容 | 版本 | 状态 |
|---|---|---|---|
| P1 | `work-context-builder.ts` 读 `blueprints.json`，注入 `BlueprintIR` + 边界 Domain IR | v0.7.3-alpha.2 | ✅ 已落 |
| P2 | Domain 注入路径 regex → mdast 切换 | v0.7.3-alpha.2 | ⏳ 待启动 |
| P3 | Task 多 Domain 主/背景视角注入；`## Allowed Language` 渲染格式升级 | v0.7.3-alpha.3 | ⏳ 待启动 |
| P4 | Boundary.observe 与 Task.probes lock 期校验 | v0.7.3-alpha.3 | ⏳ 待启动 |
| P5 | Workflow.slot DAG 与 Task.deps DAG 闭包校验 | v0.7.3-beta.1 | ⏳ 待启动 |
| P6 | Stack.tools 注入 ProbeRunner | v0.7.3-beta.1 | ⏳ 待启动 |
| P7 | Work `## Refs` 旧 `kind: domain` deprecation warn | v0.7.3 | ⏳ 待启动 |
| P8 | ADR-0054/0055/0060 标注"runtime 已实现" | v0.7.3 | ⏳ 待启动 |

## P1 alpha.2 核心交付

### 修复点（RFC §1）

- **F1 修复**：`work-context-builder.ts` 现在真正读 `works/<w>/blueprints.json`
  - 新增 `loadPerWorkBlueprints(projectRoot, workName)` helper（包装 `loadPerWorkBlueprintsIndex`）
  - 新增 `summarizeBlueprints(idx)` 把 PerWorkBlueprintsIndex 压成 BlueprintIRSummary
  - WorkContextResult 新增 `blueprintIR?: BlueprintIRSummary` 字段
- **F2 修复**：从 Blueprint 边界 refs 加载 Domain language
  - 新增 `loadDomainLanguagesFromBlueprint(blueprintIR, projectRoot)` helper
  - 解析 Blueprint `domainRefs[]` → 读 Domain 文件 → 注入 `language{terms,bans,invariants}`
  - WorkContextResult 新增 `domainLanguages?: DomainLanguageEntry[]` 字段
  - **backward compat**：blueprints.json 缺失 → 不注入新字段（老 Work 兼容）

### CLI 端 mirror

- `packages/cli/src/commands/work.ts` 的 `work context` 命令镜像 engine 修复
- 同样的 F1+F2 逻辑 inline 应用（CLI 有独立输出 schema `level/workContext`）
- 避免单点修复：engine + CLI 双端注入

### 测试覆盖

- 6 个新测试 in `packages/engine/src/Work/__tests__/work-context-builder.test.ts`：
  - F1: `blueprints.json` 存在 → context 含 `blueprintIR` 字段
  - F2: blueprint domainRefs 引用的 Domain → language 被加载
  - backcompat: `blueprints.json` 缺失 → 字段省略（老 Work 兼容）
  - boundary: blueprint 引用不存在的 Domain → 跳过该条目（不抛错）
  - helper: `loadPerWorkBlueprints` 直接读取 + 解析
  - helper: `loadPerWorkBlueprints` 文件不存在 → 返回 null

### 验收门槛

- `bun test`：1538 pass / 3 skip / 0 fail
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- `oxn work context v073-ideal-data-flow --json` 输出含 `blueprintIR` + `domainLanguages` 字段

### 已知边界

- P1 仅修复 engine `work-context-builder.ts` + CLI `work context`；不涉及 task-level F3（F3 是 P3 范围）
- `oxn-domain terms=[]` 现象源于 `readDomainFile` 解析 bug（RFC §1 §2.3 注；P2 修）

## 验收门槛

- P0：`oxn work status v073-ideal-data-flow` 显示 planLock + 5 tasks 注册（4 default + p0-rfc-finalize）
- 后续 phase：每 phase 完成后追加 changelog 段；最终 GA 时合并所有 alpha/beta changelog
- 全程：`bun test` + `bun run typecheck` + `bun run lint` + `bun scripts/validate-dependencies.ts` 全绿