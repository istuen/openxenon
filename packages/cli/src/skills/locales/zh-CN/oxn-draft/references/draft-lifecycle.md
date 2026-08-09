# Draft 生命周期参考

> 详细说明 `oxn draft` 4 命令的执行细节、错误码、与 Work / Proof 的协作方式、边界规则。

## 1. create 命令

### 用法
```bash
oxn draft create <name> [--prefix report|issue|design] [--json]
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | positional | ✅ | Draft 名称（kebab-case 或 camelCase，无路径分隔符 / 无扩展名）|
| `--prefix` | string | ❌ | DraftType 前缀（`report` / `issue` / `design`）|

### 文件命名

| `--prefix` | 文件名 |
|---|---|
| 无 | `<name>.md` |
| `report` | `report-<name>.md` |
| `issue` | `issue-<name>.md` |
| `design` | `design-<name>.md` |

### 输出（JSON 模式）
```json
{
  "ok": true,
  "data": {
    "name": "my-design",
    "prefix": "design",
    "path": "/path/to/.openxenon/drafts/design-my-design.md",
    "filename": "design-my-design.md"
  }
}
```

### 错误码

| 错误码 | 触发条件 | 修复 |
|---|---|---|
| `OXN_DRAFT_INVALID_NAME` | name 含 `/` `.` 或空 | 用 `^[a-zA-Z][a-zA-Z0-9_-]*$` 格式 |
| `OXN_DRAFT_INVALID_PREFIX` | `--prefix` 不在 3 类中 | 用 `report` / `issue` / `design` |
| `OXN_DRAFT_ALREADY_EXISTS` | 同名文件已存在 | `oxn draft list` 看现有 |

### 副作用
- 创建 `.openxenon/drafts/` 目录（如果不存在）
- 写入空文件（0 bytes）
- 无 Probe 调用，无 frozen.json

---

## 2. list 命令

### 用法
```bash
oxn draft list [--include-archived] [--json]
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `--include-archived` | boolean | ❌ | 同时列出 `.archived/` 下的 Draft |

### 输出（人读模式）
```
| name | prefix | size | mtime | archived |
|---|---|---|---|---|
| design-grilling | design | 0B | 2026-07-29T... |  |
| report-market | report | 1024B | 2026-07-28T... |  |
| old-design | design | 512B | 2026-07-20T... | yes |
```

### 输出（JSON 模式）
```json
{
  "ok": true,
  "data": {
    "drafts": [
      {
        "name": "design-grilling",
        "prefix": "design",
        "path": "/path/to/.openxenon/drafts/design-grilling.md",
        "size": 0,
        "mtime": "2026-07-29T...",
        "archived": false
      }
    ],
    "count": 1
  }
}
```

### 排序
按 mtime 降序（最近修改的排前面）。

---

## 3. archive 命令

### 用法
```bash
oxn draft archive <name> [--json]
```

### 行为
- 把 `<draftDir>/<filename>` 移到 `<draftDir>/.archived/<filename>`
- 保留文件名（包括 prefix）
- 可省略 prefix：`archive foo` 和 `archive design-foo` 都能找到文件
- `archived` 标记为 `true`，默认 list 不显示

### 错误码

| 错误码 | 触发条件 | 修复 |
|---|---|---|
| `OXN_DRAFT_NOT_FOUND` | active 目录找不到文件 | `oxn draft list` 看现有 |
| `OXN_DRAFT_INVALID_NAME` | name 格式非法 | 用合法格式 |
| `OXN_DRAFT_ALREADY_ARCHIVED` | `.archived/` 已存在同名 | 丢弃归档副本或改名 |

---

## 4. discard 命令

### 用法
```bash
oxn draft discard <name> --force [--json]
```

### 必填 `--force`
`discard` 是破坏性操作，必须显式确认。如果缺 `--force`，返回 `OXN_DRAFT_DISCARD_FORCE_REQUIRED` 错误且不删除。

### 搜索顺序
1. 先在 active 目录找
2. 找不到再在 `.archived/` 找
3. 都找不到返回 `OXN_DRAFT_NOT_FOUND`

### 错误码

| 错误码 | 触发条件 | 修复 |
|---|---|---|
| `OXN_DRAFT_DISCARD_FORCE_REQUIRED` | 缺 `--force` | 加 `--force` 或改用 `archive` |
| `OXN_DRAFT_NOT_FOUND` | active + archived 都找不到 | `oxn draft list [--include-archived]` |
| `OXN_DRAFT_INVALID_NAME` | name 格式非法 | 用合法格式 |

---

## 5. 配置文件（`.oxnrc`）

Draft 目录可在 `.oxnrc` 配置 `draftDir` 字段：

```json
{
  "version": 1,
  "mode": "PRODUCTION",
  "draftDir": "drafts"
}
```

- 默认值：`drafts`（拼上 boundaryDir `.openxenon` → `.openxenon/drafts/`）
- 可改为相对路径（如 `notes` → `.openxenon/notes/`）或绝对路径（不推荐）

> ⚠️ `draftDir` 是 v0.6.2 新增字段；旧项目升级时默认行为不变。

---

## 6. 与 Work / Proof 的协作

### Draft 不是 Work
- Work 有 IAP 三阶段（Intent → Align → Proof），Draft 没有
- Work 产出 frozen.json，Draft 不产出
- Work 引用 Asset（DAG 校验），Draft 不引用
- Work 文件在 `.openxenon/works/<id>/`，Draft 文件在 `.openxenon/drafts/`

### Draft 不是 Proof
- Proof-First 验证**已存在的产物**（read-only 观察），Draft 是**创建空白文档**
- 19 个 Probe 全部是验证器，Draft 创建不需要验证
- Draft 创建的"证据"是文件本身存在 + 创建时间戳（文件系统的 mtime）

