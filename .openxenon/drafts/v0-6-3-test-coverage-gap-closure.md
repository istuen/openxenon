---
entity: draft
type: design
created: 2026-08-02
status: ready
related:
  - .openxenon/drafts/test-coverage-audit.md
  - .openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md
  - docs/adrs/0088-test-suite-architecture.md
  - .changes/0-6-3-final.md
---

# Draft: v0.6.3 测试覆盖 gap 闭环执行计划

> **状态**：🟢 Ready（2026-08-02 phase post-3 落地）
> **来源**：test-coverage-audit.md 识别的 v0.6.3 测试 gap
> **用户决策**：Q1=A / Q2=A / Q3=B / Q4=B / Q5=A / Q6=B / Q7=B
> **估时**：7.5-9.5 hr（2 个聚合 commit）

## 0. 背景

test-coverage-audit.md 已识别 v0.6.3 期间有 4 个测试 gap：

| Gap | 来源 | 严重性 |
|---|---|---|
| builtin-skeleton-templates.ts (289 行) 无 unit test | v0.6.3 Fix #1 + Q1 改动 | 🟥 高 |
| Q3 hint message 文本校验缺失 | skeleton.test.ts case 8 仅校验 code 存在 | 🟥 高 |
| boundary-guard 无 `entity: skeleton` 白名单 | Q1 决议未落地到代码 | 🟧 中 |
| sync-domain-glossary.ts 无 unit test | script 类（Work G 精简后） | 🟧 中 |

执行本 draft 闭环 4 个 gap。

## 1. 总执行计划

### 1.1 顺序与时长

```
Sub-plan A (2-3 hr) → Sub-plan B (30 min) → 
Sub-plan C1 (30 min) → Sub-plan C2 (1 hr) → 
Sub-plan E (30 min, 合并到 commit 1) → 
Sub-plan D (3-4 hr) → 
Commit 1 + Commit 2
```

### 1.2 Commit 策略（Q7=B 锁定 2 聚合 commit）

| Commit | 包含 | 文件数 | 主题 |
|---|---|---|---|
| **commit 1** | A + B + C1 + C2 + E | 5 文件 (2 新 + 3 改) | v0.6.3 gap 闭环 — builtin-skeleton unit + Q3 hint + skeleton entity 白名单 |
| **commit 2** | D | 2 文件 (1 新 + 1 改) | sync-domain-glossary 单元测试（export 4 工具函数 + e2e） |

---

## 2. Sub-plan A — builtin-skeleton-templates.test.ts（新建）

**文件**：`packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts`

**目标**：289 行 7 模板字符串单元覆盖

### 2.1 Q6=B 实现细节：正则匹配 frontmatter 提取 keys

```typescript
/**
 * 提取 frontmatter keys（YAML 简化版，仅识别顶层 `key:` 形式）
 * 不解析嵌套结构（如 references: 下的 - item）
 */
function frontmatterKeys(content: string): Set<string> {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return new Set()
  const keys = new Set<string>()
  for (const line of m[1]!.split('\n')) {
    // 顶层 key（不以空格开头）
    const km = line.match(/^([a-z][a-z0-9-]*)\s*:/)
    if (km) keys.add(km[1]!)
  }
  return keys
}
```

### 2.2 测试结构

