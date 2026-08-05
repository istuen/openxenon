# 0.6.1 — Asset Canonical MD (5 PR 合并 release notes)

> v0.6.1 stable 发版 — D-α (c) + D-β (c) + D-γ (b) 三决策落地，Asset/Work 全面 MD-canonical
> 范围：v0.6.1-alpha.0 → v0.6.1 stable
> 5 子 PR：3b5f286 / 3259f76 / 5c46c7e / 7f2a1b7 / e5b22f6
> Work：v0-6-1-asset-md（5 task 全 passed）

---

## 0. TL;DR

**Asset canonical 表示从 .oxn 翻转到 .md**（v0.6.x 双轨过渡，v0.7.0 切割）。
所有新写的 Work/Task/Domain/Blueprint 默认输出 `.md`；`.oxn` 留盘作 v0.6.x fallback。

**3 项核心决策落地**：

| 决策 | 内容 | 实现 |
|---|---|---|
| **D-α (c)** | v0.6.1 留 .oxn 作 fallback；v0.7.0 切割 | AssetPathResolver 4 级候选；CLI `oxn <asset> sync --all` 复写 .md |
| **D-β (c)** | v0.6.1 冻 Langium；v0.7.0 卸 | CI 守卫 + deprecated + 默认 driver = `mdast` |
| **D-γ (b)** | Work 引用值用 `@md/...` 前缀 | `parseMdRef()` 校验 scope + name |

---

## 1. 5 个子 PR 汇总

### PR-1 (3b5f286) — RFC T19 收尾：切割 allowLegacyDirective 安全网

- 8 个 EntityCompilers（domain/blueprint/work/task/proof/stack/library/external）解析 `:::intent{...}` 时**无条件**抛 `E_MD_DEPRECATED_SYNTAX`
- `entity-compiler.ts` 删 `ParseOptions.allowLegacyDirective`
- 2 个 test fixture + biome useOptionalChain 警告修复
- **影响**：v0.6.1 后任何 `:::intent{...}` 旧写法被直接拒绝

### PR-2 (3259f76) — Work 引用值锁 `@md/<scope>/<name>` 前缀（D-γ b）

- 新增 `parseMdRef()` 共用 helper（解析 `@md/<scope>/<name>`）
- `WorkCompiler.parse()` 拆 `@md/...` 前缀
- `mdast-to-kernel.ts:251` 同步升级
- `reference-checker.ts` 加 `@md/` 解析分支 + `stack`/`roadmap` kind
- 8 个 Skill asset 模板升级到 `@md/` 格式
- 新错误码 `E_MD_REFERENCE_PREFIX_INVALID`
- 16 cases 测试覆盖合法/非法 prefix、scope-kind 不一致、name 非法字符等

```md
## Tasks

### step1
- blueprint: @md/blueprints/dev-workflow   # 合法
- domain: @md/blueprints/MemberContext    # ❌ scope-kind 不一致
- part: implement
  - skill_context: ...
```

### PR-3 (5c46c7e) — Asset canonical 翻转（D-α c）

- `infra/paths.ts:resolveAssetFileCandidatesV61` 4 级候选（`.md` primary → `.oxn` fallback → fallback layouts）
- `resolveAssetWritePathV61` 默认写 `.md`
- `AssetFormat` 默认 `'oxn'` → `'md'`
- `oxn work create` 默认生成 `work.md`（+ work.oxn fallback）
- 33 user asset 迁移（18 domain + 11 blueprint + 4 user 同名）
- 新增守卫 `scripts/check-md-fallback-stats.ts`（INFO 日志）
- CLI `oxn domain sync --all` / `oxn blueprint sync --all` 复用为迁移工具

```bash
=== v0.6.1 .oxn fallback stats ===
  domain     :  18 .oxn /  18 .md  (50% legacy remaining)
  blueprint  :  22 .oxn /  11 .md  (66.7% legacy remaining)
  TOTAL      :  40 .oxn /  29 .md
```

