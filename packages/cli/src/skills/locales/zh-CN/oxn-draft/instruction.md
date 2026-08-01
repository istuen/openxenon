# /oxn-draft — Draft 工作稿管理 v0.6.2

## 目标
管理 Draft（未提升的描述性工作稿）的整个生命周期：**create / list / archive / discard**，覆盖 3 类 DraftType（report / issue / design）。

底层走 `oxn draft <subcommand>`（CLI 直接调 Engine → Infra Module，无 Probe / 无 Work）。

> **v0.6.2 新增**：Draft 是描述性情态（Descriptive Modality）的前置状态。空白文件，无 Template，无 frontmatter，无 Probe（OXN 验证器不变执行器）。详见 `.openxenon/drafts/draft-system-design-grilling.md`。

## 硬规则
- Draft 文件位置：默认 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）
- 文件命名：无 `--prefix` → `<name>.md`；有 `--prefix` → `<prefix>-<name>.md`
- DraftType 3 类：`report`（调研报告） / `issue`（问题记录） / `design`（设计稿）
- `discard` 是破坏性操作，必须 `--force` 才执行
- `archive` 把 Draft 移到 `.openxenon/drafts/.archived/`（保留历史）
- Draft 不参与 AssetLifecycle（不走 `oxn asset create/evolve/archive`）
- Draft 不参与 Work 的 IAP 闭环（无 Probe、无 frozen.json）

## 范式速记
```
Draft = 描述性情态的前置状态
  ├── create → 空白文件（工程师 + AI 自由填写）
  ├── archive → 移到 .archived/（保留历史，标记不活跃）
  └── discard → 物理删除（--force）

Draft → 提升路径（不通过 Draft 命令，走 Promote Blueprint）：
  ├── → Asset  → oxn work create --type asset --asset-kind X（走 oxn-asset Skill）
  ├── → RFC    → oxn work create --blueprint doc-rfc-workflow
  ├── → Doc(dev)   → oxn work create --blueprint doc-dev-workflow
  └── → Doc(prod)  → oxn work create --blueprint doc-prod-workflow
```

## 执行

### 1. 创建 Draft

```bash
oxn draft create <name> [--prefix report|issue|design]
```

**何时用 `--prefix`**：
- `report` — 调研报告（如 `report-market-analysis.md`）
- `issue` — 问题记录（如 `issue-bug-123.md`）
- `design` — 设计稿（如 `design-arch-v2.md`）
- 无 — 通用草稿（如 `my-notes.md`）

### 2. 列出 Draft

```bash
oxn draft list                     # 仅 active
oxn draft list --include-archived  # 含 archived
```

输出：name、prefix、size、mtime、archived 状态，按 mtime 降序。

### 3. 归档 Draft

```bash
oxn draft archive <name>           # 不带 prefix 也可（自动匹配）
```

移到 `.openxenon/drafts/.archived/`，保留历史。

### 4. 丢弃 Draft

```bash
oxn draft discard <name> --force   # 必须 --force
```

物理删除，无引用时可丢弃。

## Promote 引导（Draft → 正式产物）

| 目标 | 命令 | 适用场景 |
|---|---|---|
| **Asset** | `oxn work create --type asset --asset-kind X` | 内容已收敛为术语/规则/约束 |
| **RFC** | `oxn work create --blueprint doc-rfc-workflow` | 内容是规定性决策（"为什么决定 X"）|
| **Doc(dev)** | `oxn work create --blueprint doc-dev-workflow` | 内容是开发手册章节（侧重 L0-L3 实现视角）|
| **Doc(prod)** | `oxn work create --blueprint doc-prod-workflow` | 内容是产品手册章节（侧重用户视角）|

**DraftType → Promote 路径推荐**：

| DraftType | 推荐目标 |
|---|---|
| `design` | RFC 或 Doc(dev) |
| `issue` | Doc(dev) 或 RFC |
| `report` | Doc(prod) 或 Doc(dev) |

## 关键错误码

| 错误码 | 含义 | 修复 |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name 含路径分隔符或扩展名 | 用 kebab-case / camelCase |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` 值不在 3 类中 | 用 `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | 同名文件已存在 | `oxn draft list` 看现有，换名 |
| `OXN_DRAFT_NOT_FOUND` | archive/discard 找不到文件 | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | discard 缺 `--force` | 加 `--force` 或用 `archive` |
| `OXN_DRAFT_ALREADY_ARCHIVED` | archive 目标已存在 | 丢弃归档副本或改名 |

## 禁止项

- 不创建带 Template 的 Draft（无 Template 机制，撤销 D22/D33/D37）
- 不创建带 frontmatter 的 Draft（Draft 与 Asset 不同，无 entity/version 字段）
- 不通过 `oxn draft` 触发 Probe 验证（Draft 创建不需要验证，5.1 洞察）
- 不把 Draft 路径硬编码到代码（用 `.oxnrc` `draftDir` 配）
- 不删除 active Draft 不用 `--force`

## 与其他 Skill 的边界

| Skill | 管什么 | 不管什么 |
|---|---|---|
| `oxn-asset` | Asset 生命周期（5 AssetKind） | Draft 创建/归档 |
| `oxn-work` | Work 编排 + 执行 + Probe | Draft 创建 |
| **`oxn-draft`** | **Draft 生命周期（4 命令）** | **Asset/Work/Doc 创建** |

> Draft 是 Pre-Work 探索区（手写自由格式）；Work 是执行区（IAP 闭环）。两者不混用。

## 详细参考
- `references/draft-lifecycle.md` — 4 命令详解 + 边界规则 + 与 Work/Proof 关系