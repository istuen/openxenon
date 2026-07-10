# Intent Pool 运作方式

> **角色**：详解 Intent Pool 从**创建 → 写入 → 冻结 → 扫描 → 归档**的完整生命周期
>
> **读者**：理解 Pool 内部机制的 AI 协作者 / 人类协作者 / 自动化脚本作者
>
> **版本**：v0.2.0（v0.3 阶段 2 后冻结）
>
> **关联**：[`pool-roadmap.md`](./pool-roadmap.md)（导航）· [`naming-system.md`](./naming-system.md)（命名规范）

---

## What — Pool 是什么（再述）

Intent Pool 是 OpenXenon v0.2.0（T13）实施的**思考资产池**。每个 Pool 文档是一个 `.md` 文件 + 一个不可变 `frozen.json` 元数据文件，按 5 类池分类存放在 `.openxenon/pools/<type>/` 下。

**5 类池**：

| 池 | 用途 | 何时使用 |
|---|---|---|
| `research/` | 调研材料、技术雷达 | 调研新工具/方案时 |
| `design/` | 架构决策、设计稿、流程 | 设计阶段 |
| `issue/` | bug 报告、风险评估 | 发现问题时 |
| `audit/` | 准备度审计、复盘 | 版本收尾 |
| `journal/` | 关键决策日志 | 关键节点 |

---

## Why — 为什么需要这套运作机制

**问题**（v0.1.x 时代）：
- forges/ 单一目录，51 文档无分类
- 无元数据，无法追溯文档版本/作者/状态
- 无 CLI，全靠 `touch` 手动创建
- Hall 扫描时无法快速识别文档类型

**解决**（v0.2.0）：
- 5 类池按"思考类型"分类
- 每文档配 `frozen.json`（content hash + 元数据 + chmod 0o444 不可变）
- `oxn pool create/list/show` CLI
- Hall `scanIntentPools` 5 池扫描

---

## How — Pool 完整生命周期

### 1. 创建（Create）

**方式 A — CLI 推荐**：

```bash
oxn pool create <type> <name>
```

示例：
```bash
oxn pool create design arch-md-ssot-system
# → .openxenon/pools/design/arch-md-ssot-system.md（可写）
# → .openxenon/pools/design/arch-md-ssot-system/frozen.json（0o444 不可变）
```

实现位置：`src/cli/pool-create.ts:1`

**方式 B — 手动**（v0.3 阶段 2 前 CLI 不可用时）：

```bash
mkdir -p .openxenon/pools/design
touch .openxenon/pools/design/<name>.md
# 手动写 frozen.json（可省略，Hall 扫描时容错）
```

---

### 2. 命名（Naming）

遵循 [`naming-system.md`](./naming-system.md) v1.0 规范：

| 元素 | 规则 | 示例 |
|---|---|---|
| `<type>` | 5 类池之一 | `design` |
| `<scope>` | 与所在目录对齐 | `arch-` `process-` `audit-` `journal-` |
| `<topic-slug>` | kebab-case，简洁 | `md-ssot-system` |
| `-v<X.Y.Z>` | 阶段文档必带，跨切文档省略 | `-v0.3.0` |

**典型命名**：

```
pools/design/arch-md-ssot-system.md           # 跨切架构（无版本）
pools/design/req-md-ssot-v0.3.0.md            # v0.3 阶段文档（带版本）
pools/journal/2026-06-20-md-ssot-decision.md  # 日志（日期前缀）
pools/audit/audit-v0.2.0-md-ssot-readiness.md # 审计（带版本）
```

---

### 3. 写入（Write）

**pool-writer.ts** 写入逻辑（`src/infra/frozen/pool-writer.ts:1`）：

```typescript
export type IntentPool = 'research' | 'design' | 'issue' | 'audit' | 'journal'

export interface WritePoolEntryInput {
  pool: IntentPool
  slug: string                      // 池内唯一标识
  title: string                     // markdown 一级标题
  content: string                   // 完整 markdown 内容
  metadata?: Record<string, unknown>
}

export async function writePoolEntry(
  projectRoot: string,
  input: WritePoolEntryInput,
): Promise<WritePoolEntryOutput>
```

**写入流程**：

```
input.content
    ↓
1. 校验 slug: /^[a-z0-9][a-z0-9-]*$/
    ↓
2. 计算 SHA-256: createHash('sha256').update(content)
    ↓
3. 写 .md 文件: mkdir + writeFile（可写）
    ↓
4. 写 frozen.json: writeFrozenImmutable（chmod 0o444 不可变）
    ↓
5. 返回 { path, frozenPath, hash }
```

**frozen.json schema**（v0.2.0）：

```json
{
  "schema_version": "1",
  "pool": "design",
  "slug": "arch-md-ssot-system",
  "title": "MD-SSOT 系统架构",
  "created_at": "2026-06-20T23:00:00Z",
  "content_hash": "sha256:abc123...",
  "metadata": {
    "version": "v0.3.0",
    "status": "draft",
    "scope": "arch",
    "tags": ["md-ssot", "v0.3", "route-c-v2"]
  }
}
```

