# 0.2.0 — Sprint 4 T8: Intent Pool v3 最小骨架 (research pool + Hall 扫描迁移)

> 父文档: `.openxenon/forges/2026-06-13-intent-pool-design.md` v3 §6
> Sprint 4 任务 T8, **Intent Pool 第一轮最小切片** — 为 Sprint 5 ⑥ PR-4 (calibrationSignals → pools/research/) 提供落盘目标
> 前置: T1+T2+T3+T4+T5+T6+T7+T9 已合入主分支
> 不承载: 5 池全启用 / 6+5 CLI 命令 / 24 份 forge 迁移 / Skill 构建 (sprint-6)

## 变更

### 1. L1-Infra 新增 (3 文件, ~210 行)

#### `src/infra/frozen/pool-writer.ts` (~80 行)
- `writePoolEntry(projectRoot, input): Promise<{path, frozenPath, hash}>`
- pool: `'research'` (Sprint 6 扩 union 加 design/issue/audit/journal)
- 写 `.openxenon/pools/research/<slug>.md` (0o644) + `<slug>/frozen.json` (0o444 复用 `writeFrozenImmutable`)
- SHA-256 body hash
- slug 校验 `/^[a-z0-9][a-z0-9-]*$/`, 错误抛 IAPError

#### `src/infra/markdown-headings.ts` (~80 行)
- `extractHeadings(content)` 排除 ```代码块``` 内的 `#` 误识别
- `validateHeadingSkeleton(content, spec)` 返 `{ok: true, headings}` | `{ok: false, missing, unexpected, headings}`
- `order: 'strict' | 'flexible'` (默认 flexible)

#### `src/infra/pool-journal-generator.ts` (~50 行)
- `generateJournalSnippet(content, maxLength=200)` 提取首 ## 标题 + 首段去 markdown 标记

### 2. scripts/ 新增 `check-heading-skeleton.ts` (~95 行)

```ts
function checkDirectories(dirs: string[]): CheckResult
// CheckResult { checked, passed, failed: string[], errors: [{file, missing, unexpected}] }

// CLI: bun scripts/check-heading-skeleton.ts <dir1> [dir2 ...]
//   退出码 0: 全部 ok
//   退出码 1: 有 .md 缺 heading
//   输出 JSON: { checked, passed, failed, errors }

// POOL_SPECS (本 PR 唯一启用池):
//   research = { required: ['# What','# Why','# How'], optional: ['# Reference'] }
// 目录不存在 → 静默跳过 (degraded mode, 兼容期)
```

### 3. Hall 改造 `src/hall/index.ts`

- 新增 `scanIntentPools(projectRoot): IntentPoolEntry[]` (类似 scanForgeDrafts 但扫 `.openxenon/pools/`)
- `getHallStats` 调 `scanIntentPools` + 埋 `if (warnOnForgesDeprecated)` 分支 (默认 false 静默, Sprint 6 flip)
- `shouldWarnOnForgesDeprecated` 走 `loadOxnRc` 读 `.oxnrc`

### 4. Config 扩展 `src/cli/config-loader.ts`

```diff
export interface OxnConfig {
  version: 1
  leaderMode?: LeaderMode
+ /**
+  * v0.2 T8: 是否在 Hall 扫描 forges/ 时打印 WARN
+  * 默认 false (兼容期静默); Sprint 6 flip 开关
+  */
+ warnOnForgesDeprecated?: boolean
  [key: string]: unknown
}
```

### 5. lefthook pre-commit 钩子 (第 5 hook)

```yaml
pre-commit:
  commands:
    biome-check: ...
    eslint-arch: ...
    typecheck: ...
    heading-skeleton:                          # ← 新增
      glob: "**/*.md"
      run: bun scripts/check-heading-skeleton.ts .openxenon/forges/ .openxenon/pools/
```

### 6. .gitignore 扩展

```gitignore
# v0.2 T8 Intent Pool: 池内 frozen.json 不可变但不入仓
.openxenon/pools/*/*/frozen.json
.openxenon/pools/*/!(.gitkeep)
# 但 .gitkeep 保留入仓
!.openxenon/pools/*/.gitkeep
```

