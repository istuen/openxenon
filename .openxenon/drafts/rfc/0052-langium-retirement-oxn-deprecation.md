# ADR-0052: Langium Retirement & .oxn Deprecation

## 状态

🟢 已实施（v0.6.1）

## 背景

v0.6.1 完成了 MD-native 语法改革（`:::intent{...}` → 纯 MD），`.md` 成为 canonical 格式，`.oxn` 不再保留。v0.6.1 需要彻底切割：删除 Langium 基础设施、移除全部 `.oxn` 文件、CLI 移除 `--oxn-legacy` flag。

**量化影响**：
- 79 个 git-tracked `.oxn` 文件删除
- 2 个 npm 依赖移除（`langium ^4.3.0` + `langium-cli ^4.3.0`）
- 1 个目录删除（`packages/engine/src/oxl/langium-driver/`，8 个文件）
- CLI 7 个子命令删除（compile/sync/sync-md × domain/blueprint/work）
- 17 个测试文件删除 + 8 个混合文件清理（166 → 0 failures）

## 决策

### D9: Langium 退役

删除全部 Langium 基础设施：
- `packages/engine/src/oxl/langium-driver/`（grammar + generated + driver + services）
- npm 依赖 `langium` + `langium-cli`
- build script `langium:generate`

### D10: .oxn canonical 翻转

`.md` 成为唯一格式。所有 `.oxn` 文件 git rm，不保留 fallback。

### D11: 不做反向同步

不实现 `.md → .oxn` 同步工具。v0.6.1 后 `.oxn` 文件不被解析，错误信息引导写 `.md`。

## 实施

### Phase A（代码切割）

| 任务 | 内容 | 状态 |
|---|---|---|
| A0 | Runtime .md-first 加载 | ✅ |
| A1 | git rm 79 .oxn files | ✅ |
| A2 | git rm langium-driver/ | ✅ |
| A3 | CLI/Engine Langium 引用移除 | ✅ |
| A4-A7 | builtin/examples/docs/assets .oxn→.md | ✅（A1 覆盖） |
| A8 | 移除 CLI `--oxn-legacy` flag | ✅（仅残留注释） |
| A9 | 移除 OxlDriver 两路径切换 | ✅（仅残留注释） |
| A10 | CI 守卫 | ✅（`check:no-langium`） |
| A11 | 验证全量测试通过 | ✅ 1487 pass, 0 fail |

### Phase B（文档清理）

| 任务 | 内容 | 状态 |
|---|---|---|
| B1-B3 | docs .oxn 引用清理（25+ 文件） | ✅ |
| B4 | ADR-0057 记录废弃决策 | ✅（本 ADR） |
| B5 | AGENTS.md 更新 | ✅ |
| B6 | changelog 片段 | ✅ |

## 后果

**正面**：
- 维护成本降低：单解析路径（mdast），不再维护两套
- npm 依赖减少 ~2MB
- 构建时间减少（无 langium generate）
- 用户不再困惑于两种格式

**负面**：
- v0.6.x 用户的 `.oxn` 文件在 v0.6.1 后无法解析
- 运行时产物（`.openxenon/works/`）中的 `.oxn` 文件被忽略（不影响核心功能）

**缓解**：
- v0.6.1 release notes 明确说明 breaking change
- `.md` 文件在 v0.6.1 已存在（双轨期间已生成）
