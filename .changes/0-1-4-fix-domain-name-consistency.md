---
version: 0.1.4
slug: fix-domain-name-consistency
date: 2026-06-11
---

# 修复 Domain 名称一致性校验缺失(v1.1)

## 背景

`assertNameFileConsistent` 函数 (`src/cli/domain.ts:357`) 在 v1.0.2 已实现 NAME_FILE_MISMATCH 防御,
但**全代码库仅 1 个调用点** (`oxn domain validate`)。这导致以下场景静默通过:

| 场景 | 现状 | 后果 |
|---|---|---|
| `oxn domain list` | dir 扫描 + 直接信任 AST `name` | name ↔ file 不一致被静默接受 |
| `parseDomainSlim`(索引构建) | 不检查 NAME_FILE_MISMATCH | `.openxenon/.cache/domains.json` 索引可与 AST 漂移 |
| `oxn domain create` | 写入后不回查 AST name | 模板插值错误无法早发现 |
| `oxn blueprint validate` | CLI 缺硬阻断 | 仅 `parseBlueprintSlim` 软检测兜底 |
| `oxn work validate` | 完全缺 | work.oxn `work "X"` 与目录名 `<w>` 可任意不一致 |
| `oxn proof create` | 完全缺 | proof.oxn `proof "X"` 与目录名 `<p>` 可任意不一致 |

## 改动清单

### 1. 上移 `toKebab`/`assertNameFileConsistent` 到 L0-Contract

- 新建 `src/kernel/contracts/name-canonical.ts` (L0-Contract)
- 扩展 `entityType`: `'domain' | 'blueprint' | 'work' | 'proof'`
- 新增 `assertDirNameConsistent`(目录式布局,work/proof 使用)
- 删 `src/cli/domain.ts:330-383` 本地实现,改 import
- `src/oxn-dsl/compiler/blueprint-index-builder.ts:78-84` 的本地 `toKebab` 保留(暂不动,以减少 diff;后续 PR 可收敛)

依赖图:L1-OXN-DSL (`parseDomainSlim`) 现在可合法 import L0-Contract,无需再走 L3 CLI。

### 2. `parseDomainSlim` 软检测 (改动 1)

对齐 `src/oxn-dsl/compiler/blueprint-index-builder.ts:194-199` 模式。
不一致 → push 到 `errors[]`,`status='invalid'`,不阻断索引构建。
domain list / domain index 自动过滤 `status='ok'`。

### 3. `oxn domain list` 改走索引 (改动 2)

- 优先读 `.openxenon/.cache/domains.json`,过滤 `status='ok'` 的条目
- 无索引时降级为 dir 扫描 + `parseDomainSlim`(也应用软检测)
- 输出含 `invalidCount` + `hint`(提示工程师跑 `oxn domain validate`)

### 4. `oxn domain create` 写入后回查 (改动 3)

`writeFileSync` 后立即调 `assertNameFileConsistent(name, outPath, 'domain')`。
模板字符串由 name 插值生成,正常情况下两者一致;此处作为防御性检查,
防止未来模板或 path 逻辑漂移导致写入"name=X"的 .oxn 但落盘到 stem=Y。

### 5. `oxn blueprint validate` 补硬阻断 (改动 4)

- `blueprintAstToIr` 签名扩展 `name: string`
- validate 后立即调 `assertNameFileConsistent(ir.name, bpPath, 'blueprint')`
- 与 `parseBlueprintSlim` 软检测形成双层防御

### 6. `oxn work validate` 补目录名一致性 (改动 5)

parse `work.oxn` 后立即调 `assertDirNameConsistent(work.name, workDir, 'work')`。
work 的目录式布局(`works/<w>/work.oxn`)需要新 API。

### 7. `oxn proof create` 补目录名一致性 (改动 6)

写入 proof.oxn 后调 `assertDirNameConsistent(name, dir, 'proof')`。
proof 没有独立 validate 子命令,在 create 阶段硬阻断。

## 测试

- 新增 `src/kernel/contracts/__tests__/name-canonical.test.ts` (21 个用例,覆盖 L0-Contract 物理归位约束)
- 新增 `src/oxn-dsl/compiler/__tests__/domain-index-builder.test.ts` 软检测用例 (3 个)
- 修复 `src/cli/__tests__/domain-canonicalization.test.ts` 旧 import 路径 (10 个用例)
- 修复 `src/cli/__tests__/work-context-diagnostics-e2e.test.ts` + `work-run-diagnostics-e2e.test.ts` 中故意构造的"name↔file 不一致"fixture,改为合法 kebab-case (反映新硬约束)

## 测试结果

| 阶段 | Baseline | 修复后 |
|---|---|---|
| typecheck | ✓ | ✓ |
| lint | 2 pre-existing errors | 2 pre-existing(未引入新) |
| dependencies | 6 pre-existing violations | 6 pre-existing(未引入新) |
| bun test | 984 pass / 0 fail | **1008 pass / 0 fail** |

## 风险与回滚

- **风险 1**:`oxn domain validate` 现在对 `domain "X"` 与 `X.oxn` toKebab 不一致的 .oxn 直接抛 IAPError。
  已有项目若有 legacy 文件可能受影响,但修复建议明确(rename or change name)。
- **风险 2**:`oxn domain list` 改为走索引,索引缺失时降级扫描,行为向后兼容。
- **回滚**:work `fix-domain-name-consistency` 已 unlock,所有改动在 git working tree,可 `git restore .` 一键回滚。

## 后续 PR

- `src/oxn-dsl/compiler/blueprint-index-builder.ts:78-84` 的本地 `toKebab` 可收敛到 `kernel/contracts/name-canonical.ts`(减少 toKebab 副本)
- toKebab 冲突扫描(namespace 唯一性)留待后续 PR(v1.2+)