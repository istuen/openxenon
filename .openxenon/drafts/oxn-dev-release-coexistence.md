---
id: oxn-dev-release-coexistence
theme: OXN CLI Dev 版 / Release 版共存与 pnpm 包管理迁移（阶段 1）
status: planned
created-at: 2026-07-30
synced-at: 2026-07-30
note: |
  2026-07-30 `/grilling` session 产出。核心问题：OXN CLI 在同一台机器上，需要在
  "本地 monorepo 构建版（Dev）"和"npm 全局安装的正式版（Release）"之间二选一切换，
  Skill 中写死的 `oxn` 命令名不可改。
  阶段 1 方案：包管理切 pnpm，构建/测试保留 bun，oxn 切换走 link/unlink 串行切换。
  本文是执行计划。Step 0 spike 必须先验证"R2：pnpm node_modules + bun test 兼容性"
  这个核心假设，spike 通过才进入 Step 1-4。
---

# OXN Dev 版 / Release 版共存 + pnpm 包管理迁移（阶段 1）

## 0. 背景与核心矛盾

### 0.1 原始问题

用户需要用打包后的 OXN CLI 做"真实试用"，但当前 OXN 是开发中的 monorepo，没有可独立安装的正式版。需求拆为两点：

1. **正式版 NPM**：作为对外使用 + bug 复原追踪的不可变基线
2. **开发版**：作为发布前的完整测试与联调（在 AI Agent 中）

两个版本都要 `oxn` 命令名（Skill 写死 `oxn *`，不能改），同一台机器同一时刻只能有一个 `oxn` 生效。

### 0.2 Grilling 中揭露的现状矛盾

| # | 现状 | 矛盾点 |
|---|---|---|
| C1 | 仓库是 **Bun-based**（`bun.lock` tracked，`pnpm-lock.yaml` gitignored，AGENTS.md 明示用 Bun） | 与"pnpm 管理"理念冲突 |
| C2 | 当前"oxn"是 **`npm link` 指向仓库 `/dist/cli.js`**（`/opt/homebrew/lib/node_modules/@istuen/openxenon` 符号链接） | 用户原话"现有的 OXN 是通过 NPM 安装"暗示这是真实安装，实际是 link；每次 `bun run build` 都会污染这个"release"基线 |
| C3 | registry 实际只有 **`@istuen/openxenon@0.4.0`**（pre-monorepo）；`@openxenon/cli`、`@istuen/openxenon-cli` 均 registry 404 | 0.6.2-alpha.0 从未发布；`npm install -g` 会装到与 0.6.x skills/assets 不兼容的 0.4.0 |
| C4 | `index.ts:140` 是唯一版本源（`pkg.version`），无 build hash / git SHA / dev-release 标记 | bug 报告只带版本号时，无法区分"dev 带未提交改动"与"release 不可变基线" |
| C5 | 122 个测试文件用 `import ... from 'bun:test'` | 切 pnpm 不等于切 bun test；真迁移会牵连 1487 个测试 |

### 0.3 已锁定决策（grilling 4 轮交互结果）

| 决策点 | 选择 | 来源 |
|---|---|---|
| "正式版 NPM" 含义 | 真正发版到 npm registry（Block 1-6 轨道）；`npm pack` tarball 作同质占位 | 第 1 轮 |
| Dev / Release 共存 | **串行**（`pnpm link --global` ↔ `npm install -g` 二选一），放弃 simultaneity | 第 3 轮（推翻第 2 轮"需要同时"） |
| 包管理器 | **pnpm**（包管理 + workspace 层），但**构建/测试保留 bun**（阶段 1） | 第 4 轮（用户的阶段化方案） |
| 构建抽象 | 通过 `package.json#scripts` 抽象 `build` 命令；未来换 tsup 只改一行 | 第 4 轮 |
| Dev / Release 区分 | **Version Hygiene**（dev 版本号 > 已发布 release 版本号），不注入 build metadata | 第 2 轮 |
| Release 基线当前来源 | **`npm pack` 本地 tarball**（不可变，与未来 npm 发版同质） | 第 3 轮 |

