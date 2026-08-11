---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0048: library/ + external/ 子目录设计（外部信息引入）

<!-- allow-version -->
> **来源**：v0.6.3 Asset Paper Schema RFC §1.2
<!-- /allow-version -->
> **抽取日**：2026-07-05
> **状态**：⛔ Superseded（由 three-boundary-blueprint-elevation-rfc.md 触发；library 降级为 .md、external 收敛为边界内 inline）
> **superseded-by**：[ADR-0053](./0053-superseded-0048-library-external-scheme.md)（记录废弃）+ [ADR-0056](./0056-external-inline-and-status.md)（接管 External inline）
> **影响层**：L1-Infra（Asset IO）+ L2-Engine（Asset lifecycle）

## 决策

新增 2 个 Asset 子目录，分别处理"已索引内容"和"外部引用指针"：

```
.openxenon/assets/
├── domain/                          # 原
├── blueprint/                       # 原
├── stack/                           # 原
├── library/                         # 🆕 外部信息聚合（Work 产出）
│   ├── axios-docs.oxn              # Axios 官方文档聚合
│   └── terraform-aws.oxn
└── external/                        # 🆕 外部引用指针（不存内容）
    ├── npm-deps.oxn                # URL + hash + ttl
    └── github-issues.oxn
```

## `library/` vs `external/` 关键区别

| 维度 | library/ | external/ |
|---|---|---|
| 内容存储 | AI 解析后写入 .oxn（已索引）| 仅引用指针（URL + hash + ttl）|
| 适用场景 | 频繁复用的外部知识（API 文档、规范）| 临时引用（npm deps、GitHub Issues）|
| 失效检测 | Engine 校验 | TTL 到期触发 fetch |
| 更新路径 | 跑 Work 重新聚合 | 自动 fetch 或手动 |
| 大小限制 | < 50KB（`oxn library validate` 限制）| 引用指针，无大小限制 |

## 写入路径

**library/ 写入**（通过 Work 产出）：

```bash
# 1. 创建 Asset 模式 Work
$ oxn work create w-update-axios-docs \
    --type asset --asset-kind library --name axios-docs

# 2. Work 跑 IAP 闭环
# AI Agent:
#   1. read_file(.openxenon/assets/library/axios-docs.oxn)  # 读旧版本
#   2. web_fetch(https://axios-http.com/docs/intro)          # 抓新文档
#   3. parse + diff + 生成新版本 .oxn                       # 解析重构
#   4. write_file(.openxenon/assets/library/axios-docs.oxn)  # 覆盖（chmod 0o444 由 Asset 自身保护）
#   5. write_file(works/w-update-axios-docs/context.md)     # 过程记录

# 3. Engine 验证 → oxn library validate axios-docs
```

**external/ 写入**（自动或手动）：

```bash
# 自动（Asset validate 时扫描 package.json 写入）
$ oxn external scan npm
# → 写入 .openxenon/assets/external/npm-deps.oxn（按需 fetch）

# 手动（工程师添加）
$ oxn external add --name github-issues \
    --url https://api.github.com/repos/xxx/issues \
    --ttl 7d
```

## 读取路径（Stable Prefix）

```text
[2. Project Knowledge Base（Stable Prefix · Asset 集合）]
    {{include assets/domain/*.oxn}}
    {{include assets/blueprint/*.oxn}}
    {{include assets/stack/*.oxn}}
    {{include assets/library/*.oxn}}     ← 🆕
    {{include assets/external/*.oxn}}    ← 🆕
```

## 后果

- ✅ 外部信息通过 Work 路径引入，保留 IAP 闭环
- ✅ library/ 提供"已消化"的稳定内容（KV Cache 友好）
- ✅ external/ 提供"按需 fetch"的临时引用（节省存储）
<!-- allow-version -->
- ✅ 完全替代 v0.7.x Memory RFC 的 L3 角色
<!-- /allow-version -->
- ⚠ library/ 需限制 size < 50KB（防止 Asset 变成 dumps）
- 🔗 关联 ADR-0051（Asset 论文结构 + 引用计数）

## 反模式

- ❌ library/ 塞完整 PDF（破坏 Stable Prefix）
- ❌ external/ 存内容（应只存引用）
- ❌ 绕过 Work 直接写 library/（失去 IAP 闭环）
- ❌ 引用过期 external 不刷新（trust_score 衰减提示）

## 参考

<!-- allow-version -->
- v0.6.3 Asset Paper Schema RFC §1.2
<!-- /allow-version -->
- ADR-0051 Asset-as-Paper 论文结构
- harness-3.md §Memory 层（重新定位为 library 路径）