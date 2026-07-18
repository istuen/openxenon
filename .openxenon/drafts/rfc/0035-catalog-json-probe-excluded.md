# ADR-0035: catalog.json schema + Probe-excluded 规则 + `oxn arsenal list`

> **来源**：`docs_tmp/next-version-3.md`, `next-version-4.md` (2026-05-28)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：E1 Asset / L3 CLI

## 决策

### 1. catalog.json 而非 catalog.md

- JSON 便于机器解析（CI / Skill 自动校验）
- 位于 `.openxenon/assets/catalog.json`（**不入 git**，本地缓存）

### 2. Probe 不入 catalog

Probes 是"AI 盲区"（不应让 AI 看见全部 Probe 再选择性调用），仅 Asset（Domain / Blueprint / Stack）入 catalog。

### 3. `oxn arsenal list` 命令

CLI 必须提供 `oxn arsenal list` 命令列出当前可见的 Asset 集合（Project + Global + Builtin 三层）。

## 现状

- ✅ catalog.json 已落实
- ✅ Probe 不入 catalog 已落实
- ✅ `oxn arsenal list` 等价命令已存在

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-28-next-version-3.md`