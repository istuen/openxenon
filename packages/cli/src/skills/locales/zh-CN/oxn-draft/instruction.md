# /oxn-draft — Draft 工作稿管理 v0.6.2-alpha.3

## 目标
管理 Draft（未提升的描述性工作稿）的整个生命周期:**create / list / archive / discard / promote / retarget**(v0.6.2-alpha.3 增 2 命令),覆盖 3 类 DraftType(report / issue / design) + 3 类 DraftTarget(rfc / asset / work)。

底层走 `oxn draft <subcommand>`(CLI 直接调 Engine → Infra Module,无 Probe / 无 Work)。

> **v0.6.2-alpha.3 新增**:
> - `--target <rfc|asset|work>` 派生 skeleton(create 模式带 frontmatter)
> - `promote` 子命令(走 draft-promote-router Blueprint 4 阶段)
> - `retarget` 子命令(显式 retarget,保留工程师内容)
> - 详见 `.openxenon/assets/domains/oxn-draft-domain.md` v0.2.0 + `.openxenon/assets/domains/oxn-draft-promote-domain.md` v0.1.0

## 硬规则
- Draft 文件位置:默认 `.openxenon/drafts/`(可经 `.oxnrc` `draftDir` 字段配)
- 文件命名:无 `--prefix` → `<name>.md`;有 `--prefix` → `<prefix>-<name>.md`
- DraftType 3 类:`report`(调研报告) / `issue`(问题记录) / `design`(设计稿)
- DraftTarget 3 类(v0.6.2-alpha.3):`rfc` / `asset` / `work`(仅 2 命令使用)
- `discard` 是破坏性操作,必须 `--force` 才执行
- `archive` 把 Draft 移到 `.openxenon/drafts/.archived/`(保留历史)
- `retarget` 是显式 retarget(不允许直接编辑 frontmatter 改 promote-target)
- Draft 不参与 AssetLifecycle(不走 `oxn asset create/evolve/archive`)
- Draft 不参与 Work 的 IAP 闭环(无 Probe、无 frozen.json)
- 4 命令(create/list/archive/discard)用空白模式;2 命令(promote/retarget)用 skeleton 派生模式

## 范式速记
```
Draft = 描述性情态的前置状态
  ├── create                    # 2 模式:
  │     ├── 空白模式 (无 --target) → 0 bytes 空白文件(向后兼容 v0.6.2)
  │     └── 骨架模式 (--target X) → 从 .openxenon/draft-skeletons/<X>[-kind].md 派生
  ├── list                       # 按 mtime 降序
  ├── archive                    # → .archived/(保留历史)
  ├── discard                    # 物理删除 (--force)
  ├── promote                    # → 走 draft-promote-router Blueprint 4 阶段:
  │     ├── gather(读 Draft)
  │     ├── select-target(读 frontmatter promote-target)
  │     ├── validate(校验字段)
  │     └── dispatch-target(路由到 promote-target-aware-workflow)
  └── retarget                   # 显式 retarget → 重新 fork skeleton,保留工程师内容

Draft → 提升路径(v0.6.2-alpha.3 起推荐用 `oxn draft promote`):
  ├── → Asset  → dispatch-target=rfc|asset|work 由 promote-target-aware-workflow 路由
  ├── → RFC    → 落盘 docs/rfcs/zh-cn/RFC-XXXX-<theme>.md
  ├── → Asset  → 落盘 .openxenon/assets/{kind}/{name}.md (5 AssetKind)
  └── → Work   → 落盘 .openxenon/works/<id>/work.md
```

## 执行

### 1. 创建 Draft

**空白模式(默认,向后兼容 v0.6.2)**:
```bash
oxn draft create <name> [--prefix report|issue|design]
```

**骨架模式(v0.6.2-alpha.3+)**:
```bash
oxn draft create <name> --target <rfc|asset|work> [--kind <5 AssetKind>] [--prefix <report|issue|design>]
```

