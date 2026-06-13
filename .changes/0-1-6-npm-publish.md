# 0.1.6 — npm publish flow

> Chore: 首个 npm scoped public 包发布 (v0.1.6)

## 变更

### package.json (5 字段)
- `name`: `openxenon` → `@istuen/openxenon` (scoped, 避免与 unscoped 冲突)
- `author`: `OpenXenon Team` → `istuen` (npm 账号名)
- `repository.url`: `https://github.com/openxenon/openxenon.git` → `https://github.com/istuen/openxenon.git` (实际仓库)
- `homepage`: `https://openxenon.dev` → `https://github.com/istuen/openxenon#readme` (决策 #3)
- `bugs.url`: 同步修仓库路径

`bin.oxn` 不变 — 用户安装命令名仍为 `oxn`:
```bash
npm install -g @istuen/openxenon
oxn --version
```

### 新增 .github/workflows/publish.yml (64 行)
- 触发: push `v*.*.*` tag 或 `workflow_dispatch` 手动指定
- 步骤: checkout → setup-bun → `bun install --frozen-lockfile` → `bun run prepublish:check` (typecheck + lint + test) → `bun run build` → 验证 `dist/cli.js` → `npm publish --access public` → `npm view` 验证 → `npx -y @istuen/openxenon@latest --version` smoke test
- permissions: `contents: read` + `id-token: write` (启用 npm provenance 信任链)
- 凭据: `secrets.NPM_TOKEN` (GAT, bypass 2FA, scope `@istuen/openxenon`, 90d expiration)

### 新增 .npmignore (27 行)
- 排除开发文件: `src/`, `tests/`, `.openxenon/`, `.github/`, `docs/`, `.changes/`, `scripts/`
- 排除隐藏文件 + IDE 配置 + 日志
- 显式列出, 不依赖 npm 默认忽略规则
- Tarball 内容验证 (`npm pack --dry-run`): 仅含 `dist/cli.js` + `dist/SKILL-*.md` + `package.json` + `README.md` + `LICENSE`, 531.5 kB

### README.md (4 字段增量)
- 顶部加 3 徽章: npm version, License, Node version
- 新增 `## Install` 块: `npm install -g @istuen/openxenon` + `npx` 临时调用
- 修正 clone URL: `anomalyco/openxenon` → `istuen/openxenon`
- 区分源码构建 (`./dist/oxn`) vs npm 安装 (`oxn` 在 PATH) 两种用法
- 修正 dist 产物注释: `dist/oxn` → `dist/cli.js` (Bun 编译产物名)

## 验证

- `npm pack --dry-run`: 7 文件, 531.5 kB, 不含敏感文件
- `npm whoami`: `istuen` (凭据 OK)
- `npm view @istuen/openxenon`: 期望 `version: 0.1.6`
- `npx -y @istuen/openxenon --version`: 期望 `0.1.6` (smoke test)
- GitHub Actions publish.yml: 推 `v0.1.6` tag 触发完整闭环

## 范围外 / 已知问题

- `dist/types/` 未生成 (pre-existing bug: `tsc --emitDeclarationOnly` 在当前 tsconfig 下无输出). `package.json` 的 `types: ./dist/types/index.d.ts` 字段当前指向不存在路径. 不在本次 npm publish scope, 后续 PR 修.
- `docs-bak-2026-06/` 备份目录未跟踪 (pre-existing, 本次变更无关).