**关键字段**：

| 字段 | 角色 | 校验 |
|---|---|---|
| `schema_version` | 冻结格式版本 | 必须 `"1"` |
| `pool` | 池类型 | 必须 5 类之一 |
| `slug` | 池内唯一标识 | 必须符合 `^[a-z0-9][a-z0-9-]*$` |
| `content_hash` | 内容 SHA-256 | sha256 格式 |
| `metadata.version` | 文档版本 | v<X.Y.Z> |
| `metadata.status` | 文档状态 | draft/wip/done/deprecated |

---

### 4. 冻结（Freeze）

**不可变性**：frozen.json 写入后立即 `chmod 0o444`（只读）。

```typescript
import { writeFrozenImmutable, FROZEN_FILE_MODE } from '../frozen/immutable'
// FROZEN_FILE_MODE = 0o444
```

**意义**：
- 防止手工编辑篡改元数据
- 防止 content_hash 与 content 不一致
- 审计追踪更可靠

**修改流程**：必须删除 → 重新创建（CLI 或手动）。

---

### 5. 扫描（Scan — Hall）

**Hall 扫描入口**（`src/hall/index.ts:scanIntentPools`）：

```typescript
export function scanIntentPools(projectRoot: string): IntentPoolEntry[] {
  const poolsDir = join(projectRoot, '.openxenon', 'pools')
  if (!existsSync(poolsDir)) return []

  const entries: IntentPoolEntry[] = []
  const pools: Array<IntentPool> = ['research', 'design', 'issue', 'audit', 'journal']

  for (const pool of pools) {
    const poolDir = join(poolsDir, pool)
    if (!existsSync(poolDir)) continue

    const list = readdirSync(poolDir, { withFileTypes: true })
    for (const entry of list) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const slug = entry.name.replace(/\.md$/, '')
      const frozenPath = join(poolDir, slug, 'frozen.json')

      // 读取 frozen.json（若存在）
      let frozen: FrozenPoolEntry | undefined
      if (existsSync(frozenPath)) {
        frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
      }

      entries.push({
        pool,
        slug,
        path: entry.path,
        title: extractTitle(readFileSync(entry.path, 'utf-8')),
        frozen,
      })
    }
  }

  return entries
}
```

**扫描产物**：`IntentPoolEntry[]`

```typescript
interface IntentPoolEntry {
  pool: IntentPool
  slug: string
  path: string              // .md 路径
  title: string             // 从 # 一级标题提取
  frozen?: FrozenPoolEntry  // frozen.json 内容（可选）
}
```

**调用点**：
- `oxn pool list` — 列出所有 Pool 文档
- `oxn pool show <name>` — 查看详情
- `oxn insight` — 生成 Insight 报告（含 Pool 文档统计）
- `oxn hall scan` — 全项目扫描

---

### 6. 校验（Validate — v0.3 阶段 2）

v0.3 阶段 2 将实施 2 个 CI 校验脚本：

#### 6.1 heading-skeleton 校验

脚本：`bun scripts/check-heading-skeleton.ts`

**规则**：每个 Pool 文档必须有标准 heading 骨架：

```markdown
# <标题>

> **角色**：...
> **读者**：...
> **版本**：v<X.Y.Z> / @<status>
> **关联**：...

---

## What — ...

## Why — ...

## How — ...
```

**退出码**：0 通过 / 1 失败。

#### 6.2 naming 校验

脚本：`bun scripts/check-naming.ts`

**规则**：
- 文件名格式 `<scope>-<topic>[-v<X.Y.Z>][@<status>].md`
- `<scope>` 与所在目录语义对齐
- 阶段文档必须带 `-v<X.Y.Z>`
- slug 必须符合 `^[a-z0-9][a-z0-9-]*$`

---

### 7. 归档（Archive）

**废弃流程**：

1. 在文档头部加 `> [DEPRECATED] <reason>` 标记
2. 在 `pool-roadmap.md` §维护规则记录废弃原因
3. 移动到 `pools/_archive/<YYYY-MM>/`（v0.3 阶段 2 启用 `_archive/` 目录）
4. 不立即删除（保留 3 个月可回溯期）

**归档路径示例**：

```
pools/_archive/2026-09/design/old-design.md
pools/_archive/2026-09/design/old-design/frozen.json
```

---

### 8. 跨引用（Cross-Reference）

**Pool 文档之间**：

```markdown
完整规范见 [`naming-system.md`](./naming-system.md) §2-§4。

**v0.3 解决**：[`process-version-iteration-flow.md`](./process-version-iteration-flow.md)
```

**与 IAP 资产**：

```markdown
- **Domain 资产**：[`domains/MD-SSOT-System.md`](../../domains/MD-SSOT-System.md)
- **Blueprint 资产**：[`blueprints/v0.3-md-ssot-implementation.md`](../../blueprints/v0.3-md-ssot-implementation.md)
```

**与 CLI 命令**：

```markdown
oxn pool create <type> <name>     # 推荐：CLI（v0.2.0 已实施）
```

---

## 物理结构图（v0.2.0 实施后）

