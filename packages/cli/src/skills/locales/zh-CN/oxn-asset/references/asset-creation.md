# Asset 创建流程

> 本文件是 `oxn-asset` Skill 的按需加载补充。创建新 Asset 时查阅。

## 创建流程（5 步）

### 步骤 1：选择 AssetKind + 模板

从 `assets/` 目录选对应模板：
- `assets/domain.md` → 5 个 H3 实例 + 1 个 `forbidden-constructs` H3 + 3 个 inv-* H3
- `assets/blueprint.md` → 2 个 prop H3 + 3 个 slot H3（带 deps / observe）
- `assets/stack.md` → 2 个 runtime + 1 个 linter + 1 个 test
- `assets/library.md` → N 个 source H3
- `assets/external.md` → N 个 link H3

### 步骤 2：fork 模板

```bash
cp docs/zh-cn/asset-templates/domain.md /tmp/MyDomain.md
# 编辑：name / abstract / references / citations / Terms / Bans / Invariants
```

### 步骤 3：填字段

每个模板的 H3 都有**最小示例**，按示例改：
- Domain: term 名 + desc，ban 名 + items，invariant 名 + value
- Blueprint: prop 名 + type/values/required/default，slot 名 + deps/observe
- Stack: runtime 名 + version，linter 名 + config，test 名 + command/coverage
- Library: source 名 + url/version/fetched/summary
- External: link 名 + url/kind/ttl/auth/summary

### 步骤 4：写盘（CLI 触发 Work 模式）

```bash
# 触发 Asset 模式 Work（IAP 闭环）
oxn work create MyDomain --type asset --asset-kind domain --json

# 或 fast-path CLI（绕过 IAP，仅 v0.6.1-alpha.0 可用）
oxn domain create MyDomain
```

### 步骤 5：自动 sync

Asset 模式 Work 完成后，OXN 自动 sync：
- 写 `.openxenon/assets/<kind>/<name>.oxn`（或 v0.5 fallback `domains/blueprints/`）
- 写 `.openxenon/assets/<kinds>-md/<name>.md`（MD 镜像）
- planLock 锁定
- chmod 0o444（只读）

## 创建 vs 修改 vs 删除

| 操作 | 触发 | 输出 |
|---|---|---|
| 创建 | 本文件 5 步 | 新 .oxn + .md 镜像 |
| 修改 | `references/asset-evolution.md` | 旧版备份 + 新版 |
| 删除 | `references/asset-lifecycle.md` | 归档目录 `.archived/` + git history |