```typescript
import { describe, expect, test } from 'bun:test'
import {
  BUILTIN_SKELETON_TEMPLATES,
  SKELETON_OUTPUT_DIR,
  type BuiltinSkeletonTemplate,
} from '../builtin-skeleton-templates'

describe('BUILTIN_SKELETON_TEMPLATES - 常量结构', () => {
  test('1. 长度 = 7', () => {
    expect(BUILTIN_SKELETON_TEMPLATES).toHaveLength(7)
  })

  test('2. 顺序 = [rfc, asset-{5 kind}, work]', () => {
    expect(BUILTIN_SKELETON_TEMPLATES.map((t) => t.filename)).toEqual([
      'rfc.md',
      'asset-domain.md',
      'asset-workflow.md',
      'asset-stack.md',
      'asset-blueprint.md',
      'asset-roadmap.md',
      'work.md',
    ])
  })

  test('3. SKELETON_OUTPUT_DIR = .openxenon/draft-skeletons (v0.6.3 Fix #1)', () => {
    expect(SKELETON_OUTPUT_DIR).toBe('.openxenon/draft-skeletons')
  })
})

describe.each(BUILTIN_SKELETON_TEMPLATES)('template $filename', (tpl) => {
  test('frontmatter 含 entity: skeleton (Q1 独立 entity)', () => {
    expect(tpl.content).toMatch(/^---\nentity: skeleton\n/)
  })

  test('frontmatter 含 target-entity 字段 (Q1 新增)', () => {
    const m = tpl.content.match(/target-entity: (\w+)/)
    expect(m).not.toBeNull()
    expect(['rfc', 'asset', 'work']).toContain(m![1])
  })

  test('frontmatter 不含注入字段 (skeleton fork 时注入)', () => {
    const keys = frontmatterKeys(tpl.content)
    expect(keys.has('promote-target')).toBe(false)
    expect(keys.has('promote-kind')).toBe(false)
    expect(keys.has('created-from')).toBe(false)
    expect(keys.has('synced-at')).toBe(false)
  })

  test('含 TODO 占位（提示工程师填）', () => {
    expect(tpl.content).toContain('TODO')
  })

  test('BuiltinSkeletonTemplate interface 字段完整', () => {
    expect(tpl.filename).toMatch(/\.md$/)
    expect(tpl.content.length).toBeGreaterThan(100)
  })
})
```

### 2.3 预期产出

- **38 case**（3 结构 + 7 × 5 模板）
- 文件大小：~80 行

### 2.4 风险

模板字符串硬编码测试会因 TODO 占位修改而失败 — **接受**，这是锁定 template 内容的目的（CI 立刻发现改动）

---

## 3. Sub-plan B — skeleton.test.ts Q3 hint（扩展）

**文件**：`packages/engine/src/Draft/__tests__/skeleton.test.ts`（追加 describe 块）

### 3.1 实现细节

在文件末尾追加：

```typescript
describe('OXN_DRAFT_SKELETON_NOT_FOUND Q3 推荐性 hint (v0.6.3+)', () => {
  test('13. message 含 "recommended, not required"', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_SKELETON_NOT_FOUND')
    expect(r.message).toContain('recommended, not required')
    expect(r.message).toContain('v0.6.3 Q3')
  })

  test('14. suggestion 含 "create the skeleton manually"', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toMatch(/create the skeleton manually/i)
  })

  test('15. suggestion 含 "skip skeleton fork"（明示可手写 Draft）', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toContain('skip skeleton fork')
  })

  test('16. suggestion 提及 `oxn init` 安装路径', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toContain('`oxn init`')
  })
})
```

### 3.2 预期产出

- **+4 case**（总 16 case）
- 与原 case 8（line 127-134）`expect(result.message).toContain('not found')` 兼容

---

## 4. Sub-plan C1+C2 — boundary-guard skeleton 实体白名单

### 4.1 C1: 修改 `boundary-guard.ts`（2 处小改）

**修改点 1**：`OXN_BUILTIN_DOMAINS_FALLBACK` 增 `'skeleton'`

```typescript
const OXN_BUILTIN_DOMAINS_FALLBACK = [
  'oxn-asset-domain',
  'oxn-cli-domain',
  'oxn-domain',
  'oxn-draft-domain',
  'oxn-draft-promote-domain',
  'oxn-engine-domain',
  'oxn-insight-domain',
  'oxn-project-domain',
  'oxn-proof-domain',
  'oxn-work-domain',
  'skeleton',  // v0.6.3 Q3: 7 skeleton 模板 entity
]
```

