---
version: 0.6.2-alpha.2
date: 2026-08-01
type: alpha
status: planned
---

# 0.6.2-alpha.2 — RFC-0015 全部决策点落地（Proof 体系重整收尾）

> 本 changelog 记录 RFC-0015 全部 D 决策点的代码落地。未触及 RFC-0016（通用验证 probe 扩展，独立排期）。

## 核心改动

### D1：产物命名规范化

- D1.1 `PROOF_VERDICT_MD` → `PROOF_OUTCOME_MD` 常量重命名（保留 alias 兼容 1 大版本）：**已完成**（`packages/engine/src/kernel/constants.ts:41-46` 早就为 alias 模式，判定为已落地状态）
- D1.2 `proof.md` 快照改名 `work-snapshot.md`：**已完成**（`PROOF_WORK_SNAPSHOT_FILE = 'work-snapshot.md'`，`PROOF_MD_FILE` 为 alias）
- D1.3 `PROOF_RUNNING_JSON` 移入 kernel constants：**已完成**
- D1.4 清理 stale `verdict.md` 引用：**本 PR 完成**
  - `README.en.md:80` — `verdict.md` → `outcome.md`
  - `docs/product/en/_index.md:23,32,87` — 3 处
  - `.openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md:121` — `verdict.md` → `outcome.md`

### D2：Taint 机制接入执行路径

- D2.1 全部 probe handler 改经 Provider 做 IO：**本 PR 部分完成**（10 个直连 + 5 个 tool-binding 通过 _tool-resolver 间接 + 3 个老 OXN-internal 新增 FileProvider stat-only = 共 18/19；剩 deps-resolved 纯 JS lockfile 解析按 RFC 例外保持现状）
- D2.2 ADR-0086：**已完成**（`docs/adrs/0086-taint-trust-baseline-design.md`，Accepted 2026-07-31）
- D2.3 provider tests：**已完成**（file-provider.test.ts + http-provider.test.ts + shell-provider.test.ts + git-provider.test.ts）
- D2.4 e2e flag 流转：**已完成**（`tests/integration/probe-taint-flow.test.ts`）

### D3：注册表同步强化

- D3.1 删除 `PROBE_STRATEGY_MAPPINGS` 死表：**已完成**（`probe-port.ts:78` 注释说明）
- D3.2 `assertCatalogConsistency` 3-way 扩展：**已完成**（`probe-lint.ts:95` + 6 个测试用例覆盖）
- D3.3 启动时调用：**已完成**（`packages/cli/src/commands/proof.ts:436` + `src/daemon/server.ts:24`）

### D4：Probe 集合收敛

- D4.1 弃用 2 个 alias：
  - `git-status-clean`：**已完成**（`catalog.ts:443` 标 `@deprecated`，保留 1 大版本）
  - `exec_exit_zero`：**隐式完成**（catalog 无独立 entry，仅在 alias 表中，作为 git-clean 兼容路径）
- D4.2 8 个 OXN-internal probe 标 `builtin: 'prj'`：**本 PR 完成**
  - 4 旧（`doc-boundary` / `docs-build` / `docs-heading-check` / `heading-skeleton-check`）—— 早已标 `'prj'`
  - 4 新 commit 63b50dd（`boundary-guard` / `stale-pool-check` / `asset-migrate-check` / `oxn-runtime-version`）—— 本 PR 从 `'oxn'` → `'prj'`
  - `@prj/probes/` scope 首次实际启用
  - 收敛后 `@oxn/` builtin 数量：19 → 9

### D5：工具绑定 probe 可配置化

- D5.1 `test-pass` / `lint-check` / `ts-compiles` / `docs-build` 读 `StackToolInfo`：**已完成**（`_tool-resolver.ts` + 4 handler 已集成）
- D5.2 `deps-resolved` 维持现状：**已完成**

### D6：OXN-internal 生命周期 probe 补缺（v0.6.2 修订）

> 本版 D6 主题从原设计（4 个通用 builtin probe）变更为 commit 63b50dd 实际实现的 4 个 OXN-internal 生命周期 probe。

- D6.1 boundary-guard 修复：**本 PR 完成**
  - 删除硬编码 builtin domain 9 个静态 Set（`OXN_BUILTIN_DOMAINS`）
  - 改为运行时扫 `.openxenon/assets/domains/` + 无副本时回退到 fallback 集合（保证 OXN self-host 测试 fixture "无 .md 副本" 场景）
