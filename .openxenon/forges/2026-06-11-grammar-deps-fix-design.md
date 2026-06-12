# Grammar 修复：支持 `deps = ["t1", "t2"]` 语法

> **状态**：Draft v0.1 — 设计评审稿，**未实现**。本文档**仅含 grammar 改动 + 配套测试与 examples 迁移**，不含运行时 merger / CLI 改动。
>
> **目标读者**：架构师 + OXN 维护者；**先评审，再动手**。
>
> **前置文档**：
> - 本 work 起手日志：[`2026-06-11-pre-release-test-coverage-work-journal.md`](./2026-06-11-pre-release-test-coverage-work-journal.md) §2.1 软缺口 A
> - 根因诊断（本对话上下文）：grammar 切到块式语法时 `deps` 字段清理不彻底 + parser disambiguation 引导关键字缺失

## 目录

- [1. 背景与现状](#1-背景与现状)
- [2. 目标与非目标](#2-目标与非目标)
- [3. grammar 修改方案](#3-grammar-修改方案)
- [4. 配套改动清单](#4-配套改动清单)
- [5. 测试矩阵](#5-测试矩阵)
- [6. 风险与缓解](#6-风险与缓解)
- [7. 实施 checklist](#7-实施-checklist)
- [8. 验收标准](#8-验收标准)
- [9. 待评审项](#9-待评审项)
- [10. 决策记录（ADR）](#10-决策记录adr)

---

## 1. 背景与现状

### 1.1 现象

实测 4 种 `deps` 写法在 `oxn work validate` 阶段全部 fail（详见前置日志 §2.1）：

| 写法 | 来源 | parser 行为 |
|---|---|---|
| `deps = [];` | `examples/works/fix-issue`、`develop-member`、`onboarding` 写法 | ❌ `Expecting ';' but found '}'` |
| `deps [];` | `.openxenon/works/poc-git-isolation` 真实 work 写法 | ❌ `Expecting '}' but found 'deps'` |
| `deps ["t1"];` | （本 work 尝试） | ❌ 同上 |
| 裸 `["t1"]` | grammar 字面期望 | ⚠️ parse 通过但**无 deps 关键字**消歧义，与 `constraints = [...]` 数组形态冲突 |

### 1.2 根因（语法层）

`src/oxl/langium/oxn.langium:242-251`：

```antlr
TaskDeclaration:
    'task' name=STRING '{'
        ('domain' domain=STRING)?        ← 关键字 'domain' 引导
        ('blueprint' blueprint=STRING)?  ← 关键字 'blueprint' 引导
        (parts+=TaskPartDecl)*           ← 关键字 'part' (子规则首 token) 引导
        (deps=TaskDeps)?                 ← ⚠️ 唯一无引导关键字字段
    '}';

TaskDeps:
    '[' (deps+=STRING (',' deps+=STRING)*)? ']';
```

**Langium parser disambiguation 模型**：

- 可选子句 `(X)?` 判定依赖**首 token** 能否唯一匹配
- 4 个可选字段中，3 个有显式关键字（`domain` / `blueprint` / `part`），唯独 `deps` 子规则首 token 是 `'['`（punct）
- parser 在 `task "t2" {` 后**看到 `deps`（ID terminal `/[_a-zA-Z][\w-]*/`）时**，无法判断是字段 4 关键字还是 blueprint/domain 残段 → 报错
- 裸 `["x"]` 形态**能 parse**（跳过 1/2/3 字段直接看 `[`），但**消歧义能力差**——与 `constraints = [...]` 数组无视觉区分

### 1.3 历史推测

`CHANGELOG.md:30-32` v0.0.x → v0.1-final 切到块式语法时，**`deps` 写法清理不彻底**：

- grammar：`TaskDeps` 留作"裸数组字面量"（v0.1+ 风格）
- examples：仍用 `deps = [...]`（v0.0.x 风格）
- 真实 work：3 种写法混用（`poc-git-isolation` 用 `deps []`，老 work 可能用 `deps = []`）

---

## 2. 目标与非目标

### 2.1 目标（In-Scope）

1. **grammar 修一处**：让 `deps = ["t1", "t2"]` 成为**唯一**合法且推荐的写法
2. **破坏性迁移**：所有 examples + 真实 work 必须更新为新写法
3. **回归保护**：`examples-parsing.test.ts` 从"文件存在"升级为"parse 通过"
4. **新测覆盖**：补 `task.deps` 端到端测（多种合法 + 非法形态）
5. **零架构违规**：`bun scripts/validate-dependencies.ts` 0 error
6. **CI 全绿**：所有 414 + 46（pre-release 补测后）test 通过

### 2.2 非目标（Out-of-Scope）

| 不做 | 原因 |
|---|---|
| ❌ 改 `TaskDeps` 为对象字面量 `deps { "t1" }` | 完全破坏向后兼容 |
| ❌ 支持 4 种写法并存（多解析） | 维护成本高、未来再漂移 |
| ❌ 在 merger 加 normalize 翻译层 | 治标不治本，grammar 是 SSOT |
| ❌ 改 Langium 版本或 parser 框架 | 范围爆炸 |
| ❌ 顺便修 merger 软缺口 B | 独立 issue |

---

## 3. grammar 修改方案

### 3.1 改法：选 B（`deps` 关键字 + `=` + 数组）

```antlr
// 修改前（oxn.langium:247）
(deps=TaskDeps)?

// 修改后
('deps' '=' deps=TaskDeps)?

// TaskDeps 子规则不变
TaskDeps:
    '[' (deps+=STRING (',' deps+=STRING)*)? ']';
```

### 3.2 改法选择（4 选 1 对比）

| 方案 | grammar 改动 | examples 改动 | 工作量 | 风险 |
|---|---|---|---|---|
| **A. 裸数组（现状）** | 0 | 全部要改（删 `deps =` 改 `deps` 关键字 + 裸数组） | 1 小时 | 易再漂移 |
| **B. `deps = [...]`（推荐）** | 加 `'deps' '='` 关键字 | 0（已是对应写法） | **0** | **最安全** |
| **C. `deps [...]` 无等号** | 加 `'deps'` 关键字（无 `=`） | 全部要改（加 `deps ` 删 `= `） | 1 小时 | 与 `fix-issue` 现存写法不匹配 |
| **D. 对象字面量 `deps { "t1" }`** | 改 `TaskDeps` 整体 | 全部要改 | 半天 | 破坏向后兼容 |

**选 B 的 3 个理由**：

1. **examples 零改动** — `fix-issue` / `develop-member` / `onboarding` 已经是 `deps = [...]` 写法，只需 grammar 改一处即可让 examples 合法
2. **跨示例一致** — `WorkContext` 的 `loop_policy { max_iterations = N; }` 和 `WorkContext` 的 `goal = "...";` 都用 `=` 号，**`deps = [...]` 与上下文一致**
3. **消歧义最简** — 关键字 `'deps'` 引导 parser 立即进入字段 4

### 3.3 grammar 改后语义

合法形态（**仅**这一种）：

```oxn
task "t2-catalog-ssot" {
  blueprint "release-cut"
  deps = ["t1-frozen-immutable"];     ← 唯一合法写法
  part "gen-changelog" { ... }
}
```

非法形态（修后全部拒绝）：

```oxn
task "t2" {
  blueprint "x"
  deps ["t1"];           ← 缺 '=' 号
}

task "t2" {
  blueprint "x"
  ["t1"];                ← 裸数组（无 'deps' 关键字）
}

task "t2" {
  blueprint "x"
  deps = [t1, t2];       ← 数组元素必须 STRING（带引号）
}
```

---

## 4. 配套改动清单

### 4.1 必改（4 项）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `src/oxl/langium/oxn.langium` | `TaskDeclaration` 第 247 行 `(deps=TaskDeps)?` → `('deps' '=' deps=TaskDeps)?` |
| 2 | `.openxenon/works/poc-git-isolation/work.oxn` | 3 处 `deps [...]` → `deps = [...]`（与 examples 对齐） |
| 3 | `src/oxl/__tests__/examples-parsing.test.ts` | 删除 `existsSync` 测，替换为 `await parser.parse(content)` 全 PASS |
| 4 | `src/oxl/__tests__/task-deps.test.ts`（**新增**） | task.deps 端到端测：5 种合法 + 5 种非法 |

### 4.2 应改（1 项）

| # | 文件 | 改动 |
|---|---|---|
| 5 | `src/oxl/contracts/types.ts` | 同步更新 `TaskDeclaration.deps` 字段类型注释（与 grammar 一致） |

### 4.3 暂不改（1 项，留 backlog）

| # | 文件 | 原因 |
|---|---|---|
| 6 | merger 的 regex 注释误匹配 | 软缺口 B，独立 issue（详见前置日志 §2.2） |

### 4.4 详细改动

#### 4.4.1 `oxn.langium`（核心改动）

**before**（第 247 行）：
```antlr
TaskDeclaration:
    'task' name=STRING '{'
        ('domain' domain=STRING)?
        ('blueprint' blueprint=STRING)?
        (parts+=TaskPartDecl)*
        (deps=TaskDeps)?
    '}';
```

**after**：
```antlr
TaskDeclaration:
    'task' name=STRING '{'
        ('domain' domain=STRING)?
        ('blueprint' blueprint=STRING)?
        (parts+=TaskPartDecl)*
        ('deps' '=' deps=TaskDeps)?    ← 改这一行
    '}';
```

**注**：`TaskDeps` 子规则不变，仍是 `'[' ... ']'`。

#### 4.4.2 `poc-git-isolation/work.oxn`（真实 work 迁移）

**before**（第 35-55 行）：
```oxn
task "git-prepare" {
  blueprint "git-workflow"
  deps []                              ← 写法 1
  part "slot-name" { ... }
}
task "do-refactor" {
  blueprint "refactor-safe"
  deps ["git-prepare"]                 ← 写法 2
  part "slot-name" { ... }
}
task "git-finalize" {
  blueprint "git-workflow"
  deps ["do-refactor"]                 ← 写法 2
  part "slot-name" { ... }
}
```

**after**：
```oxn
task "git-prepare" {
  blueprint "git-workflow"
  deps = []                            ← 统一为 deps = [...]
  part "slot-name" { ... }
}
task "do-refactor" {
  blueprint "refactor-safe"
  deps = ["git-prepare"]
  part "slot-name" { ... }
}
task "git-finalize" {
  blueprint "git-workflow"
  deps = ["do-refactor"]
  part "slot-name" { ... }
}
```

#### 4.4.3 `examples-parsing.test.ts`（升级为 parse 测）

**before**（`src/oxl/__tests__/examples-parsing.test.ts:1-30`）：
```ts
import { beforeAll, describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import { existsSync } from 'fs'
import { join } from 'path'

const EXAMPLES_DIR = join(__dirname, '../examples')

describe('OXL Examples', () => {
  test('probe-example.oxn 文件存在', () => {
    expect(existsSync(join(EXAMPLES_DIR, 'probe-example.oxn'))).toBe(true)
  })
  // ...3 个同类 smoke test
})
```

**after**（升级为真 parse 测）：
```ts
import { describe, expect, test } from 'bun:test'
import { Cancellation, DocumentState, URI } from 'langium'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { createOxnServices } from '../langium/oxn-services'

const EXAMPLES_DIR = join(__dirname, '../examples')

async function parseOxlFile(path: string): Promise<{ errors: string[]; lexerErrors: string[] }> {
  const content = readFileSync(path, 'utf-8')
  const services = createOxnServices()
  const parser = services.Oxn.parser.LangiumParser
  const r = await parser.parse(content)
  return {
    errors: r.parserErrors.map((e) => e.message),
    lexerErrors: r.lexerErrors.map((e) => e.message),
  }
}

describe('OXL Examples - 全部能 parse', () => {
  const files = readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.oxn'))
    .map((f) => join(EXAMPLES_DIR, f))

  test.each(files)('%s 存在且可 parse', async (path) => {
    const r = await parseOxlFile(path)
    expect([...r.errors, ...r.lexerErrors].join('\n')).toBe('')
  })
})
```

**注**：原 4 个 smoke test 完全删除（被 `test.each` 替代）。

#### 4.4.4 `task-deps.test.ts`（新增测）

**新增文件** `src/oxl/__tests__/task-deps.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { URI } from 'langium'
import { createOxnServices } from '../langium/oxn-services'

const services = createOxnServices()
const parser = services.Oxn.parser.LangiumParser

async function parse(content: string) {
  const r = await parser.parse(content)
  return {
    parserErrors: r.parserErrors.map((e) => e.message),
    lexerErrors: r.lexerErrors.map((e) => e.message),
  }
}

describe('TaskDeclaration.deps 语法契约', () => {
  // ──── 合法形态（5 种）────
  test('合法: deps = []（空数组）', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps = [] } }`)
    expect([...r.parserErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a"]（单元素）', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps = ["a"] } }`)
    expect([...r.parserErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a", "b", "c"]（多元素）', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps = ["a", "b", "c"] } }`)
    expect([...r.parserErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a"]; 后接 part 块', async () => {
    const r = await parse(`
      work "x" {
        task "t" {
          blueprint "b"
          deps = ["a"]
          part "p" { skill_context = "x" }
        }
      }
    `)
    expect([...r.parserErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a"]; 后再写 deps = ["b"] 应被拒绝（重复）', async () => {
    // 注：grammar (deps=TaskDeps)? 是单值非数组，重复定义应在 validator 报错
    // 此测验证 parser 阶段只接受一次
    const r = await parse(`
      work "x" {
        task "t" {
          blueprint "b"
          deps = ["a"]
          deps = ["b"]
        }
      }
    `)
    // 期望第二次 deps 出现时 parser 报错（因为 part/deps 都不期待第二次）
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })

  // ──── 非法形态（5 种，必须报错）────
  test('非法: 缺 "deps" 关键字（裸数组）', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; ["a"] } }`)
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })

  test('非法: 缺 "=" 号（deps [...]）', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps ["a"] } }`)
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })

  test('非法: deps = [...] 但数组元素无引号', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps = [a, b] } }`)
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })

  test('非法: 用 "=" 但缺 "deps" 关键字', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; = ["a"] } }`)
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })

  test('非法: deps 后接非 [ 非 = 字符', async () => {
    const r = await parse(`work "x" { task "t" { blueprint "b"; deps = "a" } }`)
    expect(r.parserErrors.length).toBeGreaterThan(0)
  })
})
```

#### 4.4.5 `contracts/types.ts`（注释同步）

**before**：第 N 行（TaskDeclaration 类型注释）：
```ts
deps?: TaskDeps | undefined
```

**after**：
```ts
/** v0.0.28+: 必带 'deps' 关键字与 '=' 号，例 `deps = ["t1", "t2"]` */
deps?: TaskDeps | undefined
```

---

## 5. 测试矩阵

### 5.1 新增 / 改动 / 保留

| 测试文件 | 改动 | 测数变化 |
|---|---|---|
| `src/oxl/__tests__/examples-parsing.test.ts` | smoke → 真 parse | 4 → N（N=examples/ 下 .oxn 文件数） |
| `src/oxl/__tests__/task-deps.test.ts`（新增） | 5 合法 + 5 非法 | 0 → 10 |
| `src/oxl/__tests__/domain-syntax.test.ts` | 0 改动 | 现状保持 |
| `src/work/__tests__/per-work-domains-merger.test.ts` | 0 改动（merger 不走 deps 路径） | 现状保持 |
| `src/cli/__tests__/work-*.test.ts` | 0 改动（CLI 不感知 grammar 内部） | 现状保持 |

### 5.2 关键回归保护点

| 验证 | 命令 | 期望 |
|---|---|---|
| grammar 生成成功 | `bun run langium:generate` | 0 error，generated/ast.ts 重新生成 |
| examples parse 全通 | `bun test src/oxl/__tests__/examples-parsing.test.ts` | N 个 testcase 全绿 |
| task.deps 端到端 | `bun test src/oxl/__tests__/task-deps.test.ts` | 10 个 testcase 全绿 |
| 真实 work 仍能 validate | `bun test src/cli/__tests__/work-full-lifecycle-e2e.test.ts` | 全绿（poc-git-isolation 迁移后） |
| poc-git-isolation 自身 | `oxn work validate poc-git-isolation --json` | ok=true（之前是 fail） |
| 架构守卫 | `bun scripts/validate-dependencies.ts` | 0 违规 |
| Lint / Typecheck | `bun run lint && bun run typecheck` | 0 error |
| 全量测 | `bun test` | 460 + 11（新增）= 471 个 testcase 全绿 |

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 改 grammar 后某老 work 写法被拒 | 高 | CI 红 | `git grep -l "deps \[\|deps =" .openxenon/works/` 一次扫，列出所有 work.oxn 用法；逐个迁 |
| 改 grammar 后 `oxn work` 状态机对 deps 解析失败 | 低 | 状态机不能跑 | lock 之前 migrate；migration 工具写进 `oxn work migrate` |
| examples 文件改动触发 examples-parsing 测全 fail | 中 | 暴露更多 drift | 先 fix grammar 再跑测，**不要**先改 examples（顺序很重要） |
| Langium generated/ 不一致 | 低 | typecheck 报类型错 | `bun run langium:generate` 后立即 typecheck |
| 第三方 work 文件（仓库外）跑不过 | 中 | 跨项目兼容 | ADR-005（§10）记录破坏性变更；release notes 写明 |
| merger 的 regex 仍误匹配（独立问题） | — | — | 不在本 PR 范围，留 backlog |
| 改 grammar 触发其他 v0.0.x 旧规漂移 | 低 | 链式 fail | `examples-parsing.test.ts` 升级后**会**全暴露，是好事 |

---

## 7. 实施 checklist

### 7.1 准备阶段
- [ ] 读 `src/oxl/langium/oxn.langium` 第 242-251 行确认当前形态
- [ ] 读 `src/oxl/__tests__/domain-syntax.test.ts` 了解现有 test 风格
- [ ] 跑 `bun run langium:generate` 确认基线生成成功
- [ ] 跑 `bun test` 确认基线 414 个 testcase 全绿

### 7.2 实施阶段（5 步，按顺序）

#### Step 1：修 grammar
- [ ] 改 `src/oxl/langium/oxn.langium:247`（详见 §4.4.1）
- [ ] 跑 `bun run langium:generate` 重新生成
- [ ] 跑 `bun run typecheck` 0 error

#### Step 2：迁移真实 work
- [ ] 改 `.openxenon/works/poc-git-isolation/work.oxn`（详见 §4.4.2）
- [ ] 跑 `oxn work validate poc-git-isolation --json` 期望 ok=true

#### Step 3：升级 examples-parsing 测
- [ ] 改 `src/oxl/__tests__/examples-parsing.test.ts`（详见 §4.4.3）
- [ ] 跑 `bun test src/oxl/__tests__/examples-parsing.test.ts` 期望全绿

#### Step 4：新增 task-deps 测
- [ ] 新建 `src/oxl/__tests__/task-deps.test.ts`（详见 §4.4.4）
- [ ] 跑 `bun test src/oxl/__tests__/task-deps.test.ts` 期望 10 个 testcase 全绿

#### Step 5：同步 contracts/types.ts 注释
- [ ] 改 `src/oxl/contracts/types.ts` TaskDeclaration.deps 注释（详见 §4.4.5）

### 7.3 验证阶段
- [ ] `bun run typecheck` 0 error
- [ ] `bun run lint` 0 error
- [ ] `bun scripts/validate-dependencies.ts` 0 违规
- [ ] `bun test` 460 + 11 = 471 个 testcase 全绿
- [ ] `oxn work validate pre-release-test-coverage-v0-0-27 --json` 现在应**支持** deps 字段
  - **可选项**：用新语法重写本 work 的 work.oxn，验证 5 task 串行 deps 真实生效

### 7.4 提交阶段
- [ ] 6 个 commit（grammar / generated / 真实 work / examples 测 / task-deps 测 / 类型注释）
- [ ] `.changes/0-0-28-grammar-deps-fix.md` 变更日志片段
- [ ] `docs/reference/oxn-dsl.md` § task 块语法示例更新
- [ ] PR 标题：`fix(grammar): task.deps 必带 'deps'=' 关键字，迁移 examples 与真实 work`
- [ ] 标签：`grammar` `L1-OXL` `breaking-change` `regression`

---

## 8. 验收标准

### 8.1 功能性
- [ ] §4.4.4 中 5 种合法 + 5 种非法测全 PASS
- [ ] §4.4.2 中 poc-git-isolation 迁移后能 validate
- [ ] §4.4.3 中所有 examples/ 下 .oxn 文件能 parse
- [ ] 本 work（`pre-release-test-coverage-v0-0-27`）的 work.oxn 可重写为含 `deps = [...]` 语法（可选）

### 8.2 质量性
- [ ] 0 grammar 漂移（grammar = examples = 真实 work = 测）
- [ ] 0 架构违规
- [ ] 0 lint / typecheck error
- [ ] 0 既有测回归

### 8.3 文档性
- [ ] `docs/reference/oxn-dsl.md` § task 块示例更新
- [ ] `.changes/0-0-28-grammar-deps-fix.md` 片段就位
- [ ] 关联前置审计 + 本 work 起手日志 forge 链接

### 8.4 治理性
- [ ] ADR-005（§10）记录破坏性变更
- [ ] lefthook pre-commit / pre-push 全过

---

## 9. 待评审项

> **请架构师 / 维护者回答以下 5 个问题，再开始实施。**

1. **方案选 B 确认？** 改 grammar 加 `'deps' '='` 关键字，放弃裸数组 / 缺等号 / 缺关键字 3 种写法（详见 §3.2）
2. **破坏性变更接受？** 所有真实 work 写法统一为 `deps = [...]`，老 work 文件需迁移（详见 §6 风险）
3. **examples-parsing 升级是本 PR 必要部分？** 还是单独 PR？我建议**合并**——只有 examples 真正 parse 过，grammar 修复才算闭环
4. **migrate 工具需要吗？** 写一个 `oxn work migrate-deps` 帮老 work 迁移；还是手改 1 个 work 不值得
5. **是否同步更新 `docs/reference/oxn-dsl.md`？** 还是只靠 .changes 片段 + 测

---

## 10. 决策记录（ADR）

### ADR-005：task.deps 唯一合法写法为 `deps = ["t1", "t2"]`

**决策**：grammar `(deps=TaskDeps)?` → `('deps' '=' deps=TaskDeps)?`；废弃其他 3 种写法。

**理由**：
- examples 零改动（`fix-issue` / `develop-member` / `onboarding` 已是此写法）
- 关键字 `'deps'` 引导 parser disambiguation
- `=` 号与 `WorkContext` 上下文（`goal = "...";` / `loop_policy { max_iterations = N; }`）一致

**破坏性**：
- `.openxenon/works/poc-git-isolation/work.oxn` 写法 `deps [...]` → `deps = [...]`
- 任何老 work 用 `deps []` / `deps ["x"]` / 裸 `["x"]` 写法的需手动迁移

**替代方案**：
- A. 维持裸数组（grammar 不改）：examples 要全改，易再漂移
- C. `deps [...]` 无等号：与现存 examples 写法不匹配
- D. 对象字面量：破坏向后兼容

**决策者**：架构师 + 维护者

### ADR-006：examples-parsing.test.ts 升级为真 parse 测（合并到本 PR）

**决策**：删除 4 个 `existsSync` smoke test，替换为 `test.each` parse 测。

**理由**：
- 软缺口 A 的根因之一是 examples 从不被 parser 测过
- 只有真测才能拦下 grammar ↔ examples 漂移

**不单独 PR 理由**：
- 单独 PR 难描述价值（"examples 测升级了"）
- 合并到 grammar 修复 PR：闭环（grammar 修了，examples 也能 parse 了）

**决策者**：架构师 + 维护者

---

## 附录 A：相关链接

- 前置 work 起手日志：[`2026-06-11-pre-release-test-coverage-work-journal.md`](./2026-06-11-pre-release-test-coverage-work-journal.md)
- 前置审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)
- PR 设计：[`2026-06-11-v0.0.27-pre-release-test-coverage.md`](./2026-06-11-v0.0.27-pre-release-test-coverage.md)
- 当前 grammar：`src/oxl/langium/oxn.langium:239-251`
- 改动的真实 work：`.openxenon/works/poc-git-isolation/work.oxn:35-55`
- examples 来源：`src/oxl/examples/works/`
- 当前 examples-parsing 测：`src/oxl/__tests__/examples-parsing.test.ts`
- L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)
- AGENTS.md：[`../../AGENTS.md`](../../AGENTS.md)