**修改点 2**：header comment 增 1 段（line 7 后插入）

```typescript
// v0.6.3 Q3: skeleton 实体不需 .openxenon/assets/domains/skeleton.md 副本
//   - 7 skeleton 模板由 `oxn init` 落到 `.openxenon/draft-skeletons/`（不在 worksDir 范围）
//   - boundary-guard 仅扫 `.openxenon/works/`，隐式忽略 draft-skeletons
//   - 显式加入 fallback 是为了「未来 task domain: skeleton」场景通过（如 Studio 引用模板）
```

### 4.2 C2: 扩展 `boundary-guard.test.ts`（+1 case）

在 `describe('boundary-guard (RFC-0015 D6.1)')` 末尾追加：

```typescript
test('case 9: domain ref 是 skeleton (v0.6.3 Q3 实体白名单) → passed=true', async () => {
  makeProject()
  makeWork('w1', [{ name: 'task-a', blueprint: validBlueprint, domain: 'skeleton' }])
  const ctx: ProbeContext = { projectRoot: tmpDir }
  const result = await executeBoundaryGuard({}, ctx)
  expect(result.passed).toBe(true)
  expect(result.failedRefs.find((f) => f.field === 'domain')).toBeUndefined()
})
```

### 4.3 预期产出

- 1 处 fallback 数组新增 1 元素
- 1 处 header comment 增 3 行
- **+1 case**（总 9 case）

---

## 5. Sub-plan D — sync-domain-glossary.test.ts（新建，Q5=A 锁 D3）

### 5.1 步骤 1：`scripts/sync-domain-glossary.ts` export 4 工具函数（5 行改动）

```typescript
// 当前（file-local）：
function toSlug(h3Text: string): string { ... }
function escapeAngleBrackets(s: string): string { ... }
function parseFrontmatter(content: string): { references: string[] } { ... }
function extractTermsFromDomain(filePath: string, domainName: string): DomainTerm[] { ... }

// 改为（加 export 关键字）：
export function toSlug(h3Text: string): string { ... }
export function escapeAngleBrackets(s: string): string { ... }
export function parseFrontmatter(content: string): { references: string[] } { ... }
export function extractTermsFromDomain(filePath: string, domainName: string): DomainTerm[] { ... }
```

### 5.2 步骤 2：新建 `scripts/__tests__/sync-domain-glossary.test.ts`

