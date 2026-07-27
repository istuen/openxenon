# `dev/` — 开发者操作指南

> **`dev/` 目录 = 维护者 + 贡献者写给开发者看的操作手册，不是产品文档。**
>
> 本目录由 RFC-0013 D3（版本相关文档三情态分离）建立 `dev/versions/` + `dev/fix/` 后形成。
> 跨层引用规则见 [AGENTS.md](../AGENTS.md)。

## 当前内容

| 文件/目录 | 用途 |
|---|---|
| `README.md` | 本文件——开发者操作指南入口 |
| `versions/` | 前瞻性版本计划（Roadmap）——描述未来版本将包含什么；转正后归档。详见 [`versions/README.md`](./versions/README.md) |
| `fix/` | 开发者面向的 bug 修复记录（Fix Record）——比 Version Fragment 更详细；详见 [`fix/README.md`](./fix/README.md) |

## 跨层引用规则

```
L1 docs/  ──→  L2 .openxenon/        ✅ 允许（用户深入了解）
L2 .openxenon/ ──→  L1 docs/          ❌ 禁止（沉淀层应独立可读）
dev/  ──→  L1/L2/L3                   ✅ 允许（开发者手册引用 SSOT）
L1/L2/L3 ──→  dev/                   ⚠️ 谨慎（SSOT 不应反向引用操作指南）
```

## 新 dev/ 文档的添加流程

1. 用 `oxn work create <name> --blueprint doc-promote` 走 IAP（lock → run → submit → finalize）
2. 落地后 `git add dev/<filename> && git commit -m "docs(dev): add <title>"`
3. 更新本 README.md「当前内容」表

## 待建（Roadmap）

- `getting-started.md` — 开发者上手指南
- `dev-workflow.md` — 开发工作流（分支策略、PR 流程、IAP 集成）
- `release-process.md` — 发版流程（alpha 转正、Version Fragment 落盘、Roadmap 归档）
- `debugging.md` — 调试指南（OXN 错误码、IAPError 处理）
- `ai-collaboration.md` — AI 协作最佳实践

## 参考

- [AGENTS.md](../AGENTS.md) — 仓库宪法 + L0-L3 规则
- [RFC-0013 D3](../docs/rfc/zh-cn/RFC-0013-versioning-policy.md) — 版本相关文档三情态分离
- [RFC-0013 D4](../docs/rfc/zh-cn/RFC-0013-versioning-policy.md) — AssetMap ≠ Roadmap 术语消歧