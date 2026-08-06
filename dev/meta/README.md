# `dev/meta/` — OXN 自身开发的 meta 文档

> **类型**：dev meta 目录（OpenXenon 维护者操作参考）
> **命名**：`<topic>.md`（无版本号）
> **frontmatter**：`entity: dev-meta` + `type: meta | meta-baseline`
> **何时入**：跨版本不变的元信息（如版本统一、baseline 状态、共享参考）

## 当前内容

| 文件 | 类型 | 状态 |
|---|---|---|
| `version-unification.md` | meta | ✅ Accepted（v0.6.x → v0.7 合并叙事）|
| `oxn-deprecation-baseline.md` | meta-baseline | ✅ Shipped（v0.6.1 PARTIAL ship 描述）|

## 与其他目录的关系

| 目录 | 情态 |
|---|---|
| `dev/pool/` | 备选池（未绑版本，scheduling 前 entry 所在）|
| `dev/versions/` | 已绑版本 Roadmap（scheduling 后 `git mv` 过来，含 `version: 0.X.Y`）|
| `dev/fix/` | Fix Record（开发者面向）|
| `dev/meta/` | meta 文档（跨版本不变的元信息）|

## 跨层引用规则

```
L1 docs/  ──→  dev/         ✅ 允许（用户深入了解）
dev/  ──→  L1/L2/L3        ✅ 允许（开发者手册引用 SSOT）
L1/L2/L3 ──→  dev/         ⚠️ 谨慎（SSOT 不应反向引用操作指南）
```

## 添加流程

1. 用 `oxn work create <name> --blueprint doc-promote`
2. 落地后 `git add dev/meta/<filename> && git commit -m "docs(dev-meta): add <title>"`
3. 更新本 README.md「当前内容」表