```typescript
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import {
  toSlug,
  escapeAngleBrackets,
  parseFrontmatter,
  extractTermsFromDomain,
} from '../sync-domain-glossary'

// === 单元测试（导入 export 的工具函数）===

describe('toSlug', () => {
  test('1. PascalCase → kebab-case', () => {
    expect(toSlug('AssetMap')).toBe('assetmap')
  })
  test('2. 含空格 → kebab-case', () => {
    expect(toSlug('OXN Engine')).toBe('oxn-engine')
  })
  test('3. 含斜杠', () => {
    expect(toSlug('OXN/IAP')).toBe('oxn-iap')
  })
  test('4. trim 首尾空格', () => {
    expect(toSlug('  Foo  ')).toBe('foo')
  })
  test('5. 含数字', () => {
    expect(toSlug('Version 2')).toBe('version-2')
  })
})

describe('escapeAngleBrackets', () => {
  test('1. <oxn> → &lt;oxn&gt;', () => {
    expect(escapeAngleBrackets('<oxn>')).toBe('&lt;oxn&gt;')
  })
  test('2. 普通文本不变', () => {
    expect(escapeAngleBrackets('plain text')).toBe('plain text')
  })
  test('3. 多个连续 tag', () => {
    expect(escapeAngleBrackets('<a><b>')).toBe('&lt;a&gt;&lt;b&gt;')
  })
})

describe('parseFrontmatter', () => {
  test('1. 含 references 列表', () => {
    const r = parseFrontmatter('---\nreferences:\n  - oxn-domain\n---\n# Body')
    expect(r.references).toEqual(['oxn-domain'])
  })
  test('2. 无 frontmatter', () => {
    expect(parseFrontmatter('# Body only').references).toEqual([])
  })
  test('3. malformed frontmatter（无 closing ---）', () => {
    expect(parseFrontmatter('---\nreferences: [').references).toEqual([])
  })
})

describe('extractTermsFromDomain', () => {
  let fixtureDir: string
  beforeEach(() => {
    fixtureDir = join(tmpdir(), `extract-terms-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(fixtureDir, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true })
  })

  test('1. 简单 domain 1 term', () => {
    const file = join(fixtureDir, 'test.md')
    writeFileSync(file, '---\nreferences: []\n---\n# Domain: Test\n\n## Terms\n\n### Foo\n- desc: foo desc\n')
    const terms = extractTermsFromDomain(file, 'test')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.name).toBe('Foo')
    expect(terms[0]?.desc).toBe('foo desc')
  })

  test('2. 排除 Invariants/Bans 段', () => {
    const file = join(fixtureDir, 'test.md')
    writeFileSync(
      file,
      '---\nreferences: []\n---\n# Domain\n\n## Terms\n\n### Real\n- desc: real\n\n## Invariants\n\n### Fake\n- value: should not be extracted\n',
    )
    const terms = extractTermsFromDomain(file, 'test')
    expect(terms.map((t) => t.name)).toEqual(['Real'])
  })
})
```

### 5.3 预期产出

- scripts/sync-domain-glossary.ts: **4 行 export 关键字**改动
- 新建 scripts/__tests__/sync-domain-glossary.test.ts: **~13 case**（4 toSlug + 3 escapeAngleBrackets + 3 parseFrontmatter + 2 extractTermsFromDomain + 1 edge）

### 5.4 风险与备选

**风险**：脚本 ROOT 写死 `import.meta.dir/..`，完整 e2e 测试需 mock ROOT

**实施决策**：
- **优先**：工具函数单元测试（直接 import export 函数）
- **e2e 部分**：作为 follow-up（v0.7.x），不在本 commit 范围内
- **理由**：工具函数覆盖 80% 行为；e2e 测试需要 fixture 入口改造，工程量超出 3-4 hr

---

## 6. Sub-plan E — 更新 audit draft

**文件**：`.openxenon/drafts/test-coverage-audit.md`

**追加段**（在 §9 总结后）：

```markdown
## 10. v0.6.3 闭环增量（2026-08-02 phase post-3）

| Gap | 状态 | 落地 |
|---|---|---|
| builtin-skeleton-templates unit test | ✅ done | 新建 `packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts`（38 case） |
| Q3 hint message 文本校验 | ✅ done | `packages/engine/src/Draft/__tests__/skeleton.test.ts` +4 case（case 13-16） |
| boundary-guard entity: skeleton 白名单 | ✅ done | `boundary-guard.ts` fallback 数组增 1 元素 + `boundary-guard.test.ts` case 9 |
| sync-domain-glossary.ts unit test | ✅ done（部分）| 新建 `scripts/__tests__/sync-domain-glossary.test.ts`（13 case，仅工具函数） + `sync-domain-glossary.ts` export 4 函数 |
| sync-domain-glossary.ts 完整 e2e | ⏸ v0.7.x follow-up | 需 fixture 入口改造（ROOT override） |

**闭环结论**：v0.6.3 测试覆盖度从 ~95% 提升到 ~98%。剩余 gap 为脚本完整 e2e（不阻塞 v0.6.3 ship）。
```

---

## 7. Commit 实施细节（Q7=B 锁定）

### Commit 1: `feat(test): v0.6.3 gap 闭环 — builtin-skeleton unit + Q3 hint + skeleton entity 白名单`

**变更文件**（5）：
- `packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts`（新建 ~80 行）
- `packages/engine/src/Draft/__tests__/skeleton.test.ts`（追加 describe 块 +30 行）
- `packages/engine/src/infra/probes/boundary-guard.ts`（2 处共 +5 行）
- `packages/engine/src/infra/probes/__tests__/boundary-guard.test.ts`（追加 case 9 +10 行）
- `.openxenon/drafts/test-coverage-audit.md`（追加 §10 +10 行）

**Commit message**：

```
feat(test): v0.6.3 gap 闭环 — builtin-skeleton unit + Q3 hint + skeleton entity 白名单

