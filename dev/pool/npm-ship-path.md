---
id: npm-ship-path
theme: npm 发版路径（自举完成 → Release Version）
priority: critical
status: planned
created-at: 2026-07-27
scheduled-version: ~
synced-at: 2026-07-27
note: |
  2026-07-27 grilling session 产出。当前主线目标（Q8）：
  打好正式版本去 npm 发版。GitHub = Dev Version，NPM = Release Version。
  阻塞解除顺序在本文。
---

# npm-ship-path — npm 发版路径

> **目的**：把 v0.6.x (alpha) 自举完成后的版本推到 npm，OXN 从 Dev Version (GitHub) 升级到 Release Version (NPM)。
> **主线目标**（Q8）：当前 OpenXenon 主要目标 = 打好正式版本去发版。
> **版本绑定**：待 `engine-closure-self-verify` 通过后，由工程师 mental commit 决定具体 version 号。

## Dev Version vs Release Version

| 维度 | Dev Version (GitHub) | Release Version (NPM) |
|---|---|---|
| **安装方式** | `git clone` + `bun install` + `bun run build` | `npm install -g @istuen/openxenon` 或 `bun add -g @istuen/openxenon` |
| **目标用户** | 贡献者、内部 dogfood | 终端用户、CI/CD |
| **构建产物** | `dist/cli.js`（用户自编译） | `dist/cli.js`（预编译、签名、压缩）|
| **更新方式** | `git pull` + 手动 rebuild | `npm update -g` |
| **分发渠道** | GitHub Releases | npm registry |
| **二进制入口** | `bun run packages/cli/src/index.ts` | `node dist/cli.js`（Bun 编译产物 + node banner） |

`package.json#bin.oxn = "./dist/cli.js"` 当前已配置。`dist/` 已 gitignore，所以 `files: ["dist"]` 是发版内容。

## 阻塞解除顺序

### Block 1 — Engine 闭环自证（critical）

> 见 [`engine-closure-self-verify.md`](./engine-closure-self-verify.md)

```
1. 跑第一 Scene: dev-workflow 实例化 → Work 闭环
2. 跑第二 Scene: asset-create 实例化 → Asset 生命周期
3. 跑三轴联动: doc-rfc-workflow 实例化 → 单 Work 同时穿过三轴
4. 通过判据: outcome = {completed: ≥4, deviated: 0, inconclusive: 0}
5. 通过 = Block 1 解锁
```

### Block 2 — RFC-0013 Accept（high）

> 走 `doc-rfc-workflow` Blueprint 实例化

```
oxn work create --blueprint doc-rfc-workflow --name "promote-rfc-0013-accept"
  → gather: 收集 .openxenon/drafts/rfc/v0.7.3-ideal-data-flow-rfc.md + version-unification-rfc.md
  → author: 按 RFC 模板编写（已存在，reuse）
  → validate: heading skeleton + term 合规 + D6 自身无 version 字段
  → promote: 落盘 docs/rfc/zh-cn/RFC-0013-versioning-policy.md（补 status: Accepted）
  → frozen.json: outcome = {completed: 4, deviated: 0, inconclusive: 0}
```

注：本 entry 在 RFC-0013 当前 frontmatter 改 `status: Draft → Accepted`（已在 Step 5b 执行），以及补 Errata 段说明 dev/pool/。

### Block 3 — release-cut prerelease-aware Probe 补全（medium）

`release-cut.md` 当前 publish slot 只用 `shell-exec`，需补：

```yaml
### publish
  - deps:
    - verify-build
  - observe:
    - shell-exec
    - npm-publish-dry-run        # 🆕 新增 Probe: npm publish --dry-run 验证
    - npm-tag-check              # 🆕 新增 Probe: 当前 dist-tag 与 next_version 一致
```

新增 Probe 需在 `oxn-proof-domain.md` 注册（builtin-probe-types v0.1 范围扩展到 npm-*）。

### Block 4 — version:check 8 文件一致性（low）

```
bun run version:check
# 期望：8 文件 version 全 = 0.6.2-alpha.0 或调度后的目标版本
```

如不一致：
- `bun run version:sync` 自动同步 8 文件
- 或手动修改 + 重跑 check

### Block 5 — .npmignore + package.json#files 配置（low）

当前配置：

```json
// package.json
{
  "files": ["dist"],
  "bin": { "oxn": "./dist/cli.js" },
  "main": "./dist/cli.js"
}
```

`.npmignore` 检查：
- ✅ `dist/` — 发版内容
- ❌ `packages/` — 不应发（用户自己 build）
- ❌ `tests/` — 不应发
- ❌ `.openxenon/` — 不应发（运行时目录）
- ❌ `docs/` — 不应发（文档走 VitePress 站点）
- ❌ `bun.lock` / `pnpm-lock.yaml` — 二选一
- ❌ `node_modules/` — 标准忽略
- ❌ `*.test.ts` / `__tests__/` — 不应发

### Block 6 — bun publish（low 但不可跳）

```bash
# 1. 确认 dist/ 已 build
bun run build:dist

# 2. dry-run
bun publish --dry-run

# 3. 实际发布
bun publish
# 或指定 tag:
bun publish --tag beta   # prerelease 渠道
bun publish --tag latest # stable 渠道
```

## 发版 checklist（自举完成后执行）

- [ ] Block 1 — Engine 闭环自证（`engine-closure-self-verify.md` 全通过）
- [ ] Block 2 — RFC-0013 Accepted（含 Errata 2026-07-27）
- [ ] Block 3 — release-cut prerelease-aware Probe 补全
- [ ] Block 4 — version:check 8 文件一致性通过
- [ ] Block 5 — .npmignore + package.json#files 配置正确
- [ ] Block 6 — bun publish dry-run 通过
- [ ] 发版后验证：`npm view @istuen/openxenon versions` 含新版本
- [ ] GitHub Release 同步（手动或 release-cut 自动化）
- [ ] `.changes/` 新增对应 `.changes/0-X-Y-ship.md`（ship 完成记录）

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Engine 闭环自证失败 | 中 | 高 | 退到 dev scene 修复 Workflow Asset（Q6 判定：非结构问题）|
| bun publish 与 npm 兼容性 | 低 | 中 | dry-run 先验证；保留 `--ignore-scripts` 选项 |
| dist/ 大小超 npm 包限制（>50MB）| 低 | 低 | 当前 dist < 5MB，预期无问题 |
| prerelease tag 与 latest 冲突 | 低 | 中 | 严格走 RFC-0013 D2 alpha 规则 |

## 参考

- [`engine-closure-self-verify.md`](./engine-closure-self-verify.md) —— Block 1
- RFC-0013 versioning-policy（含 Errata 2026-07-27）
- [`release-cut.md`](../workflows/release-cut.md) —— Block 3 改造对象
- `.changes/0-6-2-rfc-migration.md` —— 历史发版 changelog 参考
- 2026-07-27 grilling session 产出