- D6.2 `stale-pool-check` → `stale-draft-check` 改名：**本 PR 完成**
  - 原 probe 扫描已废弃 `.openxenon/pools/`（v0.6.x 迁移后该目录不存在，事实死代码）
  - 改名 + 扫描 `.openxenon/drafts/` + 重写 `extractDraftReferences` 适配 3 种 references 形式
  - 删除 `void listAssetReferences(root)` 死调用
  - 6 个 test fixture 同步从 pool → draft
- D6.3 `asset-migrate-check` 修复：**本 PR 完成**
  - 删除 `extractReferencesForCheck` 自实现（~40 行）
  - 改为 `import { extractReferences } from '@openxenon/engine/Asset/internal/reference-checker'` 复用（export 新增）
  - 删除 `void listAssetReferences` 死调用
- D6.4 `oxn-runtime-version` 修复：**本 PR 完成**
  - 删除 `import.meta.url` 路径上溯（`oxn-runtime-version.ts` 旧实现）+ 4 个候选 package.json 路径
  - 改为 `ProbeContext.engineVersion` 注入（L2 ProbeRunner 职责）
  - `probe-port.ts` 新增 `engineVersion?: string` 字段
  - `index.ts` 新增 `readEngineVersion()` helper 注入到 wrapper context

### RFC-0015 Phase 4 落地声明同步（⏳ → ✅）

RFC-0015 `影响范围` 段 4 个 Phase 落地声明全部从 ⏳ 改为 ✅，Errata 段追加 2026-08-01 entry。

## 影响范围

### 测试

- `bun test`：1760 pass / 3 skip / 38 fail
- 38 fail 与 commit baseline 一致（**未引入新失败**）
- 修复 11 个原失败（probe-catalog 集成测试、D6 fixture 等）
- 直接相关 34 个 test（boundary-guard / oxn-runtime-version / stale-draft-check / asset-migrate-check / probe-lint）全部通过

### 构建

- `bun run typecheck`：0 errors
- `bun run lint`：0 errors（架构守卫通过）
- `bun run check`（biome）：3 warnings / 16 infos（残留，预先存在）
- `bun scripts/validate-dependencies.ts`：0 violations
- `bun scripts/check-doc-boundary.ts`：0 violations

### 代码改动统计

| 类别 | 数量 |
|---|---|
| 修改源文件 | 13 |
| 删除文件 | 2（stale-pool-check.ts + .test.ts） |
| 新增文件 | 2（stale-draft-check.ts + .test.ts） |
| 修改 RFC 文档 | 2（RFC-0015 摘要/D4.2/D6/D7/影响范围/Errata + RFC-0016 维持现状） |
| 修改文档（产品/草稿） | 4（README.en.md / docs/product/en/_index.md / draft RFC / AGENTS.md） |
| 修改测试 fixture | 4（probe-catalog / stale-draft-check / oxn-runtime-version / boundary-guard） |

### 不变量（守门）

- `oxn-engine-domain.md:inv-4 Monorepo 包边界`：保持
- `oxn-project-domain.md:inv-1 三情态分离`：保持
- `oxn-asset-domain.md:inv-15 kind-isolation`：保持
- `oxn-proof-domain.md:inv-23 probe-pass-implies-fixed`：保持
- L0-L3 宪法（`bun scripts/validate-dependencies.ts`）：保持 0 violations

## 关联文档

- [RFC-0015 Proof 体系重整](./docs/rfc/zh-cn/RFC-0015-proof-system-overhaul.md) — 全部 D 决策点已落地（Phase 1-4）
- [RFC-0016 通用验证 probe 扩展](./docs/rfc/zh-cn/RFC-0016-generic-verification-probes.md) — 独立 RFC，承接 RFC-0015 原 §D6 设计，未执行
- [ADR-0086 Taint Trust Baseline](./docs/adrs/0086-taint-trust-baseline-design.md) — RFC-0015 D2.2 落地
- [.changes/0-6-2-alpha-1-pool-and-glossary.md](./.changes/0-6-2-alpha-1-pool-and-glossary.md) — 上一 alpha 批次（含 RFC-0013 Accept）
- [.changes/0-6-2-alpha-2-rfc-0015-d6-rewrite.md](./.changes/0-6-2-alpha-2-rfc-0015-d6-rewrite.md) — 上一 alpha 批次（RFC-0015 §D6 重写设计阶段）