## 1. 关键术语锁定（domain-modeling 交付）

| 术语 | 定义 | 所属 context |
|---|---|---|
| **Version Hygiene** | dev 版本号始终严格大于已发布 release 版本号；是 Dev Version 与 Release Version 在运行时的唯一区分器。不注入 build metadata（git SHA / build 标记 / "dev" 后缀）。判据：`oxn --version` 在 dev shell 与 release shell 输出不同字符串。 | OxnCliDomain + OxnProjectDomain |
| **Dev Version**（已存在） | 通过本地仓库 `pnpm link --global` 注册的 oxn；指向仓库 `dist/cli.js`；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用 | OxnCliDomain + OxnProjectDomain |
| **Release Version**（已存在） | 通过 `npm install -g @istuen/openxenon@<version>` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用 | OxnCliDomain + OxnProjectDomain |
| **oxn-switch** | 在 Dev Version 与 Release Version 之间切换的命令工具（`pnpm oxn:dev` / `pnpm oxn:prod` / `pnpm oxn:status`），核心操作是全局 bin 软链的 link/unlink | OxnCliDomain |

> **ADR 候选**：拒绝 build metadata（git SHA / build 标记）、用 Version Hygiene 替代。判断三判据：(1) 难逆转——全仓库构建标识策略；(2) 未来读者会奇怪"为何没 git sha"；(3) 真 trade-off——拒绝 build metadata 是有意识的简化。需写 `docs/adrs/0083-version-hygiene-over-build-metadata.md`（status: accepted）。

## 2. 两个已识别风险（R1 / R2）

### R1：`pnpm import` 不支持 `bun.lock`（硬阻塞）

```
$ pnpm import --help
Generates pnpm-lock.yaml from an npm package-lock.json (or npm-shrinkwrap.json, yarn.lock) file.
```

`pnpm import` 只支持 npm / yarn 锁文件，不支持 `bun.lock`。**用户的"pnpm import 把 bun.lock 转成 pnpm-lock.yaml"路径不可行**。

**替代路径**：删 `bun.lock` → `pnpm install` 从 `package.json` 重新解析 → 生成 `pnpm-lock.yaml`。

**代价**：丢失 `bun.lock` 里的精确 patch 版本锁定（`^` 范围内的 patch 版本可能漂移）。对于开发期可接受；对于"完全复现 bun.lock 环境"需保留 `bun.lock` 备份。

### R2：pnpm 的 node_modules 结构 + `bun test` 兼容性（未知风险）

pnpm 默认用 `.pnpm/` + symlink 结构（非 hoisted）。`bun test` 的模块解析器能否正确解析取决于：
- 代码有无**幽灵依赖**（import 了未在 package.json 声明、只存在于 transitive 里的包）
- bun 对 pnpm symlink 结构的解析支持度

OpenXenon 有 ESLint 架构守卫（`scripts/validate-dependencies.ts`），幽灵依赖概率低，但**未实际验证**。

**不兼容 fallback**：`pnpm install --shamefully-hoist` 创建 npm 风格扁平 node_modules，bun test 应可读。代价：失去 pnpm 依赖隔离优势。

**完全失败 fallback**：阶段 1 不可行，退回 bun link 方案（零迁移）。

## 3. 执行计划

### Step 0 — Spike 验证 R2（必须先通过）

```
1. 创建 pnpm-workspace.yaml（packages: ['packages/*']）
2. 备份 bun.lock → bun.lock.bak（保留在仓库根，不 gitignore）
3. pnpm install（生成 pnpm-lock.yaml + pnpm 风格 node_modules）
4. bun test packages/engine/src/kernel/__tests__/schemas/validators/frozen-schema.test.ts
   （选一个纯逻辑、无 IO 的小测试做快速烟测）
   → 通过：跑更大范围（bun test packages/engine/src）
   → 失败：试 pnpm install --shamefully-hoist，再 bun test
   → 仍失败：阶段 1 不可行，退回 bun link 方案
```