### PR-4 (7f2a1b7) — Langium 冻结（D-β c）

- `scripts/check-no-new-langium-usage.ts`（CI 守卫 · fatal）
- `langium-driver/` 标 `@deprecated`，新增 `DEPRECATED.ts` throw
- `driver.ts` 默认 driver `'unified'` → `'mdast'`（v0.7.0 切割时 `'langium'` alias 完全删除）
- `oxn domain validate --no-langium` / `oxn blueprint validate --no-langium`
  - `.md` 文件走 mdast 路径
  - `.oxn` 文件 → 抛 `OXN_NO_LANGIUM_REJECTED`
- Docs `extending.md` 加 Langium 退役时间表（5 行）

### PR-4 Extension (e5b22f6) — builtin assets .oxn → .md

- 18 个 `.md` 副本（15 builtin probes + 3 builtin blueprints）
- `scripts/migrate-builtin-to-md.ts` 一次性转换工具
- 21 cases 新测试覆盖 frontmatter 解析 + H1 校验
- v0.7.0 切割准备：builtin 部分可一次 `git rm .oxn` 直接到位

---

## 2. 用户行为变更总结

### 2.1 新写法（v0.6.1+ 推荐）

```bash
# 新建 work — 默认写 .md
oxn work create my-feature --blueprint dev-workflow

# 引用 asset — 用 @md/ 前缀
- blueprint: @md/blueprints/dev-workflow
- domain:   @md/domains/MemberContext
- part: implement
  - skill_context: ...

# 强制 mdast-only 校验
oxn domain validate MemberContext --no-langium
oxn blueprint validate dev-workflow --no-langium

# 迁移存量资产（一次性）
oxn domain sync --all
oxn blueprint sync --all
```

### 2.2 CLI 行为变更

| 命令 | v0.6.1 行为 | v0.6.1-alpha.0 |
|---|---|---|
| `oxn work create` | 默认写 .md（双轨）| 默认写 .oxn |
| `oxn domain validate` | 默认走 mdast | 走 Langium |
| `oxn blueprint validate` | 默认走 mdast | 走 Langium |
| `oxn work validate` | 默认走 mdast | 走 Langium |

### 2.3 旧写法（运行时报错，不再支持）

```oxn
// 旧域名/蓝图（仍然兼容，加载时 .md 优先读 .oxn）
domain "MemberContext" ref "@prj/domains/MemberContext";  // ✓ 仍然兼容

// 旧 :::intent 容器指令
:::intent{#term-1 type="term"}      // ❌ E_MD_DEPRECATED_SYNTAX

// 裸名引用值
- blueprint: dev-workflow           // ❌ E_MD_REFERENCE_PREFIX_INVALID
- domain: @prj/domains/MemberContext // ❌ E_MD_REFERENCE_PREFIX_INVALID
```

---

## 3. 架构 / L0-L3 兼容性

| 层 | 变更 |
|---|---|
| L0-Schema | IAPError 字典加 `REFERENCE_PREFIX_INVALID`、`PATH_CONFLICT`、`KIND_UNSUPPORTED`（PR-3）|
| L0-Contract | 不变（validate 仍接 mdast 后端）|
| L0-Processor | 8 EntityCompiler 切 E_MD_DEPRECATED_SYNTAX（PR-1）|
| L1-Infra | `paths.ts` 加 4 级 resolver + AssetFormat 默认 `md`；`filesystem.ts` 不变 |
| L1-OXL | md-bridge 加 8 个 compiler + parse-md-ref + WorkCompiler 解析 `@md/...` |
| L2-Builtin | builtin probes/blueprints 现在有 .md 副本（PR-4 ext） |
| L3-CLI | sync/sync-md 自动；work create 默认 .md；新 `--no-langium` flag |

零新增 npm 依赖（`@langium/*` 已从 v0.6.0 在）。

---

## 4. 验收（PR-5 收尾验证）