**示例**:
```bash
# 空白模式
oxn draft create my-design --prefix design

# 骨架模式 → RFC
oxn draft create rfc-0013 --target rfc

# 骨架模式 → Asset + Domain
oxn draft create payment-core --target asset --kind domain

# 骨架模式 → Work
oxn draft create fix-payment-idempotency --target work
```

**何时用 `--target`**:
- `rfc` — 准备升级为 RFC(Draft frontmatter 含 `promote-target: rfc`)
- `asset` + `--kind <domain|workflow|stack|blueprint|roadmap>` — 准备升级为 5 类 Asset 之一
- `work` — 准备升级为 Work 实例
- 无 `—target` — 通用草稿(可后续 `retarget` 加 target)

### 2. 列出 Draft

```bash
oxn draft list                     # 仅 active
oxn draft list --include-archived  # 含 archived
```

输出:name、prefix、size、mtime、archived 状态,按 mtime 降序。

### 3. 归档 Draft

```bash
oxn draft archive <name>           # 不带 prefix 也可(自动匹配)
```

移到 `.openxenon/drafts/.archived/`,保留历史。

### 4. 丢弃 Draft

```bash
oxn draft discard <name> --force   # 必须 --force
```

物理删除,无引用时可丢弃。

### 5. Promote Draft(v0.6.2-alpha.3+)

```bash
oxn draft promote <name> [--target auto|rfc|asset|work] [--archive-after]
```

**4 阶段生命周期**(走 draft-promote-router Blueprint):
1. **gather** — 读 Draft frontmatter + body
2. **select-target** — 读 promote-target 字段(或 `--target` 覆盖)
3. **validate** — 校验必填字段(`promote-target` + `promote-kind` 仅 target=asset)
4. **dispatch-target** — 路由到 promote-target-aware-workflow Blueprint 对应 sub-target

**7 sub-target**:
- `promote-rfc` → `docs/rfcs/zh-cn/RFC-XXXX-<theme>.md`
- `promote-asset-{domain|workflow|stack|blueprint|roadmap}` → `.openxenon/assets/{kind}/{name}.md`
- `promote-work` → `.openxenon/works/<id>/work.md`

**示例**:
```bash
# 自动读 frontmatter promote-target
oxn draft promote my-design

# 显式覆盖
oxn draft promote my-design --target rfc

# Promote 后自动 archive 原 Draft
oxn draft promote my-design --archive-after
```

**关键约束**:
- 源 Draft 文件 mtime 不变(不修改原 Draft)
- Promote 完成后,工程师决定 archive / discard
- 4 阶段顺序强制,任意失败回滚

### 6. Retarget Draft(v0.6.2-alpha.3+)

```bash
oxn draft retarget <name> --new-target <rfc|asset|work> [--new-kind <5 AssetKind>]
```

**职责**:
- 重新派生 skeleton with new target
- 保留工程师已填的 frontmatter 字段(除 `promote-target` / `promote-kind` / `created-from` / `synced-at`)
- 保留工程师已填的 body 内容(append 到 `<!-- engineer-preserved-content -->`)

**示例**:
```bash
# rfc → asset+domain
oxn draft retarget my-design --new-target asset --new-kind domain

# 多轮 retarget
oxn draft retarget my-design --new-target work
oxn draft retarget my-design --new-target rfc
```

**关键约束**:
- 显式 retarget(不允许直接编辑 frontmatter 改 promote-target)
- retarget 调 draft-skeleton-fork Workflow 重新派生 skeleton
- 工程师 body 内容自动保留

## Promote 引导(Draft → 正式产物)

| 目标 | 路径(包 route) | 字段 | 适用场景 |
|---|---|---|---|
| **Asset** | `promote-asset-{kind}` | `--target=asset --kind=<5 AssetKind>` | 内容已收敛为术语/规则/约束 |
| **RFC** | `promote-rfc` | `--target=rfc` | 内容是规定性决策("为什么决定 X") |
| **Work** | `promote-work` | `--target=work` | 多阶段可执行任务 |