**Spike 通过判据**：
- `pnpm install` 成功，无未解析依赖错误
- `bun test` 在 pnpm 生成的 node_modules 下能跑测试，无 "Cannot find module" 错误
- 至少一个测试文件 100% 通过

### Step 1 — pnpm 包管理层迁移（R2 通过后执行）

1. 创建 `pnpm-workspace.yaml`（`packages: ['packages/*']`）
2. 删 `bun.lock`（备份保留为 `bun.lock.bak`），`pnpm install` 生成 `pnpm-lock.yaml`
3. `.gitignore` 调整：`pnpm-lock.yaml` 取消 ignore（开始 track），`bun.lock` 加入 ignore
4. 修订 `AGENTS.md`：
   - "包管理器为 **Bun**" → "包管理器为 **pnpm**（构建/测试仍用 Bun，阶段 1）"
   - 更新锁文件说明
   - 保留所有 bun 构建/测试的指引
5. lefthook.yml 调整：
   - `bunx biome check ...` → `pnpm exec biome check ...`
   - `bunx eslint ...` → `pnpm exec eslint ...`
   - `bun run typecheck` → `pnpm run typecheck`
   - `bun test` → 保留（pre-push 仍跑 `bun test`）
6. CI workflows 调整：
   - install 步骤：`bun install --frozen-lockfile` → `pnpm install --frozen-lockfile`
   - test 步骤：保留 `bun test`
   - 缓存目录：`~/.bun` → 改为 `~/.local/share/pnpm/store`

### Step 2 — oxn 切换脚本（参考方案适配）

新建 `scripts/oxn-switch.sh`：

```sh
#!/usr/bin/env bash
# oxn-switch dev  →  oxn 指向本地 monorepo 构建（pnpm link --global）
# oxn-switch prod →  oxn 恢复为 npm 全局安装的正式版
set -e

CLI_PKG_NAME="@istuen/openxenon"
MONOREPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$1" in
  dev)
    echo "🔧 切换到本地开发版..."
    # 1. 移除可能残留的 prod 全局安装
    npm uninstall -g "$CLI_PKG_NAME" 2>/dev/null || true
    pnpm remove --global "$CLI_PKG_NAME" 2>/dev/null || true

    # 2. 构建本地包（确保 dist 最新；通过 pnpm run build 抽象，未来换 tsup 不动此处）
    cd "$MONOREPO_ROOT"
    pnpm run build

    # 3. 将本地包链接到全局（从仓库 root，因为 bin.oxn 在 root package.json）
    pnpm link --global

    echo "✅ oxn 已指向本地构建："
    which oxn
    oxn --version
    ;;

  prod)
    echo "📦 切换到正式安装版..."
    # 1. 移除本地全局链接
    cd "$MONOREPO_ROOT"
    pnpm unlink --global 2>/dev/null || true

    # 2. 全局安装正式版（优先本地 tarball，回退到 registry）
    TARBALL=$(ls "$MONOREPO_ROOT"/istuen-openxenon-*.tgz 2>/dev/null | head -1)
    if [ -n "$TARBALL" ]; then
      echo "  使用本地 tarball: $TARBALL"
      npm install -g "$TARBALL"
    else
      echo "  使用 registry: $CLI_PKG_NAME@latest"
      npm install -g "$CLI_PKG_NAME"
    fi

    echo "✅ oxn 已恢复为正式版："
    which oxn
    oxn --version
    ;;

  status)
    echo "当前 oxn 解析路径："
    which oxn || echo "未找到 oxn"
    oxn --version 2>/dev/null || true
    ;;

  *)
    echo "用法: oxn-switch {dev|prod|status}"
    exit 1
    ;;
esac
```

根 `package.json` 加脚本入口：
```json
{
  "scripts": {
    "oxn:dev": "bash scripts/oxn-switch.sh dev",
    "oxn:prod": "bash scripts/oxn-switch.sh prod",
    "oxn:status": "bash scripts/oxn-switch.sh status"
  }
}
```