| 检查 | 结果 |
|---|---|
| `bun run typecheck` | **0 error** ✓ |
| `bun run check`（biome）| **0 error** ✓ |
| `bun run lint`（eslint）| **0 error**（2 pre-existing warnings in `sync-hash.ts`，与 v0.6.1 无关）✓ |
| `bun test packages/engine/src/oxl/md-bridge` | **242 / 242 pass** ✓ |
| `bun run check:md-fallback` | 33 + 18 = 51 .md；40 .oxn |
| `bun run check:no-langium` | exit 0（无新增 Langium）✓ |
| E2E：`oxn work create → validate → lock → run → status` | 全 ok ✓ |
| 18 个 builtin .md 文件 parse | 全 OK ✓ |
| 21 个 builtin .md 测试 cases | pass ✓ |

---

## 5. 已知遗留债（v0.7.0 切割范围）

> **D-α c / D-β c 锁定**：v0.7.0 cutover sprint 一次性清理

| 项 | v0.6.1 状态 | v0.7.0 动作 |
|---|---|---|
| 40 个 `.oxn`（33 user + 7 builtin 同名）| 留盘 | `git rm` 全量 |
| `langium-driver/` 目录（256K）| `@deprecated` | `git rm` |
| `langium ^4.3.0`、`langium-cli ^4.3.0` npm dep | 用作 fallback | 卸依赖 |
| 195 frozen works（`v0-2-*`）| 留作审计 | `git rm` + frozen.json 保留 |
| 12 doc examples | 留 .oxn | 可选迁 .md |
| `oxl-md-adapter.ts` 双轨桥 | 兼容层 | 删除 |

---

## 6. Work 跟踪

```bash
$ oxn work status v0-6-1-asset-md --json
  v0-6-1-asset-md (5/5 tasks passed)
  ├─ t1-rfc-t19-cleanup       ✅ commit 3b5f286
  ├─ t2-md-prefix             ✅ commit 3259f76
  ├─ t3-asset-canonical-flip  ✅ commit 5c46c7e
  ├─ t4-langium-freeze        ✅ commit 7f2a1b7
  └─ t5-verify-release        ✅ commit (PR-5 changelog)
```

---

## 7. 关联 RFC + Sprint 文档

- RFC：`md-native-grammar-rfc.md` v2.0（v0.6.1 增量已 PR-2 锁定）
- Sprint：`.openxenon/pools/sprints/v0.6.1-asset-md/`（将创建 RFC v2.0 summary + decision journal）
- 关联 PR：
  - PR-1：commit `3b5f286`
  - PR-2：commit `3259f76`
  - PR-3：commit `5c46c7e`
  - PR-4：commit `7f2a1b7`
  - PR-4 ext：commit `e5b22f6`
  - PR-5：commit (本 changelog 对应)

---

## 8. 升级指南

### 8.1 现有项目升级

```bash
# Step 1: 升级 @istuen/openxenon 到 v0.6.1
bunx @istuen/openxenon@0.6.1 install-skill

# Step 2: 迁移现有 .oxn 资产到 .md（可选；可推迟到 v0.7.0）
oxn domain sync --all
oxn blueprint sync --all

# Step 3: 转换 work.oxn 工作图纸（如需；新 work 自动 .md）
oxn work compile  # work.oxn → work.md

# Step 4: 校验 .md 路径生效
oxn work validate <w> --no-langium  # 强制走 mdast
oxn domain validate <D> --no-langium
```

### 8.2 新项目（v0.6.1+ 推荐写法）

```bash
oxn init
oxn domain create MyContext
oxn blueprint create my-workflow --slots build,develop,test,verify
oxn work create my-feature --blueprint my-workflow
# 编辑 works/my-feature/work.md（默认创建）
# 编辑 works/my-feature/tasks/<task>.md
oxn work validate my-feature --no-langium
oxn work lock my-feature
oxn work run my-feature
oxn work submit my-feature --task <task>
```

---

## 9. 致谢

本 release 由 user + opencode 协作完成 5 PR 完整闭环。v0.7.0 cutover sprint 计划独立启动。