```
.openxenon/pools/
├── pool-roadmap.md                  # [tracked] 顶层入口
├── research/
│   ├── .gitkeep                     # [tracked] 空目录占位
│   └── 2026-07-mdx-parser-research/
│       ├── 2026-07-mdx-parser-research.md    # [gitignored]
│       └── frozen.json                        # [gitignored, 0o444]
├── design/
│   ├── .gitkeep
│   ├── arch-md-ssot-system/
│   │   ├── arch-md-ssot-system.md
│   │   └── frozen.json
│   ├── naming-system/
│   │   ├── naming-system.md
│   │   └── frozen.json
│   └── ... (11 个文档)
├── issue/
│   └── .gitkeep
├── audit/
│   ├── .gitkeep
│   ├── audit-v0.2.0-md-ssot-readiness/
│   │   ├── audit-v0.2.0-md-ssot-readiness.md
│   │   └── frozen.json
│   └── retro-v0.2.0-roadmap-execution/
│       ├── retro-v0.2.0-roadmap-execution.md
│       └── frozen.json
└── journal/
    ├── .gitkeep
    └── 2026-06-20-md-ssot-decision/
        ├── 2026-06-20-md-ssot-decision.md
        └── frozen.json
```

**tracked vs gitignored**：

| 项 | tracked | gitignored |
|---|---|---|
| `pool-roadmap.md`（顶层入口）| ✅ | — |
| 各池 `<type>/.gitkeep` | ✅ | — |
| 各池文档 `<name>.md` | — | ✅ |
| 各池文档 `frozen.json` | — | ✅ |

`.gitignore` 规则：
```
.openxenon/forges/
.openxenon/pools/*/*/frozen.json
.openxenon/pools/*/!(.gitkeep)
```

---

## CLI 命令完整列表

| 命令 | 角色 | v0.2.0 | v0.3 增强 |
|---|---|---|---|
| `oxn pool list` | 列出所有 Pool 文档 | ✅ | + 按 type 过滤 |
| `oxn pool create <type> <name>` | 新建 Pool 文档 | ✅ | + 模板选择 |
| `oxn pool show <name>` | 查看详情 | ✅ | + 显示 hash 链 |
| `oxn pool archive <name>` | 归档（v0.3 新增）| ⏳ | + 自动重写路径 |
| `oxn pool validate` | 校验所有文档 | ⏳ | heading + naming |

---

## 与其他系统的协作

### Pool ↔ IAP Intent（`domains/` `blueprints/`）

| 关系 | 角色 |
|---|---|
| Pool `design/` | 架构决策 → Domain as SSOT 引用 |
| Pool `audit/` | 准备度审计 → Blueprint 引用 |

### Pool ↔ IAP Align（`works/` `tasks/`）

| 关系 | 角色 |
|---|---|
| Pool `design/` | 阶段文档 → Work plan 引用 |
| Pool `journal/` | 关键决策 → Work submit 审计 |

### Pool ↔ IAP Proof（`proofs/`）

| 关系 | 角色 |
|---|---|
| Pool `audit/` | 准备度审计 → Proof verdict 关联 |

### Pool ↔ forges/（v0.1.x 兼容期）

| 关系 | 角色 |
|---|---|
| T8 + T13 实施时 | 部分 forges/ 已迁至 pools/ |
| v0.3 阶段 3 | 51 forges/ 全量迁移到 pools/ |
| v0.3 阶段 5 | forges/ 物理删除 |

---

## 维护规则总结

| 场景 | 操作 |
|---|---|
| **新增文档** | `oxn pool create <type> <name>` → 写 heading 骨架 → 同步 `pool-roadmap.md` |
| **修改文档** | 直接编辑 `.md`（frozen.json 保留旧 hash，hash mismatch 是审计信号）|
| **重命名** | 旧文档标记 `[DEPRECATED]` + 归档 + 创建新文档 + `pool-roadmap.md` 同步 |
| **废弃** | 加 `[DEPRECATED]` 标记 + 移动到 `_archive/` |
| **跨引用** | 优先使用相对路径（`./<name>.md`）|

---

## v0.3 阶段 2 改进清单

- [ ] 启用 `bun scripts/check-heading-skeleton.ts` CI 校验
- [ ] 启用 `bun scripts/check-naming.ts` CI 校验
- [ ] 启用 `oxn pool validate` 子命令
- [ ] 启用 `oxn pool archive` 子命令
- [ ] 启用 `pools/_archive/` 归档目录
- [ ] pool-writer 增强 metadata 字段（status/tags/scope 强制）

---

## 参考

- [`pool-roadmap.md`](./pool-roadmap.md) — Pool 导航地图
- [`naming-system.md`](./naming-system.md) — 命名规范权威源
- [`process-forges-deprecation-migration.md`](./process-forges-deprecation-migration.md) — 51 forges/ → pools/ 迁移
- `src/cli/pool.ts` `pool-list.ts` `pool-create.ts` — CLI 实现
- `src/infra/frozen/pool-writer.ts` — 写入器实现
- `src/hall/index.ts:scanIntentPools` — Hall 扫描实现
