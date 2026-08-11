---
entity: adr
version: 1.0.0
status: Archived
date: 2026-07-30
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/oxn-dev-release-coexistence.md
  - .openxenon/assets/workflows/release-cut.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0083: 用 Version Hygiene 代替 Build Metadata 区分 Dev/Release

> **状态**：✅ Accepted（2026-07-30）
> **日期**：2026-07-30
> **来源**：2026-07-30 `/grilling` session（Dev/Release 共存 + pnpm 包管理迁移阶段 1）
> **影响层**：CLI 版本标识策略 + 构建产物（dist/cli.js）

## 决策

OXN CLI **不**向构建产物注入 build metadata（git SHA / build timestamp / "dev" 标记）。Dev Version 与 Release Version 在运行时的**唯一**区分器是**版本号字符串本身**：dev 版本号恒严格大于已发布 release 版本号。简称为 **Version Hygiene**。

## 背景

`packages/cli/src/index.ts:140` 是 OXN CLI 唯一版本源（`pkg.version`）。代码、测试、build 流程、CI 中没有任何 git SHA / build 标记 / dirty 检测的注入机制。

考虑过注入 build metadata 以精确区分：
- "我改完代码没提交跑的是哪个 build？"
- "bug 报告只带版本号时是 dev 还是 release？"
- "AI agent 同时跑 dev + release 时如何区分？"

## 拒绝的理由

1. **过度工程**：用户需求是"在本地 dev build 与 registry release 之间二选一切换"。Build metadata 解决的问题在 OXN 实际工作流里不存在 —— 串行切换模式下同一时刻只有一个 oxn 生效（`scripts/oxn-switch.sh`）。
2. **未来读者惊讶**：若注入 build metadata，未来工程师会期望"OXN 是按 build 严格可复现的"。但 LLM 时代的"脏开发"（dirty working tree）是常态而非异常，metadata 反而是噪音。
3. **dirty-dev 内部歧义可接受**：dev-internal "改了没提交" 与 "commit 后没 release" 的区分是 dev workflow 问题（`git status`），不是 dev-vs-release 问题。
4. **Simplicity wins**：Version Hygiene 一条规则（dev > release）替代整套 build metadata 注入 + 检测 + 解析 + 显示逻辑。

## 替代方案（Version Hygiene）

- **判据**：`oxn --version` 在 dev shell 与 release shell 输出**不同字符串**。
- **保障**：`release-cut` workflow 加 `post-publish-bump` slot（[release-cut.md](../../openxenon/assets/workflows/release-cut.md)），发布后**立即** bump 3 个 package.json 到下一个 `-alpha.0`。关闭唯一歧义窗口（dev 与 release 共享版本号的过渡期）。
- **工具**：`scripts/oxn-switch.sh` 提供 `pnpm oxn:dev` / `pnpm oxn:prod` / `pnpm oxn:status` 三个原子操作，互斥切换。
- **约束**：禁止在 release 版本号上做语义版本修改（不可"偷偷修复 release"）；bug 修复必须开新 Work 走 dev → release 流程。

## 后果

- ✅ 零构建脚本改动 —— 不动 `bun build` / 未来的 `tsup`
- ✅ 零测试改动 —— `bun test` 不需新断言
- ✅ 零 CI 改动 —— CI 无需新增 build-hash 校验
- ✅ 符合 OXN 的"确定性参照系"定位（ADR-0072）—— 版本号是确定的、可比较的
- ⚠️ AI agent 在 dirty working tree 上的 bug 报告不带 dirty 标记 —— 由 `git status` 补充

## 不在范围

- 阶段 2 切 Node 运行时 + tsup 构建时，build metadata 仍然不注入（Version Hygiene 适用所有阶段）
- `oxn --version` 输出格式未来可优化（如加 `[dev]` 后缀），但那是 UI 而非 metadata
- Stage / commit SHA 等"丰富 build 信息"如需要，应走 git（`git describe`）而非构建产物

## 参考

- [`.openxenon/drafts/oxn-dev-release-coexistence.md`](../../openxenon/drafts/oxn-dev-release-coexistence.md) — 完整计划 + 决策上下文
- [`scripts/oxn-switch.sh`](../../scripts/oxn-switch.sh) — Dev/Release 切换工具
- [`.openxenon/assets/workflows/release-cut.md`](../../openxenon/assets/workflows/release-cut.md) — `post-publish-bump` slot
- ADR-0072 — OXN 作为非确定性智能体的确定性参照系（Version Hygiene 是其具体化）