**DraftType → Promote 路径推荐**(v0.6.2-alpha.3):

| DraftType | 推荐目标 |
|---|---|
| `design` | RFC 或 Asset |
| `issue` | Asset 或 Work |
| `report` | RFC 或 Asset |

## 关键错误码

| 错误码 | 含义 | 修复 |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name 含路径分隔符或扩展名 | 用 kebab-case / camelCase |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` 值不在 3 类中 | 用 `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | 同名文件已存在 | `oxn draft list` 看现有,换名 |
| `OXN_DRAFT_NOT_FOUND` | archive/discard/promote/retarget 找不到文件 | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | discard 缺 `--force` | 加 `--force` 或用 `archive` |
| `OXN_DRAFT_ALREADY_ARCHIVED` | archive 目标已存在 | 丢弃归档副本或改名 |
| `OXN_DRAFT_TARGET_INVALID` | `--target` 不在 3 类中 | 用 `rfc` / `asset` / `work` |
| `OXN_DRAFT_KIND_REQUIRED` | `--target=asset` 缺 `--kind` | 加 `--kind=<5 AssetKind>` |
| `OXN_DRAFT_KIND_INVALID` | `--kind` 不在 5 类中 | 用 `domain` / `workflow` / `stack` / `blueprint` / `roadmap` |
| `OXN_DRAFT_SKELETON_NOT_FOUND` | skeleton 模板不存在 | 建 `.openxenon/draft-skeletons/<target>[-kind].md` |
| `OXN_DRAFT_PROMOTE_TARGET_MISSING` | frontmatter 缺 `promote-target` | `oxn draft retarget` 加 target |
| `OXN_DRAFT_PROMOTE_TARGET_UNKNOWN` | `promote-target` 值不在 3 类中 | 改 frontmatter 或 `--target` |
| `OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH` | target/kind 组合不合法 | 用 `--target=asset --kind=<valid>` |
| `OXN_DRAFT_PROMOTE_VALIDATE_FAILED` | frontmatter 校验失败 | `oxn draft retarget` 补全 |
| `OXN_DRAFT_FRONTMATTER_INVALID` | 无 frontmatter 或格式错 | `oxn draft create --target` 派生 |

## 禁止项

- 不创建带 Template 的 Draft(Draft engine 不内置 template;skeleton 由 Blueprint 派生)
- 不强制 Draft 带 frontmatter(可选 `--target` 派生)
- 不通过 `oxn draft` 触发 Probe 验证(Draft 创建不需要验证,5.1 洞察)
- 不把 Draft 路径硬编码到代码(用 `.oxnrc` `draftDir` 配)
- 不删除 active Draft 不用 `--force`
- 不直接编辑 frontmatter 改 `promote-target`(用 `oxn draft retarget`)

## 与其他 Skill 的边界

| Skill | 管什么 | 不管什么 |
|---|---|---|
| `oxn-asset` | Asset 生命周期(5 AssetKind) | Draft create / promote / retarget |
| `oxn-work` | Work 编排 + 执行 + Probe | Draft create / promote / retarget |
| **`oxn-draft`** | **Draft 生命周期(6 命令) + Promote 路由** | **Asset/Work/Doc 直接创建** |

> Draft 是 Pre-Work 探索区(手写自由格式或 skeleton 派生);Work 是执行区(IAP 闭环)。两者不混用。

## 详细参考

- `references/draft-lifecycle.md` — 6 命令详解 + 边界规则 + 与 Work/Proof 关系
- `.openxenon/assets/domains/oxn-draft-domain.md` v0.2.0 — Draft 概念边界
- `.openxenon/assets/domains/oxn-draft-promote-domain.md` v0.1.0 — Promote 路由边界
- `.openxenon/assets/blueprints/draft-promote-router.md` — 总路由 Blueprint
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md` — L2 通用 Promote
- `.openxenon/assets/workflows/draft-skeleton-fork.md` — Skeleton 派生 Workflow
