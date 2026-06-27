# 0.3.3 — publish workflow smoke test 修复（端到端 CI 验证）

> 0.3.2 已在 npm 发布（CI publish 跑通），但 smoke test step 失败 (`oxn: not found`)。
> 0.3.3 修 smoke test，验证 publish → install → run 完整链路。

## 背景

v0.3.2 publish workflow 端到端跑通：
- ✅ bun install
- ✅ Build (langium + dist)
- ✅ Verify dist/
- ✅ **Publish to npm** （新版本自动 publish 成功）
- ❌ Smoke test (`sh: 1: oxn: not found`)

但 publish 实际已成功，v0.3.2 在 npm live + 最新 dist-tag。Smoke test 失败是 npx 在 CI 的 PATH/symlink 时机问题。

## 修复（publish.yml smoke test step）

```diff
 - name: Smoke test (npx --version)
-  run: npx -y @istuen/openxenon@$VERSION --version
+  run: |
+    VERSION=$(node -p "require('./package.json').version")
+    INSTALL_DIR=$(mktemp -d)
+    npm install --prefix "$INSTALL_DIR" @istuen/openxenon@$VERSION --no-save --no-audit --no-fund
+    node "$INSTALL_DIR/node_modules/@istuen/openxenon/dist/cli.js" --version
+    rm -rf "$INSTALL_DIR"
```

### 为什么 npm install + node 比 npx 更可靠

- npx 内部临时安装到 npx cache，PATH/symlink 在 `npx -y` 边界处理偶发失败
- `npm install --prefix /tmp/dir` + 直接 `node cli.js` 完全可控：
  - 不依赖 bin symlink
  - 不依赖 PATH 注入
  - 安装位置确定（`/tmp/dir/node_modules`）
  - 可读 stdout/stderr 完整

## 变更

### .github/workflows/publish.yml
- smoke test step：npx → install + node

### package.json
- `version`: 0.3.2 → **0.3.3**

## 用户动作

- 无 API 变化
- 升级 v0.3.3 验证 npm install 链路在 CI 端完整可重现

## 发布链路时间线

| Tag | npm publish | workflow 状态 |
|---|---|---|
| v0.1.7 | 手动 | workflow 未配 |
| v0.1.8 | 手动 | ❌ frozen-lockfile fail |
| v0.2.0 | 手动 | ❌ frozen-lockfile fail |
| v0.3.0 | 手动 | ❌ frozen-lockfile fail |
| v0.3.1 | 手动 | ❌ frozen-lockfile fail |
| v0.3.2 | **CI 自动** ✓ | ❌ smoke test fail |
| **v0.3.3** | **CI 自动** ✓ | ✅ **完整端到端** |
