# `dev/versions/` — 已绑版本 Roadmap 目录

> **情态**：描述性 Doc（前瞻性已绑版本）
> **命名**：每个文件以 `<slug>.md` 命名（与 `dev/pool/` 同名）
> **frontmatter**：`version` / `date` / `type` / `status` —— **scheduling 时由工程师从 pool `git mv` 后补**
> **锁定**：RFC-0013 D3 + Errata 2026-07-27（grilling session 引入 `dev/pool/` 备选池）

## 目录说明

`dev/versions/` 存放**scheduling 决定后**绑定的 Roadmap。每个文件对应一个尚未发布的版本中具体的规划条目，由 `dev/pool/<slug>.md` 通过 `git mv` 进入本目录后填 `version: 0.X.Y` 字段。

`dev/versions/` 不应直接创建新文件——所有 entry 必须先经过 `dev/pool/` 的备选池阶段。

## 当前状态（2026-08-06 后）

`dev/versions/` 当前**为空**——所有规划条目均已回滚到 `dev/pool/`（详见 `.openxenon/drafts/doc-dev-versionless-pooling.md`）。

未来 scheduling 决定时，由工程师执行：
```bash
git mv dev/pool/<slug>.md dev/versions/<slug>.md
# 然后补 frontmatter:
# version: 0.X.Y
# date: YYYY-MM-DD
# type: minor
```

## 生命周期

1. **入池**（`dev/pool/`）：工程师 mental commit → 创建 `dev/pool/<slug>.md`，无 `version` 字段
2. **调度**（scheduling 决定）：工程师判定 entry 进入下一开发周期 → `git mv dev/pool/<slug>.md dev/versions/<slug>.md` + 补 `version: 0.X.Y` + `date: YYYY-MM-DD` + `type: minor`
3. **开发**：开发期间可迭代更新（添加 feature、补 RFC 引用、补 Phase A/B/C 阶段）
4. **转正**：版本转正时（alpha → stable）：
   - 创建对应的 `.changes/0-X-Y-*.md`（Version Fragment）作为变更日志
   - `git mv dev/versions/<slug>.md .openxenon/.archived/dev/versions/<slug>.md`
   - 归档目录保留历史 Roadmap 作为"该版本曾经规划了什么"的审计痕迹

## 与 `dev/pool/` `dev/meta/` 的关系

| 维度 | `dev/pool/` | `dev/versions/` | `dev/meta/` |
|---|---|---|---|
| **语义** | 备选池（未绑版本，`scheduled-version: ~`）| 已绑版本（含 `version` 字段）| meta 文档（跨版本不变）|
| **何时入** | 工程师 mental commit | scheduling 决定时 `git mv` 过来 | 跨版本不变的元信息 |
| **frontmatter** | `id` / `theme` / `priority` / `scheduled-version: ~` | `version: 0.X.Y` / `date` / `type` / `status` | `entity: dev-meta` / `type: meta` |

详细语义见 [`dev/pool/README.md`](../pool/README.md) 与 [`dev/meta/README.md`](../meta/README.md)。

## scheduling 时序

```
dev/pool/<slug>.md          ← 备选池（brief / detail 均可）
        ↓ scheduling 决定 + git mv
dev/versions/<slug>.md      ← 已绑版本（补 version: 0.X.Y）
        ↓ 版本转正
.openxenon/.archived/dev/versions/<slug>.md
```

## 参考

- RFC-0013 D3 版本相关文档三情态分离 + Errata 2026-07-27
- RFC-0013 D4 AssetMap ≠ Roadmap
- [`dev/pool/README.md`](../pool/README.md) —— 备选池定义
- [`dev/meta/README.md`](../meta/README.md) —— meta 文档定义
- `.openxenon/assets/domains/oxn-project-domain.md#planning-pool` —— 本术语权威定义
- `.openxenon/drafts/doc-dev-versionless-pooling.md` —— 2026-08-06 重构计划