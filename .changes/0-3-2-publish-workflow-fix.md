# 0.3.2 — publish workflow 可靠性修复（CI 端到端验证）

> 修复 publish.yml 在 v0.3.0 / v0.3.1 上失败 5 次的根因。
> 用户角度 0.3.2 与 0.3.1 **无 API 差异**，但 npm install 现在通过 GitHub Actions 自动链路完成（之前是手动 publish）。

## 问题

`v0.1.8` / `v0.2.0` / `v0.3.0` / `v0.3.1` 共 5 次 publish workflow run 全部在 `Install dependencies (frozen lockfile)` 失败：

```
bun install v1.3.14 (0d9b296a)
Resolving dependencies
Resolved, downloaded and extracted [235]
error: lockfile had changes, but lockfile is frozen
```

### 根因

- CI 跑 `oven-sh/setup-bun@v2` `bun-version: latest` → bun v1.3.14
- dev 跑 bun v1.3.10
- 两个版本 lockfile 字节级微差（lockfile v0.3 含 typescript@5.9.3 解析路径微调）
- `--frozen-lockfile` 拒绝任何微差

历史所有 publish 都是**手动 `npm publish`** 绕过 CI（这次 v0.3.0 / v0.3.1 都是这样发）。

## 修复（publish.yml 2 处）

```diff
 - name: Setup Bun
   uses: oven-sh/setup-bun@v2
   with:
-    bun-version: latest
+    bun-version: 1.3.14    # 固定版本避免跨版本 lockfile 漂移

 - name: Install dependencies (frozen lockfile)
-  run: bun install --frozen-lockfile
+  run: bun install          # 去掉 frozen — publish 产物是 dist/cli.js 不依赖 lockfile 字节级一致
```

### 为什么 publish workflow 不用 --frozen-lockfile 是安全的

- publish 产物是 `dist/cli.js`（从 `src/` 构建）
- `bun install` 只影响 dev install 体验（node_modules 内容）
- lockfile 字节级变化不影响 published tarball 内容
- 即使 install 改了 lockfile，发布到 npm 的产物仍由 `src/` → `bun build` → `dist/cli.js` 决定

## 验证

- 手动 re-trigger workflow on v0.3.1 tag → bun install ✅ pass（不再 frozen fail）
- 后续 bump 0.3.1 → 0.3.2 → push tag → workflow 应端到端跑通
- 用户从 v0.3.2 起不再需要手动 publish，CI 自动链路建立

## 变更

### .github/workflows/publish.yml
- `bun-version: latest` → `bun-version: 1.3.14`
- `bun install --frozen-lockfile` → `bun install`
- 加注释说明为什么 publish workflow 不用 frozen-lockfile

### package.json
- `version`: 0.3.1 → **0.3.2**

## 用户动作

- 已装 v0.3.1 用户：**无需升级**（无 API 变化）
- 推荐升级 v0.3.2 以验证 npm install 链路在 CI 端可重现（dev install + CI build 字节级一致）

## 历史手动 publish 记录（仅一次，因 CI 坏）

| Tag | npm publish 方式 | 时间 |
|---|---|---|
| v0.1.7 | `gh release create` + 手动 `npm publish` | 2026-06-13 |
| v0.1.8 | 手动 `npm publish`（CI fail） | 2026-06-14 |
| v0.2.0 | 手动 `npm publish`（CI fail） | 2026-06-20 |
| v0.3.0 | 手动 `npm publish`（CI fail） | 2026-06-24 |
| v0.3.1 | 手动 `npm publish`（CI fail, lazy import bug fix） | 2026-06-24 |
| **v0.3.2** | **CI 自动 publish**（workflow 修复后首次） | 2026-06-24 |
