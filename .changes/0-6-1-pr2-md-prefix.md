# 0.6.1 — PR-2: Work 引用值锁 `@md/<scope>/<name>` 前缀（D-γ b）

> 主题：v0.6.1-asset-md 5 PR 计划第 2 步
> 分支：`feat/v0.6.1-asset-md`
> Work：`v0-6-1-asset-md` → t2-md-prefix → **status=passed**
> RFC 状态：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md` v1.0 → **v2.0**
> RFC 新决策：D8（`@md/...` 前缀）+ D9（Langium v0.7 退役）+ D10（.oxn v0.7 切割）+ D11（不做 .md → .oxn 同步）

---

## 0. 核心命题

**Work 引用值（`- blueprint: ...` / `- domain: ...`）强制使用 `@md/<scope>/<name>` 前缀格式**。

旧格式（裸名 `dev-workflow`、OXL `ref "@prj/..."`）一律抛 `IAPError(INTENT, REFERENCE_PREFIX_INVALID)`。

```
正确（v0.6.1+）
- blueprint: @md/blueprints/dev-workflow
- domain:   @md/domains/MemberContext

错误（任选其一即抛错）
- blueprint: dev-workflow                       # E_MD_REFERENCE_PREFIX_INVALID
- blueprint: @prj/blueprints/dev-workflow     # E_MD_REFERENCE_PREFIX_INVALID
- blueprint: @md/domains/MemberContext         # scope-kind 不一致
- blueprint: @md/blueprints/                   # 空 name
```

---

## 1. 代码变更

### 1.1 新增 `parse-md-ref.ts`（L1-OXL helper，共用）

`packages/engine/src/oxl/md-bridge/parse-md-ref.ts` (~160 行)
- `MDScope = 'blueprints' | 'domains' | 'stacks' | 'roadmaps'`
- `parseMdRef(raw, expectedKind) → { raw, scope, name }`
- `kindToScope(kind) → MDScope`
- 4 类非法 case 一律抛 `IAPError(axis=INTENT, code='REFERENCE_PREFIX_INVALID', action=AUTONOMOUS_RETRY)`

### 1.2 接入 4 处

| 文件 | 变更 |
|---|---|
| `entity-compiler.ts`（已 PR-1 改）| 无新增引用 |
| `compilers/work-compiler.ts:240-255` | `Tasks` 分支：`getScalar(fields, 'blueprint\|domain')` → `parseMdRef(raw, 'blueprint'\|'domain')` |
| `mdast-to-kernel.ts:248-260` | `convertTaskToCompiled()` 默认值改为 `@md/...` 格式；frontmatter 字段走 parseMdRef 验证 |
| `reference-checker.ts:97-117` | 新增 `@md/...` 前缀解析分支；`kind` 类型加 `stack` / `roadmap` |

### 1.3 IAPError 字典扩展

`packages/engine/src/kernel/contracts/iap-error.ts`:
```ts
| 'REFERENCE_PREFIX_INVALID' // v0.6.1 PR-2: Work 引用值非 `@md/...` 前缀格式（D-γ b 锁定）
```

### 1.4 8 个 Skill asset 模板升级

| Locale | 文件 |
|---|---|
| zh-CN | `work-{develop,explore,fix,onboarding}.md`（4 文件）|
| en | `work-{develop,explore,fix,onboarding}.md`（4 文件）|

每文件从 `- blueprint: dev-workflow` / `- domain: MemberContext` 改为 `- blueprint: @md/blueprints/dev-workflow` / `- domain: @md/domains/MemberContext`。

### 1.5 测试 fixture 同步更新

- 新增 `packages/engine/src/oxl/md-bridge/__tests__/parse-md-ref.test.ts`（16 cases）
- 修复 `__tests__/compilers/work-compiler.test.ts` SAMPLE_WORK fixture：裸名 → `@md/...`
- 修复 `__tests__/mdast-to-kernel-native.test.ts` end-to-end fixture：`bp1` → `@md/blueprints/bp1`

---

## 2. 验收

| 检查 | 结果 |
|---|---|
| `bun run typecheck` | **0 error** ✓ |
| `bun run check`（biome）| **0 error** ✓ |
| `bun run lint`（eslint）| **0 error**（2 pre-existing warnings in `sync-hash.ts`，与 PR-2 无关）✓ |
| `bun test packages/engine/src/oxl/md-bridge` | **242 / 242 pass** ✓（vs PR-1 完成时 226，新增 16）|
| `oxn work submit v0-6-1-asset-md t2-md-prefix` | `taskStatus: "passed"` ✓ |
| planLock allHash | `c957e6e7ad5c6eba0d8ebc197de96af34d4437c8030af88b6b1e3041575ee38e` |
| frozen.json 落地 | `.openxenon/works/v0-6-1-asset-md/.run/tasks/t2-md-prefix/frozen.json` ✓ |

---

## 3. RFC v2.0 决策表（增量）

| 决策 | v1.0 | **v2.0 增量** |
|---|---|---|
| D2 复杂属性风格 | 全嵌套列表 | 不变 |
| D5 PR 拆分粒度 | 3 个子 PR（T18/T19/T20）| **5 个 v0.6.1 + 1 个 v0.7.0 切割 PR** |
| D6 发版策略 | v0.3.0 | **v0.6.1 + v0.7.0 双发版** |
| **D8（新增）** | — | **Work 引用值用 `@md/<scope>/<name>` 前缀** |
| **D9（新增）** | — | **Langium v0.7.0 切割**（D-β c）|
| **D10（新增）** | — | **.oxn v0.7.0 切割**（D-α c）|
| **D11（新增）** | — | **不做 .md → .oxn 同步；.oxn 留 v0.6.x fallback** |

---

## 4. 后续 PR

- **PR-3** (t3-asset-canonical-flip)：AssetPathResolver 加 .md 优先 + 48 个资产全量迁移（3 天）
- **PR-4** (t4-langium-freeze)：Langium 冻结 + 4 个守卫（1.5 天）
- **PR-5** (t5-verify-release)：验证 + 收尾（3.5 天）
- **v0.7.0 切割**（独立 sprint，8–12 周后）：git rm 全部 .oxn + 卸 Langium + 简化 OxlDriver 抽象

---

## 5. 关联

- RFC v2.0：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md`
- v0.6.1 决策记录：`.openxenon/pools/sprints/v0.6.1-asset-md/journal/2026-07-08-v0.6.1-asset-md-decision.md`
- 入口 helper：`packages/engine/src/oxl/md-bridge/parse-md-ref.ts`
- Work 跟踪：`.openxenon/works/v0-6-1-asset-md/work.oxn`
- 上一步 PR-1 changelog：`.changes/0-6-1-pr1-rfc-t19-cleanup.md`
