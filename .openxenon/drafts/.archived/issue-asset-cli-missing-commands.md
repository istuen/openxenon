# Issue: `oxn asset` 缺 diff / migrate / tree / unarchive 命令

- **DraftType**: issue（问题记录）
- **优先级**: P3 产品缺口
- **修复成本**: XL（4 个新命令 + 测试 + 文档）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.7.0+ 长尾；部分依赖 I-4

## 1. 问题

`oxn asset` 当前 7 个子命令（`list` / `show` / `create` / `validate` / `archive` / `delete` / `evolve`）**少了 4 类探索/迁移能力**——存量项目想做以下事无命令可用：

| 缺失能力 | 应有命令 | 用户场景 |
|---|---|---|
| 对比内置默认 | `oxn asset diff <name> --kind X` | "我的 oxn-workflow.md 与内置默认差在哪？" |
| 升级 schema 版本 | `oxn asset migrate <name> --kind X [--from 0.1 --to 0.2]` | "我升级 OXN 后旧 Asset 怎么迁？" |
| 看依赖图 | `oxn asset tree [--root <name>] [--kind X] [--depth N]` | "我这个 Workflow 引用了哪些 Blueprint？" |
| 撤销归档 | `oxn asset unarchive <name> --kind X` | "我误操作 archive 了，能恢复吗？" |

## 2. 现状

### 2.1 无 diff
- builtin registry 暴露内部 `list/get`，但未接入 CLI
- 无 `oxn asset diff` 命令，也无 `--scope` flag 可对比

### 2.2 无 migrate
- 仅 `oxn config migrate-assets` 存在，**只搬目录布局**（v0.5 fallback → v0.6 primary），**不升 schema/不转 .oxn → .md**
- `oxn asset evolve` 不是 migrator——它换名（`--new-name` 必需），不升 version，且当前实现要求 `.oxn` 源（`.md`-only 资产不可用）

### 2.3 无 tree
- `oxn asset validate --check-dag --all` 只能报告环/缺漏，**不画图**
- reverse-reference scanner 是 engine API（`Asset/internal/reference-checker.ts`），未暴露为 CLI
- 无 `oxn asset references` / `oxn asset deps` / `oxn asset tree` 命令

### 2.4 无 unarchive
- `oxn asset archive` 把 `.md` mv 到 `.openxenon/.archived/assets/<kind>s/`
- `oxn asset show` 只查归档目录以提供只读 fallback，**无命令反向 mv 回来**
- 注释中描述"append audit-trail comments"等 unarchive 语义，但未实现

## 3. 影响

- 存量项目升级 OXN 后，schema 不一致的 Asset 只能手工编辑
- 用户无法快速理解一个 Workflow 的完整依赖网
- 误 archive 后无法回退（必须从 `.archived/` 手动 mv）
- 项目无法与内置默认对比——用户不知道内置存在哪些，也不知道何时该 fork

## 4. 修复方向

### 4.1 `oxn asset diff`

```bash
oxn asset diff <name> --kind X [--scope oxn|prj] [--json]
```

输出：unified diff 或结构化 `{added, removed, modified, metadata_diff}`。

实现：复用 builtin registry 的 `get()` + 项目文件 read，调用同一个 compiler 解析两边得 IR，对比 IR。

**前置依赖**：I-4（需要 builtin 5 类接入 registry）。

### 4.2 `oxn asset migrate`

```bash
oxn asset migrate <name> --kind X [--from <version>] [--to <version>] [--dry-run] [--force]
```

实现：
- 读取 frontmatter `entity` + `version`
- 查 kind compiler 的 migration map（`compiler.migrations: Record<string, MigrationStep>`）
- 按 migration step chain 顺序升级（dry-run 只打印不写）
- 每次升级写 audit log

**前置依赖**：每个 kind compiler 提供 `migrations` 元数据（当前 0 个有）。

### 4.3 `oxn asset tree`

```bash
oxn asset tree [--root <name>] [--kind X] [--depth N] [--direction forward|reverse|both]
```

实现：复用 reverse-reference scanner，从 root Asset 起沿 references / citations DFS，画树状文本或 JSON graph。

**前置依赖**：无（独立可做）。

### 4.4 `oxn asset unarchive`

```bash
oxn asset unarchive <name> --kind X [--json]
```

实现：archive 的反操作——从 `.openxenon/.archived/assets/<kind>s/<name>.md` mv 回 active 目录，删除 `<name>.metadata.json`。

**前置依赖**：无（独立可做）。但要先修 `oxn asset delete` 的注释错误（`delete.ts:35-43` 说 archived 拒绝，实际不读 archive）。

## 5. 验证

```bash
# diff
oxn asset diff oxn-workflow --kind workflow --scope oxn
# 期望：项目有覆盖时输出 modified 段，无覆盖时输出"no override"

# migrate
oxn asset migrate oxn-workflow --kind workflow --dry-run
# 期望：列出待应用的 migration steps

# tree
oxn asset tree --root dev-workflow --kind workflow --depth 2
# 期望：树状输出引用的 blueprint + workflow

# unarchive
oxn asset archive oxn-workflow --kind workflow --reason test
oxn asset unarchive oxn-workflow --kind workflow
oxn asset list --kind workflow | grep oxn-workflow
# 期望：再次出现在 active 列表
```

## 6. Promote 路径

4 个命令拆 4 个 RFC（每个命令独立设计空间）：
- `RFC-XXXX-asset-diff.md`
- `RFC-XXXX-asset-migrate.md`
- `RFC-XXXX-asset-tree.md`
- `RFC-XXXX-asset-unarchive.md`

每个 RFC 同步 Doc(dev) + changelog。

Roadmap `oxn-system.md` 加 scene：dev / debug 加这 4 命令的入口说明。

## 7. 优先级细化

| 命令 | 单独优先级 | 原因 |
|---|---|---|
| unarchive | P3-M | 用户期望对称，archive 后必须能 unarchive |
| tree | P3-M | debug 场景必备（"这个 Workflow 引用了什么"） |
| diff | P3-L | 依赖 I-4，等 RFC-0011 全量落地 |
| migrate | P3-XL | 每个 kind compiler 都要先实现 migrations 元数据 |