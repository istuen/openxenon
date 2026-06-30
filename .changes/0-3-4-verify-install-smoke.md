# 0.3.4 — publish workflow npm registry 传播 + install smoke 修复

> v0.3.2 (npx smoke fail) + v0.3.3 (npm registry propagation >10s 断步) 之后，
> 0.3.4 把 verify + install smoke 合并为单一 retry loop step，加本地 dist/ smoke 前置。

## 背景

v0.3.3 publish workflow 端到端跑通实际 publish 成功：
- ✅ bun install → build → dist verify → **publish**
- ❌ Verify published version: `npm view` after 10s sleep still 404（npm registry 传播 >10s）
- ⏭ Smoke test: blocked by verify step failure

## 修复

```diff
-      # Publish → Verify (sleep 10) → Smoke test (npx)
+      # Publish → Local smoke test (dist/) → Verify + install smoke (retry up to 120s)
```

测试链路（3 层冗余保证 CI 不因 registry 延迟误报）：

| # | Step | 依赖 |
|---|---|---|
| 1 | `bun install` + `bun run build` | — |
| 2 | `Verify dist/` | dist/cli.js exist + shebang |
| 3 | **Publish to npm** | secrets.NPM_TOKEN |
| 4 | **Smoke test (local dist/)** | build 产物（不依赖 npm）|
| 5 | **Verify npm registry + install smoke** | publish 成功 + registry 传播（最多 120s retry）|

### .github/workflows/publish.yml
- 新增 `Smoke test (local dist/)`: publish 后立即用 `node dist/cli.js --version` 验证本地构建
- `Verify published version` + `Smoke test (install)` 合并为 `Verify npm registry + install smoke`:
  - Retry loop: `sleep 10` × `seq 1 12` = **最大 120s** 等 npm registry 传播
  - 传播确认后做 `npm install --prefix` + `node cli.js --version` 端到端验证

### package.json
- `version`: 0.3.3 → **0.3.4**

## 用户动作

- 无 API 变化
- 用于验证 publish.yml 在真实 npm 发布链路上端到端绿色通过
