# 0.2.0 — Sprint 2 T3: Soft-Gaps 修复 (Grammar A + Merger B)

> 父文档: `.openxenon/forges/2026-06-11-pre-release-test-coverage-work-journal.md` §2.1 + §2.2
> Sprint 2 任务 T3, 修复 2 个软缺口: grammar 多语法兼容 + merger AST 化

## 变更

### 软缺口 A: Grammar 扩展

`src/oxl/langium/oxn.langium` 扩展 `TaskDeps` 与 `TaskDepsField`:

```langium
TaskDeps:
    '[' (deps+=STRING (',' deps+=STRING)*)? ']'    // ["a", "b"]
    | STRING (',' STRING)+                          // "a", "b" (无括号)
    | STRING                                         // "a" (单元素无括号)
;
TaskDepsField:
    'deps' ':' deps=TaskDeps                        // 老兼容
    | 'deps' '=' deps=TaskDeps                      // v0.0.28 后
;

TaskDeclaration:
    'task' name=STRING '{'
        ('domain' domain=STRING)?
        ('blueprint' blueprint=STRING)?
        (parts+=TaskPartDecl)*
        (TaskDepsField)?                              // 改用 TaskDepsField union
    '}';
```

跑 `bun run langium:generate` 自动更新 `src/oxl/generated/{ast,grammar}.ts` 与 `syntaxes/oxn.tmLanguage.json`。

### 软缺口 A 测试更新

`src/oxl/__tests__/task-deps.test.ts` (10 → 13 case):
- 修订: `deps = "a"` 从「非法」改为「合法」（与 T3 目标一致）
- 新增: `deps : []` 老兼容（冒号赋值）
- 新增: `deps = "a", "b"` 多元素无括号
- 新增: `deps : "a", "b", "c"` 老兼容 + 多元素无括号

### 软缺口 B: per-work-domains-merger 改用 Langium AST

`src/work/per-work-domains-merger.ts:extractDomainRefs` 从 regex 改为 Langium AST:

```ts
// 旧（regex）:
const re = /domain\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g

// 新（Langium AST）:
const root = doc.ast  // OXNDocument
const workDecl = root.entities.find(isWorkDeclaration)
return workDecl.domains
  .filter(isDomainRefDecl)
  .map((n) => ({ name: n.name, ref: n.ref ?? null }))
```

**修复 bug**: description 字段中含 `domain "fake"` 字符串不再吞掉第一个真实 domain 声明。

**API 变化** (3 个 sync 调用方受影响):
- `buildPerWorkDomainsIndex` 改 async
- `writePerWorkDomainsIndex` 改 async
- `migrateWorkToV1` 改 async
- 6 个测试 case 改 async + `expect(() => sync()).toThrow()` 改 `expect(promise).rejects.toThrow()`

### 软缺口 B 测试新增

`src/work/__tests__/per-work-domains-merger.test.ts` (24 → 28 case):
- description 字符串含 "domain" 仍正确识别
- 注释中含 "domain" 不被误识别
- 跨多行 domain 声明正确识别
- 内联 domain 声明（无换行）正确识别

### 其它文件改动

- `src/oxl/generator/oxn-generator.ts`: 用 `isTaskDepsField` type guard 提取 deps
- `src/oxl/validator/intent-align-validator.ts`: 同上 + `property` 改 `'name' as const` (TaskDeclaration union 不含 'deps' key)
- `src/oxl/schemas/oxn-assembly.schema.ts`: `deps` 改 `.optional()` 匹配 union 推断
- `src/cli/__tests__/work-migrate-e2e.test.ts`: 修 fixture 顺序 (domain → blueprint 严格 OXL 顺序)
- `src/cli/work.ts:2826` `run` 改 async + 加 await

## 指标

- 测试: 1240 → 1248 (+8: task-deps +3, merger +4, work-migrate fixture 修后不变)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 行为变化: deps 多语法兼容 + domain refs 解析更准确 (description 字符串不再误识别)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| 3 个函数 sync → async 改动破坏 call 端 | 中 | 全部改 async + 测试 + retry=1 |
| 真实 work.oxn 触发 Langium parse error | 中 | 19 个真实 work 全部解析 (smoke test) |
| `property: 'deps'` 在 union 类型不兼容 | 低 | 改 `'name' as const` + 文档已更新 |
| work-migrate-e2e fixture 顺序错 | 低 | fixture 修后 Langium 顺序 (domain 在 blueprint 前) |

Refs: .openxenon/forges/sprints/sprint-2/2026-06-15-soft-gaps-grammar-merger.md
Refs: .openxenon/forges/2026-06-11-pre-release-test-coverage-work-journal.md
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