### Draft 与 Promote Blueprint
Draft 文件**可被 Promote Blueprint 的 gather slot 读取**（作为提升原料）：

| Promote Blueprint | gather slot 行为 |
|---|---|
| `asset-workflow` | 收集 `.openxenon/drafts/` 中与目标 Asset 相关的草稿 |
| `doc-rfc-workflow` | 收集 `.openxenon/drafts/` 中与目标 RFC 相关的草稿 |

**doc-dev-workflow / doc-prod-workflow** 不从 drafts/ 收集（直接 pick-domain）—— Draft → Doc(dev/prod) 是伪需求（grilling 决议 D16-D18）。

---

## 7. 边界规则（继承自 oxn-project-domain）

```
- .openxenon/drafts/ 项目草稿 → ADR/RFC 暂存禁止（草稿不应引用自身）
- .openxenon/drafts/rfc/ ADR/RFC 暂存 → 项目 Asset 禁止（应通过 docs/ 概念页）
- docs/dev/ → .openxenon/drafts/ 禁止（开发手册不可引用 ADR 暂存内部）
```

这些规则由 `scripts/check-doc-boundary.ts` 在 pre-commit 强制（v0.6.x 已落地）。

---

## 8. v0.6.2-alpha.3 新增 2 命令（promote / retarget）

### 8.1 promote 命令

```bash
oxn draft promote <name> [--target auto|rfc|asset|work] [--archive-after]
```

**4 阶段生命周期**（走 draft-promote-router Blueprint）：

1. **gather** — 读 Draft frontmatter + body
2. **select-target** — 读 promote-target 字段（或 `--target` 覆盖）
3. **validate** — 校验必填字段（promote-target + promote-kind 仅 target=asset）
4. **dispatch-target** — 路由到 promote-target-aware-workflow Blueprint 对应 sub-target

**7 sub-target**：
- `promote-rfc` → `docs/rfcs/zh-cn/RFC-XXXX-<theme>.md`
- `promote-asset-{domain|workflow|stack|blueprint|assetmap}` → `.openxenon/assets/{kind}/{name}.md`
- `promote-work` → `.openxenon/works/<id>/work.md`

**关键约束**：
- 源 Draft 文件 mtime 不变（不修改原 Draft）
- Promote 完成后，工程师决定 archive / discard
- 4 阶段顺序强制，任意失败回滚

### 8.2 retarget 命令

```bash
oxn draft retarget <name> --new-target <rfc|asset|work> [--new-kind <5 AssetKind>]
```

**职责**：
- 重新派生 skeleton with new target
- 保留工程师已填的 frontmatter 字段（除 `promote-target` / `promote-kind` / `created-from` / `synced-at`）
- 保留工程师已填的 body 内容（append 到 `<!-- engineer-preserved-content -->`）

**关键约束**：
- 显式 retarget（不允许直接编辑 frontmatter 改 promote-target）
- retarget 调 draft-skeleton-fork Workflow 重新派生 skeleton
- 工程师 body 内容自动保留

### 8.3 Skeleton 派生（draft-skeleton-fork Workflow）

```bash
oxn draft create <name> --target <rfc|asset|work> [--kind <5 AssetKind>]
```

**7 个 skeleton 模板**（`.openxenon/draft-skeletons/`）：
- `rfc.md` — RFC skeleton
- `asset-{domain|workflow|stack|blueprint|assetmap}.md` — 5 AssetKind skeleton
- `work.md` — Work skeleton

**注入字段**：
- `promote-target: <rfc|asset|work>`（必填）
- `promote-kind: <5 AssetKind>`（仅 target=asset）
- `created-from: draft-skeleton-fork@0.1.0`
- `synced-at: <YYYY-MM-DD>`

**关键约束**：
- skeleton 模板不存在 → 报 `OXN_DRAFT_SKELETON_NOT_FOUND`（不静默降级）
- 资产位置与标准 Asset 一致（`.openxenon/draft-skeletons/`）

---

## 9. 完整示例（v0.6.2-alpha.3+ 推荐用法）

```bash
# ===== 空白模式（兼容 v0.6.2）=====
# 创建一份设计稿
oxn draft create my-design --prefix design
# → /path/to/.openxenon/drafts/design-my-design.md（空白）

# 编辑（用任何编辑器）
vim .openxenon/drafts/design-my-design.md

# 列出当前 Draft
oxn draft list

# 归档原 Draft（保留历史）
oxn draft archive design-my-design

# 不再需要，丢弃
oxn draft discard design-my-design --force

# ===== 骨架模式（新推荐）=====
# 1. 创建 RFC skeleton
oxn draft create rfc-0013 --target rfc
# → /path/to/.openxenon/drafts/rfc-0013.md（含 frontmatter + 5 H2 段）

# 2. 编辑 RFC 内容
vim .openxenon/drafts/rfc-0013.md

# 3. Promote（4 阶段自动）→ 调 draft-promote-router Blueprint
oxn draft promote rfc-0013
# → 路由 promote-rfc → 落盘 docs/rfcs/zh-cn/RFC-XXXX-rfc-0013.md

# 4. Promote 后若目标错（rfc → asset+domain）
oxn draft retarget rfc-0013 --new-target asset --new-kind domain
# → 重新 fork skeleton, 保留 RFC body 内容

# 5. 再次 Promote
oxn draft promote rfc-0013
# → 路由 promote-asset-domain → 落盘 .openxenon/assets/domains/rfc-0013.md

# 6. Promote 完成后, archive 原 Draft
oxn draft promote rfc-0013 --archive-after
```