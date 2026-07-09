# ADR-0034: Work 前置精准阻断 vs Daemon 全局崩溃（probe-cli-1 细节差异）

> **来源**：`docs_tmp/probe-cli-1.md` (2026-06-14)
> **抽取日**：2026-07-04
> **状态**：Superseded → 已落实 Work 前置精准阻断
> **影响层**：L1-Infra / Daemon

## 决策

第三方 Probe 被篡改时，**Work 前置精准阻断**（仅 Work fail），**Daemon 仍正常服务其他 Work**。

## 现状（v0.6.1）

- ✅ `oxn probe add/list/fix` CLI 已落地
- ✅ Probe 沙箱（Bun `vm.SourceTextModule` + FORBIDDEN_GLOBALS 7 + FORBIDDEN_MODULES 10）
- ✅ Hash 校验：`registry.json` v1 schema
- ✅ Work 前置阻断：被篡改 Probe 标 `CORRUPTED` 后，Work 不启动（精准阻断）
- ✅ Daemon 不"连坐"：其他 Work 继续运行

## 候选落点

- 已在 `changelog/CHANGELOG.md:118` 体现
- 本 ADR 作为"细节决策记录"备查

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-14-probe-cli-1.md`
- `docs/zh-cn/changelog/CHANGELOG.md`