### Step 3 — Version Hygiene（流程 + ADR + 术语）

1. 编辑 `.openxenon/assets/workflows/release-cut.md`：在 `publish` slot 之后加 `post-publish-bump` slot——bump 3 个 package.json 到下一个 `-alpha.0` + 写 `.changes/<next>-alpha-stub.md`。关闭唯一歧义窗口（dev 与 release 共享版本号的过渡期）。

2. 新建 `docs/adrs/0083-version-hygiene-over-build-metadata.md`（status: accepted）：
   ```md
   # Version Hygiene over Build Metadata

   OpenXenon does not inject build metadata (git SHA / build timestamp /
   "dev" marker) into CLI artifacts. Dev Version and Release Version are
   distinguished solely by the version string: dev version is always strictly
   greater than the latest published release version. Trade-off: same-version
   dirty-dev ambiguity is accepted as a dev-internal concern, not dev-vs-release.
   ```

3. 编辑 `.openxenon/assets/domains/oxn-cli-domain.md`：加 Version Hygiene 术语定义。

4. 编辑 `CONTEXT-MAP.md`：在"术语新增记录"段加 Version Hygiene 一行（沿用 2026-07-27 模式）。

### Step 4 — Skill-store 规则文档化

在 `scripts/oxn-switch.sh` 的注释或 README 中文档化：
- 双版本切换后重跑 `oxn init`（skills 是版本绑定的，build 时内联）
- 保持 skills project-scoped（`./.opencode/skills/`，v0.6.2 默认），避免 `--global` 模式下双版本互踩
- 仅当确认当前版本的 skills 与项目预期版本一致时，跳过 init

## 4. 不在范围（独立轨道）

| 轨道 | 说明 |
|---|---|
| 阶段 2（tsup + Node 运行时） | 未来轨道。本计划专注阶段 1（pnpm 管理 + bun 构建/测试） |
| Block 1-6（npm 真发版） | 独立于 `dev/pool/npm-ship-path.md`；`npm pack` 占位可立即跑 release 试用，真发版后替换 tarball 来源 |
| 测试框架迁移（bun test → vitest） | **不在阶段 1 范围**；属于阶段 2/3。OpenXenon 1487 个测试继续跑 `bun test` |

## 5. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Step 0 spike 失败（pnpm + bun test 不兼容） | 中 | 高（阶段 1 不可行） | fallback 到 `--shamefully-hoist`；仍失败则退回 bun link 方案 |
| `pnpm install` 后版本漂移 | 低 | 中 | 保留 `bun.lock.bak` 作为对照基线；`pnpm install` 后人工校对 lock diff |
| oxn:dev 后 PATH 冲突（pnpm 全局 bin vs npm 全局 bin 顺序） | 中 | 低 | 切换脚本主动 `npm uninstall -g` + `pnpm remove --global` 清理 |
| `npm pack` tarball 与未来真发版产物不一致 | 低 | 中 | tarball = 真实 npm 产物（同样经 `files: ["dist"]` 过滤），发布前 dry-run 验证 |
| Version Hygiene 过渡窗口（dev 与 release 共享版本号期间） | 中 | 中 | release-cut 加 `post-publish-bump` slot 强制立即 bump dev |

## 6. 参考

- [`dev/pool/npm-ship-path.md`](./npm-ship-path.md) — npm 发版路径（Block 1-6 阻塞）
- [`dev/pool/engine-closure-self-verify.md`](./engine-closure-self-verify.md) — Block 1 自举验证
- [`.openxenon/assets/workflows/release-cut.md`](../assets/workflows/release-cut.md) — Step 3 编辑对象
- [`.openxenon/assets/domains/oxn-cli-domain.md`](../assets/domains/oxn-cli-domain.md) — Step 3 编辑对象
- [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) — Step 3 编辑对象（沿用 2026-07-27 术语新增模式）
- 2026-07-30 `/grilling` session 产出

<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028。文件中 CONTEXT-MAP 原文引用保留作为历史考古链，失效链接请用 git blame 追溯或参考对应 Domain / RFC。-->