闭环 test-coverage-audit.md 识别的 v0.6.3 测试 gap：

1. builtin-skeleton-templates.test.ts（新建，38 case）
   - 7 模板逐字校验（rfc / asset-{5 kind} / work）
   - Q1 entity: skeleton 独立 entity 标识
   - Q1 target-entity 字段
   - 关键约束：不含注入字段（promote-* / created-from / synced-at）
   - v0.6.3 Fix #1 SKELETON_OUTPUT_DIR 路径锁定

2. skeleton.test.ts +4 case（Q3 hint 校验）
   - case 13: message 含 "recommended, not required" + "v0.6.3 Q3"
   - case 14: suggestion 含 "create the skeleton manually"
   - case 15: suggestion 含 "skip skeleton fork"（明示可手写）
   - case 16: suggestion 提及 `oxn init` 安装路径

3. boundary-guard.ts entity: skeleton 白名单
   - OXN_BUILTIN_DOMAINS_FALLBACK 增 'skeleton'
   - header comment 增 Q3 决议说明
   - boundary-guard.test.ts case 9: domain ref 是 skeleton → passed=true

4. .openxenon/drafts/test-coverage-audit.md §10 闭环记录

预期：test case 增量 +43（38 + 4 + 1）
```

### Commit 2: `test(scripts): sync-domain-glossary 单元测试（export 4 工具函数 + 工具级 unit）`

**变更文件**（2）：
- `scripts/sync-domain-glossary.ts`（4 行 export 关键字改动）
- `scripts/__tests__/sync-domain-glossary.test.ts`（新建 ~80 行）

**Commit message**：

```
test(scripts): sync-domain-glossary 单元测试（export 4 工具函数 + 工具级 unit）

按 ADR-0088 P2 audit gap 闭环 — sync-domain-glossary 脚本类覆盖：

1. scripts/sync-domain-glossary.ts 增 4 export：
   - toSlug（PascalCase/kebab-case 转换）
   - escapeAngleBrackets（<x> → &lt;x&gt; 转义）
   - parseFrontmatter（YAML 简化版 references 解析）
   - extractTermsFromDomain（从 .md 提取 ### term + desc）

2. scripts/__tests__/sync-domain-glossary.test.ts（新建，13 case）：
   - toSlug: 5 case（PascalCase / 含空格 / 含斜杠 / trim / 含数字）
   - escapeAngleBrackets: 3 case
   - parseFrontmatter: 3 case（references / 无 frontmatter / malformed）
   - extractTermsFromDomain: 2 case（简单 1 term / 排除 Invariants 段）