### 7. 物理目录

```
.openxenon/
├── forges/    (兼容期, 旧 24 份设计笔记, Sprint 6 flip 开关后 WARN)
└── pools/
    └── research/  (本 PR 唯一启用池, .gitkeep 占位)
        └── (后续 PR-4 落 pools/research/<slug>.md)
```

### 8. 文档 (中英双 SSOT)

`docs/en/intent.md` + `docs/zh-cn/intent.md` 新增 "Intent Pool 第一轮落地" 章节:
- 5 池概念与生命周期
- 当前**仅** research 池可用
- forges/ 兼容期 (默认静默, Sprint 6 启用 WARN)
- heading 模板与 lint 集成
- 5 池 heading 模板表 (research / design / issue / audit / journal 必填 heading)

### 9. 单元测试 (11 case)

`src/infra/__tests__/pool-writer.test.ts` (3 case):
1. 写合法 research entry (md + frozen.json 物理存在)
2. 落盘后 frozen.json 0o444 物理权限正确
3. 错误 slug (大写) 抛 IAPError

`src/infra/__tests__/markdown-headings.test.ts` (4 case):
1. 完整骨架 (# What # Why # How) → ok=true
2. 缺 # How → missing[] 含 # How
3. order=strict 顺序错 → ok=false
4. extractHeadings 排除 ```代码块``` 内的 # 误识别

`scripts/__tests__/check-heading-skeleton.test.ts` (4 case):
1. 全部 ok → passed=N + failed=[]
2. 缺 # How → failed[] 含该文件
3. 空目录 → 0 files checked
4. 目录不存在 → 静默跳过 (degraded mode)

## 指标

- 测试: 1322 → **1333** (+11: 3 pool-writer + 4 markdown-headings + 4 heading-skeleton)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 14 个 builtin probe 透传: 不变 (T8 不动 verdict strategies)
- 行为变化:
  - 新增 Intent Pool v3 落盘能力 (research 池)
  - Hall 扫描新增 `scanIntentPools`
  - `OxnConfig.warnOnForgesDeprecated` 字段 (默认 false)
  - lefthook pre-commit 第 5 hook (heading-skeleton)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| `forges/` 历史文件 (24 份) heading 骨架不通过 lint | 中 | 本 PR 仅检查 `pools/`, forges/ 兼容期豁免; Sprint 6 flip 开关前完成迁移 |
| `pool-writer.ts` 写 frozen.json 与 `infra/frozen/immutable.ts` 重复 | 中 | **已复用** `writeFrozenImmutable` 函数 |
| `markdown-headings.ts` 解析边界 (嵌套代码块中的 # 误识别) | 低 | 简单正则: 行首 `^#{1,6}\s`, 排除 ```代码块``` 围栏 |
| `warnOnForgesDeprecated` 配置持久化路径 | 低 | 复用现有 `config-loader.ts` (`.oxnrc`) |
| Sprint 6 flip 开关需文档引导 | 低 | docs/intent.md 章节说明 (本 PR) + 后续 README flip 引导 |
| 4 个 work-migrate e2e pre-existing flake | 低 | 单跑通过, 不在 T8 范围 |

## 关联

- 上游: T1+T2+T3+T4+T5+T6+T7+T9 已合入主分支
- 下游 [sprint-5a 计划]: PR-5 已实现 (work finalize 阶段落 `pools/research/<slug>/frozen.json`)
- 下游 [sprint-5b 计划]: PR-6 OXL grammar 续 taint 系列, 跟 Intent Pool 间接相关
- 下游 [sprint-6 计划]: flip `warnOnForgesDeprecated` 默认值 + 启用其他 4 池 + Skill 构建
- 依赖外部: `src/infra/frozen/immutable.ts` (writeFrozenImmutable) + `src/cli/config-loader.ts` (loadOxnRc)
- **Sprint 6 flip**: 5 池 union 扩 design/issue/audit/journal + `forges/` 兼容期结束 + WARN 强制开启

Refs: .openxenon/forges/sprints/sprint-4/2026-06-15-intent-pool-minimal-research.md
Refs: .openxenon/forges/2026-06-13-intent-pool-design.md v3
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
