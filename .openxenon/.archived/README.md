# `.openxenon/.archived/` · 工程工作台归档区

> **目的**：与 `.openxenon/` 顶级子目录镜像的归档区，存放历史/已废/被取代的文档资产。
>
> **建立日**：2026-07-17（`work archive-mirror-structure` 的 finalize 节点）
>
> **关联 Work**：`oxn work status archive-mirror-structure`

## 镜像结构

```
.openxenon/.archived/
├── README.md                     (本文)
├── assets/
│   ├── blueprints/                # 历史 Blueprint(空)
│   ├── domains/                   # 历史 Domain file(20 个旧版本)
│   ├── roadmaps/                  # 历史 Roadmap(空)
│   ├── stack/                     # 历史 Stack(空)
│   └── workflows/                 # 历史 Workflow(空)
├── docs/
│   ├── adrs/                      # Superseded ADR + 编号外历史 ADR(8 篇)
│   ├── rfcs/                      # v0.6 前 ✅ RFC + _archive RFC(6 篇)
│   └── domains-md/                # v0.3 md-native 复刻品(16 文件,2026-06-24)
├── pools/
│   ├── drafts/                    # 历史 drafts(53 篇,含 2026-06 月份目录)
│   ├── issues/                    # 历史 ISS(空)
│   ├── journals/                  # 历史 journals(4 篇)
│   └── spikes/                    # 历史 spike(空)
└── works/                         # 历史 finalized Work(46 个 + INDEX.md)
```

## 归档触发方式

| 触发 | 路径 | 引用 |
|---|---|---|
| `oxn asset archive <kind> <name>` | `.archived/assets/<kind>/<name>.<ext>` | `packages/cli/src/commands/asset.ts` (已改走 assets/ 中间层) |
| 历史 _archive/ 集中清理(本文档伴随) | `.archived/<mirrors>/` | `work archive-mirror-structure` |
| Superseded ADR 处置 | `.archived/docs/adrs/` | INDEX.md Superseded 段 |
| v0.6 前 RFC 沉淀 | `.archived/docs/rfcs/` | INDEX.md 类似段 |

## 与活跃区的关系

- **L1 L2 L3 三层文档 SSOT**(见 AGENTS.md):
  - L1 `docs/{zh-cn,en}/` 用户文档
  - L2 `.openxenon/docs/` 决策沉淀
  - L3 `.openxenon/pools/` 探索流动
- **`.archived/` 是 L2/L3 的历史尾巷**(与 SSOT 不构成新层):
  - 活跃区引用 `.archived/` 路径罕见(仅"已归档"指针)
  - 反向规则: `.archived/` 不反向引用活跃区(避免改动历史快照)

## 引用规则

- 跨目录:禁止 `.archived/docs/` → `pools/` 探索稿(属 cross-layer pointer)
- 同层引用:active → `.archived/` OK(SPEC.md/INDEX.md 中 "已归档于 ..." 类指针)
- `.archived/` 内部引用 OK
- git 跟踪:`.archived/` 全部 tracked(.gitignore 仅忽略 `.cache/`)

## 元数据

- **建立 Work**：`archive-mirror-structure`(通过 `oxn work create archive-mirror-structure -b doc-promote --domain DocEngineeringContext`)
- **执行日期**：2026-07-17
- **批次概况**：
  - 阶段 2: 4 处 _archive/ 内容清空迁移(61 篇)
  - 阶段 3: 6 篇 Superseded ADR(0019/0033/0034/0036/0048/0053)
  - 阶段 4: 4 篇 v0.6 前 RFC(md-native-grammar/v0.4-unify-md/v0.5-proof-insight-loop/v0.6-iap-refactor)
  - 阶段 5: `.archived/domains-md/` → `.archived/docs/domains-md/` 重排
- **副作用**:
  - 代码侧:`packages/engine/src/Asset/{archive,archived-resolver,delete}.ts` + test + skill refs 改走 `.archived/assets/<kind>/`
  - 索引:`docs/adrs/INDEX.md`、`pools/README.md`、`AGENTS.md`、`scripts/{check-naming,version-aggregate}.ts`
  - 跨链:5 处 RFC/draft 内 `_archive/` 链接重写