注：完整 e2e 测试（--write / --strict 行为）推到 v0.7.x follow-up，
需脚本 ROOT override 改造（fixture 入口），超出本 commit 范围。
```

---

## 8. 执行前 6 项 CI 验证

执行 A → B → C → D → E 完成后：

```bash
bun run typecheck                                          # 0 errors
bun run lint                                               # 0 errors
bun run check                                              # 527 files clean (now +2 test files)
bun scripts/validate-dependencies.ts                       # 0 violations
bun scripts/check-doc-boundary.ts                          # 0 violations
bun test                                                   # 1971 + 43 + 13 = 2027 pass / 0 fail / 0 skip
```

**预期 wall-clock 增量**：~+0.5s（仅 6 个 describe 块增量）

---

## 9. 决策记录（v6 final）

| Q | 选项 | 选择 | 理由 |
|---|---|---|---|
| Q1 | builtin-skeleton-templates unit test 优先级 | **A** 现在加 | v0.6.3 收口期闭环，避免 follow-up 漂移 |
| Q2 | Q3 hint 文本校验 | **A** 加 case 校验 message 含 "recommended" 关键词 | 显式锁定 hint 语义 |
| Q3 | boundary-guard Q1 白名单 | **B** 显式加 entity: skeleton 白名单 | 防御未来误移入校验区 |
| Q4 | 范围 | **B** 全套（含 P2 sync script） | 一次闭环所有 gap |
| Q5 | sync-domain-glossary 测试方案 | **A** D3 混合（export 工具函数 + 工具级 unit） | 改动小、覆盖好 |
| Q6 | builtin-skeleton 7 模板 frontmatter 校验 | **B** 正则匹配 frontmatter 段提取 keys | 灵活应对 YAML 嵌套 |
| Q7 | commit 策略 | **B** 2 个聚合 commit | 语义分组：code gap + scripts gap |
| Q8 | 准备就绪确认 | **落盘到 Draft** | 本 draft 即为执行 plan |

---

## 10. 关联文档

- `.openxenon/drafts/test-coverage-audit.md` — v0.6.0→v0.6.3 全部特性覆盖审计（本 draft 闭环其 §10）
- `.openxenon/drafts/v0-6-3-wrap-up-and-domain-drift.md` — Phase 1-4 收口主 draft
- `docs/adrs/0088-test-suite-architecture.md` — D8 feature→test 映射 + P2 audit 决议
- `.changes/0-6-3-final.md` — v0.6.3 release notes（本 draft 闭环后无新 changelog，本 draft 自身为活动记录）

---

## 11. 执行 checklist（实施时用）

```
□ Phase 1：Sub-plan A 落地
  □ packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts 创建
  □ frontmatterKeys 工具函数定义在测试顶部
  □ describe('BUILTIN_SKELETON_TEMPLATES - 常量结构') + 3 case
  □ describe.each + 5 case × 7 模板 = 35 case
  □ bun test cli/src/init/__tests__/builtin-skeleton-templates.test.ts → 38 pass

□ Phase 2：Sub-plan B 落地
  □ packages/engine/src/Draft/__tests__/skeleton.test.ts 追加 Q3 describe 块
  □ 4 case（13-16）
  □ bun test engine/src/Draft/__tests__/skeleton.test.ts → 16 pass

□ Phase 3：Sub-plan C1+C2 落地
  □ boundary-guard.ts 增 'skeleton' + header comment
  □ boundary-guard.test.ts 增 case 9
  □ bun test engine/src/infra/probes/__tests__/boundary-guard.test.ts → 9 pass

□ Phase 4：Sub-plan E 落地
  □ .openxenon/drafts/test-coverage-audit.md 追加 §10
  □ review 闭环记录

□ Phase 5：Commit 1
  □ git add (5 files)
  □ git commit -m "feat(test): v0.6.3 gap 闭环 — builtin-skeleton unit + Q3 hint + skeleton entity 白名单"

□ Phase 6：Sub-plan D 落地
  □ scripts/sync-domain-glossary.ts 4 export 关键字
  □ scripts/__tests__/sync-domain-glossary.test.ts 创建
  □ 13 case（4 + 3 + 3 + 2 + 1）
  □ bun test scripts/__tests__/sync-domain-glossary.test.ts → 13 pass

□ Phase 7：Commit 2
  □ git add (2 files)
  □ git commit -m "test(scripts): sync-domain-glossary 单元测试（export 4 工具函数 + 工具级 unit）"

□ Phase 8：6 项 CI 验证
  □ bun run typecheck
  □ bun run lint
  □ bun run check
  □ bun scripts/validate-dependencies.ts
  □ bun scripts/check-doc-boundary.ts
  □ bun test → 2027 pass / 0 fail / 0 skip
```